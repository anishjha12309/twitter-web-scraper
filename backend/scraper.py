"""
Twitter Web Scraper API
FastAPI backend that scrapes Twitter data using Twikit
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from twikit import Client
import asyncio
from typing import Optional, List
import os

# Initialize FastAPI app
app = FastAPI(title="Twitter Scraper API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Twikit client
client = Client('en-US')

# Load cookies on startup
@app.on_event("startup")
async def startup_event():
    """Load Twitter cookies when server starts"""
    try:
        if os.path.exists('cookies.json'):
            client.load_cookies('cookies.json')
            print("✅ Cookies loaded successfully")
        else:
            print("⚠️ Warning: cookies.json not found")
    except Exception as e:
        print(f"❌ Error loading cookies: {e}")


# Request/Response Models
class SearchRequest(BaseModel):
    query: str
    count: Optional[int] = 20
    search_type: Optional[str] = "Latest"  # Latest, Top, People, Photos, Videos


class UserRequest(BaseModel):
    username: str


class TweetData(BaseModel):
    id: str
    text: str
    created_at: str
    likes: int
    retweets: int
    replies: int
    views: Optional[int] = 0
    user_name: str
    user_screen_name: str
    user_followers: int


class UserData(BaseModel):
    name: str
    screen_name: str
    bio: Optional[str] = ""
    followers_count: int
    following_count: int
    tweets_count: int
    created_at: str
    verified: bool
    profile_image_url: Optional[str] = ""


# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "message": "Twitter Scraper API is running",
        "endpoints": [
            "/search - Search tweets by keyword/hashtag",
            "/user/{username} - Get user profile info",
            "/user/{username}/tweets - Get user's recent tweets"
        ]
    }


@app.post("/search")
async def search_tweets(request: SearchRequest):
    """
    Search tweets by keyword or hashtag
    
    Example request:
    {
        "query": "python programming",
        "count": 20,
        "search_type": "Latest"
    }
    """
    try:
        # Search tweets
        tweets = await client.search_tweet(
            request.query, 
            product=request.search_type,
            count=request.count
        )
        
        # Format response
        results = []
        for tweet in tweets:
            results.append({
                "id": tweet.id,
                "text": tweet.text,
                "created_at": str(tweet.created_at),
                "likes": tweet.favorite_count or 0,
                "retweets": tweet.retweet_count or 0,
                "replies": tweet.reply_count or 0,
                "views": getattr(tweet, 'view_count', 0) or 0,
                "user_name": tweet.user.name,
                "user_screen_name": tweet.user.screen_name,
                "user_followers": tweet.user.followers_count or 0,
                "url": f"https://twitter.com/{tweet.user.screen_name}/status/{tweet.id}"
            })
        
        return {
            "success": True,
            "query": request.query,
            "count": len(results),
            "tweets": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/user/{username}")
async def get_user_profile(username: str):
    """
    Get detailed user profile information
    
    Example: /user/elonmusk
    """
    try:
        # Remove @ if user includes it
        username = username.replace("@", "")
        
        # Get user profile
        user = await client.get_user_by_screen_name(username)
        
        return {
            "success": True,
            "user": {
                "name": user.name,
                "screen_name": user.screen_name,
                "bio": getattr(user, 'description', '') or "",
                "followers_count": getattr(user, 'followers_count', 0) or 0,
                "following_count": getattr(user, 'following_count', 0) or 0,
                "tweets_count": getattr(user, 'statuses_count', 0) or 0,
                "created_at": str(user.created_at) if hasattr(user, 'created_at') and user.created_at else "",
                "verified": getattr(user, 'verified', False) or False,
                "profile_image_url": getattr(user, 'profile_image_url', '') or getattr(user, 'profile_image_url_https', '') or "",
                "location": getattr(user, 'location', '') or "",
                "website": getattr(user, 'url', '') or "",
                "profile_url": f"https://twitter.com/{user.screen_name}"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"User not found: {str(e)}")


@app.get("/user/{username}/tweets")
async def get_user_tweets(username: str, count: int = 20):
    """
    Get recent tweets from a specific user
    
    Example: /user/elonmusk/tweets?count=10
    """
    try:
        # Remove @ if user includes it
        username = username.replace("@", "")
        
        # Get user first
        user = await client.get_user_by_screen_name(username)
        
        # Get user's tweets
        tweets = await user.get_tweets('Tweets', count=count)
        
        # Format response
        results = []
        for tweet in tweets:
            results.append({
                "id": tweet.id,
                "text": tweet.text,
                "created_at": str(tweet.created_at),
                "likes": tweet.favorite_count or 0,
                "retweets": tweet.retweet_count or 0,
                "replies": tweet.reply_count or 0,
                "views": getattr(tweet, 'view_count', 0) or 0,
                "url": f"https://twitter.com/{username}/status/{tweet.id}"
            })
        
        return {
            "success": True,
            "username": username,
            "count": len(results),
            "tweets": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tweets: {str(e)}")


@app.get("/trending")
async def get_trending():
    """
    Get current trending topics/hashtags
    """
    try:
        trends = await client.get_trends('trending')
        
        results = []
        for trend in trends[:20]:  
            results.append({
                "name": trend.name,
                "tweet_count": getattr(trend, 'tweet_count', 0) or 0,
                "url": f"https://twitter.com/search?q={trend.name.replace('#', '%23')}"
            })
        
        return {
            "success": True,
            "count": len(results),
            "trends": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trends: {str(e)}")


# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)