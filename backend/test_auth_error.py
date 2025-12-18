"""
Test the is_auth_error function with mock Unauthorized exception
"""

# Simulate twikit's Unauthorized exception
class Unauthorized(Exception):
    pass

def is_auth_error(error):
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

# Test with various exceptions
test_cases = [
    Unauthorized("Twitter error"),
    Exception("401 Unauthorized"),
    Exception("You are not logged in"),
    Exception("Some random error"),
]

print("Testing is_auth_error function:")
print("=" * 50)
for e in test_cases:
    print(f"Exception: {type(e).__name__}('{str(e)}')")
    print(f"  is_auth_error: {is_auth_error(e)}")
    print()
