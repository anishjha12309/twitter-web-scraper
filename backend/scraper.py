"""
Twitter Web Scraper API
With browser extension cookie sync
"""
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from twikit import Client
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from async_lru import alru_cache
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import os
import json
import uvicorn
import traceback

# Load environment variables from .env file
load_dotenv()

# Initialize Client
client = Client('en-US')

# Get credentials from environment variables (optional now - mainly for local dev)
TWITTER_USERNAME = os.getenv("TWITTER_USERNAME")
TWITTER_EMAIL = os.getenv("TWITTER_EMAIL")
TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD")

# API Key for cookie sync endpoint
COOKIE_SYNC_API_KEY = os.getenv("COOKIE_SYNC_API_KEY")

# Log configuration status on startup
print(f"🔑 Configuration check:")
print(f"   COOKIE_SYNC_API_KEY: {'✅ Set' if COOKIE_SYNC_API_KEY else '⚠️ Not set (required for extension sync)'}")
print(f"   TWITTER_USERNAME: {'✅ Set' if TWITTER_USERNAME else '⚠️ Not set (optional)'}")

# Flag to track if we're currently re-authenticating (prevent infinite loops)
_is_reauthenticating = False


async def re_authenticate():
    """
    Re-authenticate by reloading cookies from file.
    In the browser extension approach, cookies are pushed externally.
    """
    global _is_reauthenticating
    
    if _is_reauthenticating:
        print("⚠️ Already re-authenticating, skipping...")
        return False
    
    _is_reauthenticating = True
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        cookies_path = os.path.join(script_dir, 'cookies.json')
        
        if os.path.exists(cookies_path):
            client.load_cookies(cookies_path)
            print("🔄 Cookies reloaded from file")
            return True
        else:
            print("❌ No cookies.json found. Use the browser extension to sync cookies.")
            return False
        
    except Exception as e:
        print(f"❌ Re-authentication failed: {e}")
        print(f"📋 Traceback:\n{traceback.format_exc()}")
        return False
    finally:
        _is_reauthenticating = False


def is_auth_error(error: Exception) -> bool:
    """Check if an error is related to authentication/cookies"""
    error_msg = str(error).lower()
    error_type = type(error).__name__.lower()
    
    # Check both error message and exception type name
    auth_keywords = ["unauthorized", "401", "forbidden", "403", "not logged in", "login", "auth", "cookie"]
    
    # Check in error message
    if any(keyword in error_msg for keyword in auth_keywords):
        return True
    
    # Check in exception type name (e.g., twikit.errors.Unauthorized)
    if any(keyword in error_type for keyword in auth_keywords):
        return True
    
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cookies_path = os.path.join(script_dir, 'cookies.json')

    try:
        if os.path.exists(cookies_path):
            client.load_cookies(cookies_path)
            print(f"✅ Cookies loaded successfully from: {cookies_path}")
        elif all([TWITTER_USERNAME, TWITTER_PASSWORD]):
            print("📂 No cookies.json found, attempting login with credentials...")
            await re_authenticate()
        else:
            print(f"⚠️ Warning: No cookies.json and no credentials in environment variables")
    except Exception as e:
        print(f"❌ Error loading cookies: {e}")
        if all([TWITTER_USERNAME, TWITTER_PASSWORD]):
            print("🔄 Attempting login with credentials...")
            await re_authenticate()
    yield


# Initialize Limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize App with Lifespan
app = FastAPI(title="Twitter Scraper API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- API CALL WRAPPERS WITH AUTO-RETRY ---
async def search_with_retry(query: str, product: str, count: int):
    """Search tweets with automatic re-authentication on failure"""
    try:
        return await client.search_tweet(query, product=product, count=count)
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"🚨 Search error caught: [{error_type}] {error_msg}")
        print(f"   is_auth_error result: {is_auth_error(e)}")
        
        if is_auth_error(e):
            print(f"🔐 Auth error detected, attempting re-authentication...")
            if await re_authenticate():
                print("✅ Re-auth successful, retrying search...")
                return await client.search_tweet(query, product=product, count=count)
            else:
                print("❌ Re-auth failed, raising original error")
        raise


async def get_user_with_retry(username: str):
    """Get user profile with automatic re-authentication on failure"""
    try:
        return await client.get_user_by_screen_name(username)
    except Exception as e:
        if is_auth_error(e):
            print(f"🔐 Auth error detected, attempting re-authentication...")
            if await re_authenticate():
                return await client.get_user_by_screen_name(username)
        raise


