"""
Demo Web Service Entry Point
"""

from auth import login_user

def main():
    print("SentinelFlow Demo Application - Service Running")
    print("Testing auth interface...")
    res = login_user("alice", "alice123")
    print(f"Auth test user: {res}")

if __name__ == "__main__":
    main()
