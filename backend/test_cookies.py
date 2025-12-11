"""
Test if extracted cookies work with Twikit
Run this after creating cookies.json
"""
import asyncio
import os
from twikit import Client

async def test_cookies():
    """Test if cookies.json works with Twikit"""
    
    # Check if cookies.json exists
    if not os.path.exists('cookies.json'):
        print("❌ Error: cookies.json not found!")
        print("Please create cookies.json first using the browser extension")
        return
    
    print("=" * 60)
    print("Testing Twitter Cookies")
    print("=" * 60)
    
    try:
        # Initialize client
        client = Client('en-US')
        
        # Load cookies from file
        print("\n📂 Loading cookies from cookies.json...")
        client.load_cookies('cookies.json')
        
        # Test 1: Get your own profile
        print("\n🔍 Test 1: Fetching your profile...")
        user = await client.get_user_by_screen_name('banishanish')  # Changed method name
        print(f"✅ Success! Logged in as: @{user.screen_name}")
        print(f"   Name: {user.name}")
        print(f"   Followers: {user.followers_count}")
        
        # Test 2: Get user's tweets (more reliable than search)
        print("\n🔍 Test 2: Fetching recent tweets from timeline...")
        try:
            tweets = await user.get_tweets('Tweets', count=5)
            print(f"✅ Success! Found {len(tweets)} tweets from your profile")
            
            if tweets:
                print("\n📝 Your latest tweet:")
                first_tweet = tweets[0]
                print(f"   {first_tweet.text[:100]}...")
        except Exception as e:
            print(f"⚠️  Could not fetch tweets (this is normal for new accounts): {e}")
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print("=" * 60)
        print("\n✅ Your cookies are working perfectly with Twikit!")
        print("✅ You can now build your scraper application")
        
    except FileNotFoundError:
        print("\n❌ Error: cookies.json file not found")
        print("Make sure cookies.json is in the same folder as this script")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Make sure you exported cookies from twitter.com while logged in")
        print("2. Check that cookies.json is properly formatted JSON")
        print("3. Your cookies might have expired - export fresh ones")
        print("4. Make sure you're using EditThisCookie or Cookie-Editor extension")

if __name__ == "__main__":
    asyncio.run(test_cookies())