async def get_user_tweets_with_retry(username: str, count: int):
    """Get user tweets with automatic re-authentication on failure"""
    try:
        user = await client.get_user_by_screen_name(username)
        return await user.get_tweets('Tweets', count=count)
    except Exception as e:
        if is_auth_error(e):
            print(f"🔐 Auth error detected, attempting re-authentication...")
            if await re_authenticate():
                user = await client.get_user_by_screen_name(username)
                return await user.get_tweets('Tweets', count=count)
        raise


# --- CACHING WRAPPERS (now using retry functions) ---
@alru_cache(maxsize=100, ttl=300)
async def cached_search(query: str, product: str, count: int):
    return await search_with_retry(query, product, count)

@alru_cache(maxsize=100, ttl=300)
async def cached_user_lookup(username: str):
    return await get_user_with_retry(username)

@alru_cache(maxsize=100, ttl=300)
async def cached_user_tweets(username: str, count: int):
    return await get_user_tweets_with_retry(username, count)

# --- MODELS ---
class SearchRequest(BaseModel):
    query: str
    count: Optional[int] = 20
    search_type: Optional[str] = "Latest"

class CookieSyncRequest(BaseModel):
    cookies: Dict[str, Any]

# --- ENDPOINTS ---

@app.get("/")
async def root():
    return {"status": "online", "message": "Twitter Scraper API is running"}

# --- COOKIE SYNC ENDPOINT (Browser Extension) ---

@app.post("/api/cookies/sync")
async def sync_cookies(body: CookieSyncRequest, x_api_key: str = Header(None)):
    """
    Receive cookies from browser extension.
    Protected by API key authentication.
    """
    # Verify API key
    if not COOKIE_SYNC_API_KEY:
        raise HTTPException(status_code=500, detail="COOKIE_SYNC_API_KEY not configured on server")
    
    if x_api_key != COOKIE_SYNC_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Validate cookies have required fields
    cookies = body.cookies
    if not cookies.get('auth_token') or not cookies.get('ct0'):
        raise HTTPException(status_code=400, detail="Missing required cookies: auth_token and ct0")
    
    try:
        # Save cookies to file
        script_dir = os.path.dirname(os.path.abspath(__file__))
        cookies_path = os.path.join(script_dir, 'cookies.json')
        
        with open(cookies_path, 'w') as f:
            json.dump(cookies, f, indent=2)
        
        # Reload into twikit client
        client.load_cookies(cookies_path)
        
        print(f"✅ Cookies synced successfully! {len(cookies)} cookies received.")
        return {
            "success": True,
            "message": f"Cookies synced successfully! {len(cookies)} cookies received.",
            "cookies_count": len(cookies)
        }
        
    except Exception as e:
        print(f"❌ Cookie sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debug/auth")
async def debug_auth():
    """Check if Twitter authentication is working"""
    try:
        # Try a simple search to verify cookies work
        tweets = await client.search_tweet("test", product="Latest", count=1)
        return {
            "authenticated": True,
            "message": "Cookies are valid and working!",
            "test_search_success": True
        }
    except Exception as e:
        import traceback
        print(f"🔍 Auth Debug Error: {e}")
        print(f"📋 Traceback:\n{traceback.format_exc()}")
        return {
            "authenticated": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "message": "Cookies are expired or invalid. Please refresh cookies.json"
        }


@app.post("/debug/force-reauth")
async def force_reauth():
    """Force re-authentication for testing - triggers credential-based login"""
    print("🧪 Force re-auth triggered via debug endpoint")
    success = await re_authenticate()
    return {
        "success": success,
        "message": "Re-authentication successful! New cookies saved." if success else "Re-authentication failed. Check Render logs for details.",
        "credentials_available": all([TWITTER_USERNAME, TWITTER_PASSWORD])
    }


