"""
Twitter Web Scraper API
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from twikit import Client
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from async_lru import alru_cache
from typing import Optional
import os
import uvicorn

# Initialize Client
client = Client('en-US')

# --- LIFESPAN (Replaces startup event) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load cookies on startup
    try:
        if os.path.exists('cookies.json'):
            client.load_cookies('cookies.json')
            print("✅ Cookies loaded successfully")
        else:
            print("⚠️ Warning: cookies.json not found")
    except Exception as e:
        print(f"❌ Error loading cookies: {e}")
    yield
    # Cleanup code can go here if needed

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

# --- CACHING WRAPPERS ---
@alru_cache(maxsize=100, ttl=300)
async def cached_search(query: str, product: str, count: int):
    return await client.search_tweet(query, product=product, count=count)

@alru_cache(maxsize=100, ttl=300)
async def cached_user_lookup(username: str):
    return await client.get_user_by_screen_name(username)

@alru_cache(maxsize=100, ttl=300)
async def cached_user_tweets(username: str, count: int):
    user = await client.get_user_by_screen_name(username)
    return await user.get_tweets('Tweets', count=count)

# --- MODELS ---
class SearchRequest(BaseModel):
    query: str
    count: Optional[int] = 20
    search_type: Optional[str] = "Latest"

# --- ENDPOINTS ---

@app.get("/")
async def root():
    return {"status": "online", "message": "Twitter Scraper API is running"}

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
        raise HTTPException(status_code=500, detail=str(e))

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
                "tweets_count": getattr(user, 'statuses_count', 0) or 0,
                "profile_image_url": getattr(user, 'profile_image_url', '') or "",
            }
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/user/{username}/tweets")
@limiter.limit("5/minute")
async def get_user_tweets(request: Request, username: str, count: int = 20):
    try:
        username = username.replace("@", "")
        tweets = await cached_user_tweets(username, count)
        results = [{"id": t.id, "text": t.text, "likes": t.favorite_count} for t in tweets]
        return {"success": True, "tweets": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trending")
@limiter.limit("2/minute")
async def get_trending(request: Request):
    try:
        trends = await client.get_trends('trending')
        results = [{"name": t.name, "url": f"https://twitter.com/search?q={t.name}"} for t in trends[:10]]
        return {"success": True, "trends": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)