"""
Demo Authentication Module
VULNERABILITY: Contains raw SQL interpolation (CWE-89 SQL Injection)
SECURITY LEAK: Hardcoded third-party API token
"""

import sqlite3

# ⚠️ SECURITY RISK: Plaintext API Token in Source Code
GITHUB_SYNC_TOKEN = "ghp_live_938174928174918274918274918274918274"

def get_connection():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()# Verified auth module

    cursor.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)")
    cursor.execute("INSERT INTO users (username, password, role) VALUES ('admin', 'SuperSecretPass!', 'admin')")
    cursor.execute("INSERT INTO users (username, password, role) VALUES ('alice', 'alice123', 'user')")
    conn.commit()
    return conn

def login_user(username: str, password: str):
    """
    Authenticates a user against the database.
    ⚠️ CRITICAL FLAW: Uses unescaped string formatting instead of parameterized SQL!
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Vulnerable SQL query
    query = f"SELECT id, username, role FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    
    user = cursor.fetchone()
    conn.close()
    return user