@app.post("/debug/invalidate-cookies")
async def invalidate_cookies():
    """Invalidate current cookies to test auto re-auth on next request"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cookies_path = os.path.join(script_dir, 'cookies.json')
    
    try:
        if os.path.exists(cookies_path):
            # Rename instead of delete so we can recover if needed
            backup_path = cookies_path + ".backup"
            os.rename(cookies_path, backup_path)
            print(f"🗑️ Cookies invalidated (backed up to {backup_path})")
            return {
                "success": True,
                "message": "Cookies invalidated. Next API call will trigger re-authentication.",
                "backup_created": True
            }
        else:
            return {
                "success": False,
                "message": "No cookies.json found to invalidate.",
                "backup_created": False
            }
    except Exception as e:
        print(f"❌ Error invalidating cookies: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to invalidate cookies"
        }


@app.get("/debug/status")
async def debug_status():
    """Get comprehensive debug status - cookies, credentials, and auth state"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cookies_path = os.path.join(script_dir, 'cookies.json')
    
    return {
        "cookies_file_exists": os.path.exists(cookies_path),
        "credentials_configured": {
            "username": bool(TWITTER_USERNAME),
            "email": bool(TWITTER_EMAIL),
            "password": bool(TWITTER_PASSWORD)
        },
        "can_auto_reauth": all([TWITTER_USERNAME, TWITTER_PASSWORD]),
        "is_currently_reauthenticating": _is_reauthenticating,
        "environment": "production" if os.getenv("RAILWAY_ENVIRONMENT") else "development"
    }


@app.post("/search")
@limiter.limit("5/minute")
async def search_tweets(request: Request, body: SearchRequest):
    try:
        tweets = await cached_search(body.query, body.search_type, body.count)
        results = []
        for tweet in tweets:
            results.append({
                "id": tweet.id,
                "text": tweet.text,
                "created_at": str(tweet.created_at),
                "likes": tweet.favorite_count or 0,
                "retweets": tweet.retweet_count or 0,
                "user_name": tweet.user.name,
                "user_screen_name": tweet.user.screen_name,
                "user_followers": tweet.user.followers_count or 0,
                "url": f"https://twitter.com/{tweet.user.screen_name}/status/{tweet.id}"
            })
        return {"success": True, "tweets": results}
    except Exception as e:
        import traceback
        error_msg = str(e)
        error_type = type(e).__name__
        
        # Print detailed error to Render logs
        print(f"❌ Search Error [{error_type}]: {error_msg}")
        print(f"📋 Full traceback:\n{traceback.format_exc()}")
        
        # Check for common authentication issues
        if "unauthorized" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(status_code=401, detail="Twitter cookies expired. Please refresh cookies.json")
        elif "forbidden" in error_msg.lower() or "403" in error_msg:
            raise HTTPException(status_code=403, detail="Twitter blocked the request. Cookies may be invalid.")
        elif "not logged in" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Not logged in. Cookies need to be refreshed.")
        
        raise HTTPException(status_code=500, detail=f"[{error_type}] {error_msg}")

@app.get("/user/{username}")
@limiter.limit("10/minute")
async def get_user_profile(request: Request, username: str):
    try:
        username = username.replace("@", "")
        user = await cached_user_lookup(username)
        return {
            "success": True,
            "user": {
                "name": user.name,
                "screen_name": user.screen_name,
                "bio": getattr(user, 'description', '') or "",
                "followers_count": getattr(user, 'followers_count', 0) or 0,
                "following_count": getattr(user, 'friends_count', 0) or 0,
                "tweets_count": getattr(user, 'statuses_count', 0) or 0,
                "profile_image_url": getattr(user, 'profile_image_url', '') or "",
                "location": getattr(user, 'location', '') or "",
                "website": getattr(user, 'url', '') or "",
                "created_at": getattr(user, 'created_at', '') or "",
            }
        }
    except Exception as e:
        print(f"❌ Profile Error: {e}")
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/user/{username}/tweets")
@limiter.limit("5/minute")
async def get_user_tweets(request: Request, username: str, count: int = 20):
    try:
        username = username.replace("@", "")
        tweets = await cached_user_tweets(username, count)
        results = []
        for t in tweets:
             results.append({
                "id": t.id, 
                "text": t.text, 
                "likes": t.favorite_count,
                "retweets": t.retweet_count,
                "created_at": str(t.created_at),
                "user_name": t.user.name,
                "user_screen_name": t.user.screen_name,
                "user_followers": t.user.followers_count,
                "url": f"https://twitter.com/{t.user.screen_name}/status/{t.id}"
             })
        return {"success": True, "tweets": results}
    except Exception as e:
        print(f"❌ Timeline Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trending")
@limiter.limit("2/minute")
async def get_trending(request: Request):
    try:
        trends = await client.get_trends('trending')
        results = [{"name": t.name, "url": f"https://twitter.com/search?q={t.name}"} for t in trends[:10]]
        return {"success": True, "trends": results}
    except Exception as e:
        print(f"❌ Trending Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)