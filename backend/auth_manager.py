"""
Twitter Authentication Manager
Uses Playwright Stealth for browser-based login to bypass Cloudflare/bot detection.
Provides session management for twikit client.
"""
import asyncio
import json
import os
import random
from typing import Optional
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

# Try to import stealth - fall back gracefully if not available
try:
    from playwright_stealth import stealth_async
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False
    print("⚠️ playwright-stealth not installed. Running without stealth mode.")


class AuthManager:
    """Manages Twitter authentication state using Playwright for browser-based login."""
    
    def __init__(self, cookies_path: str = "cookies.json"):
        self.cookies_path = cookies_path
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.full_cookies_path = os.path.join(self.script_dir, cookies_path)
        self._is_refreshing = False
    
    async def _human_delay(self, min_ms: int = 500, max_ms: int = 1500):
        """Add random delay to mimic human behavior."""
        delay = random.randint(min_ms, max_ms) / 1000
        await asyncio.sleep(delay)
    
    async def _type_like_human(self, page, selector: str, text: str):
        """Type text with random delays between keystrokes."""
        element = page.locator(selector)
        await element.click()
        for char in text:
            await element.type(char, delay=random.randint(50, 150))
        await self._human_delay(300, 600)
    
    def get_credentials(self) -> tuple:
        """Get Twitter credentials from environment variables."""
        username = os.getenv("TWITTER_USERNAME")
        email = os.getenv("TWITTER_EMAIL")
        password = os.getenv("TWITTER_PASSWORD")
        return username, email, password
    
    def has_valid_cookies(self) -> bool:
        """Check if cookies file exists and has content."""
        if not os.path.exists(self.full_cookies_path):
            return False
        try:
            with open(self.full_cookies_path, 'r') as f:
                cookies = json.load(f)
                # Check for essential auth cookies
                return bool(cookies.get('auth_token')) and bool(cookies.get('ct0'))
        except (json.JSONDecodeError, IOError):
            return False
    
    async def refresh_session(self, headless: bool = True) -> dict:
        """
        Perform browser-based login to Twitter and save fresh cookies.
        
        Args:
            headless: Run browser in headless mode (True for production).
        
        Returns:
            dict: {"success": bool, "message": str}
        """
        if self._is_refreshing:
            return {"success": False, "message": "Already refreshing session"}
        
        username, email, password = self.get_credentials()
        if not username or not password:
            return {"success": False, "message": "Missing TWITTER_USERNAME or TWITTER_PASSWORD"}
        
        self._is_refreshing = True
        print("🎭 Starting Playwright Stealth login...")
        
        try:
            async with async_playwright() as p:
                # Launch browser with anti-detection settings
                browser = await p.chromium.launch(
                    headless=headless,
                    args=[
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-blink-features=AutomationControlled',
                        '--disable-dev-shm-usage',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor'
                    ]
                )
                
                context = await browser.new_context(
                    viewport={'width': 1280, 'height': 720},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    locale='en-US',
                    timezone_id='America/New_York'
                )
                
                page = await context.new_page()
                
                # Apply stealth if available
                if STEALTH_AVAILABLE:
                    await stealth_async(page)
                    print("🥷 Stealth mode enabled")
                
                # Remove webdriver flag
                await page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                    Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
                    Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
                """)
                
                try:
                    # Navigate to login
                    print("📍 Navigating to Twitter login...")
                    await page.goto('https://x.com/i/flow/login', timeout=30000)
                    await self._human_delay(2000, 3000)
                    
                    # Enter username
                    print("👤 Entering username...")
                    username_input = page.locator('input[autocomplete="username"]')
                    await username_input.wait_for(state='visible', timeout=15000)
                    await self._type_like_human(page, 'input[autocomplete="username"]', username)
                    await self._human_delay()
                    
                    # Click Next
                    next_button = page.locator('button:has-text("Next")')
                    await next_button.click()
                    await self._human_delay(1500, 2500)
                    
                    # Handle potential email verification
                    try:
                        email_input = page.locator('input[data-testid="ocfEnterTextTextInput"]')
                        if await email_input.is_visible(timeout=3000):
                            print("📧 Email verification required...")
                            if email:
                                await self._type_like_human(page, 'input[data-testid="ocfEnterTextTextInput"]', email)
                                verify_btn = page.locator('button[data-testid="ocfEnterTextNextButton"]')
                                await verify_btn.click()
                                await self._human_delay(1500, 2500)
                            else:
                                return {"success": False, "message": "Email verification required but TWITTER_EMAIL not set"}
                    except PlaywrightTimeout:
                        pass  # No email verification needed
                    
                    # Enter password
                    print("🔑 Entering password...")
                    password_input = page.locator('input[name="password"]')
                    await password_input.wait_for(state='visible', timeout=10000)
                    await self._type_like_human(page, 'input[name="password"]', password)
                    await self._human_delay()
                    
                    # Click Login
                    login_button = page.locator('button[data-testid="LoginForm_Login_Button"]')
                    await login_button.click()
                    print("⏳ Waiting for login to complete...")
                    await self._human_delay(3000, 5000)
                    
                    # Wait for successful login
                    try:
                        await page.wait_for_url('**/home**', timeout=20000)
                        print("✅ Login successful!")
                    except PlaywrightTimeout:
                        current_url = page.url
                        if 'x.com' in current_url and 'login' not in current_url.lower():
                            print(f"✅ Login appears successful (URL: {current_url})")
                        else:
                            # Check for error toast
                            error_elem = page.locator('[data-testid="toast"]')
                            if await error_elem.is_visible():
                                error_text = await error_elem.text_content()
                                return {"success": False, "message": f"Login failed: {error_text}"}
                            return {"success": False, "message": "Login timeout - may need verification"}
                    
                    # Extract cookies
                    print("🍪 Extracting cookies...")
                    cookies = await context.cookies()
                    
                    # Filter for Twitter/X cookies
                    twitter_cookies = [c for c in cookies if 'twitter.com' in c.get('domain', '') or 'x.com' in c.get('domain', '')]
                    
                    if not twitter_cookies:
                        return {"success": False, "message": "No Twitter cookies found after login"}
                    
                    # Convert to twikit-compatible format (key-value dict)
                    twikit_cookies = {}
                    for cookie in twitter_cookies:
                        twikit_cookies[cookie['name']] = cookie['value']
                    
                    # Save cookies
                    with open(self.full_cookies_path, 'w') as f:
                        json.dump(twikit_cookies, f, indent=2)
                    
                    print(f"✅ Saved {len(twitter_cookies)} cookies to {self.full_cookies_path}")
                    return {"success": True, "message": f"Login successful, {len(twitter_cookies)} cookies saved"}
                    
                except PlaywrightTimeout as e:
                    print(f"❌ Timeout error: {e}")
                    return {"success": False, "message": f"Timeout during login: {str(e)}"}
                except Exception as e:
                    print(f"❌ Error during login: {e}")
                    import traceback
                    traceback.print_exc()
                    return {"success": False, "message": str(e)}
                finally:
                    await browser.close()
                    
        except Exception as e:
            print(f"❌ Browser launch failed: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "message": f"Browser error: {str(e)}"}
        finally:
            self._is_refreshing = False
    
    def load_cookies_to_client(self, client) -> bool:
        """Load saved cookies into a twikit client."""
        try:
            if os.path.exists(self.full_cookies_path):
                client.load_cookies(self.full_cookies_path)
                print(f"✅ Cookies loaded from {self.full_cookies_path}")
                return True
            return False
        except Exception as e:
            print(f"❌ Failed to load cookies: {e}")
            return False


# Global instance
auth_manager = AuthManager()


# Standalone test
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    async def test():
        manager = AuthManager()
        print(f"Cookies valid: {manager.has_valid_cookies()}")
        
        result = await manager.refresh_session(headless=False)  # Visible for testing
        print(f"\nResult: {result}")
    
    asyncio.run(test())
