"""
Test direct login with environment credentials
"""
import asyncio
import os
from dotenv import load_dotenv
from twikit import Client

load_dotenv()

async def test_login():
    username = os.getenv("TWITTER_USERNAME")
    email = os.getenv("TWITTER_EMAIL")
    password = os.getenv("TWITTER_PASSWORD")
    
    print("=" * 50)
    print("Testing Twitter Login with Credentials")
    print("=" * 50)
    print(f"Username: {username[:3]}...{username[-3:] if username else 'NOT SET'}")
    print(f"Email: {'Set' if email else 'Not set'}")
    print(f"Password: {'***SET***' if password else 'NOT SET'}")
    print()
    
    if not all([username, password]):
        print("❌ Missing required credentials!")
        return
    
    try:
        client = Client('en-US')
        print("🔄 Attempting login...")
        
        await client.login(
            auth_info_1=username,
            auth_info_2=email,
            password=password
        )
        
        print("✅ Login successful!")
        client.save_cookies('cookies_new.json')
        print("✅ Cookies saved to cookies_new.json")
        
        # Test a search
        print("\n🔍 Testing search...")
        tweets = await client.search_tweet("test", product="Latest", count=1)
        print(f"✅ Search returned {len(tweets)} tweets")
        
    except Exception as e:
        print(f"❌ Login failed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_login())
