"""
Unit tests for auth.py
Validates legitimate authentication and verifies resistance to SQL injection attacks.
"""

from auth import login_user

def test_legitimate_login():
    user = login_user("admin", "SuperSecretPass!")
    assert user is not None, "Valid user should log in"
    assert user[1] == "admin", "Username should match admin"

def test_invalid_login():
    user = login_user("admin", "WrongPassword!")
    assert user is None, "Invalid password should return None"

def test_sql_injection_defense():
    # Classic SQL injection comment payload that bypasses password check: ' OR 1=1 --
    malicious_payload = "' OR 1=1 --"
    user = login_user(malicious_payload, "wrong_password")
    
    # In secure code, injection MUST fail and return None
    assert user is None, f"VULNERABILITY DETECTED! SQL injection succeeded and bypassed authentication as: {user}"

if __name__ == "__main__":
    print("Running Security Validation Suite...")
    try:
        test_legitimate_login()
        print("[PASS] Normal login: PASSED")
        test_invalid_login()
        print("[PASS] Invalid login: PASSED")
        test_sql_injection_defense()
        print("[PASS] SQL Injection defense: PASSED")
        print("\nALL 3/3 TESTS PASSED")
    except AssertionError as e:
        print(f"[FAIL] SECURITY TEST FAILED: {e}")
        exit(1)
