"""
Secured Authentication Module
FIXED: Uses parameterized SQL queries (immune to CWE-89 SQL Injection)
FIXED: Sensitive token removed / sourced from secure environment variable
"""

import sqlite3
import os

# Securely read token from environment variable rather than hardcoded in plaintext
GITHUB_SYNC_TOKEN = os.getenv("GITHUB_SYNC_TOKEN", "[PROTECTED]")

def get_connection():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)")
    cursor.execute("INSERT INTO users (username, password, role) VALUES ('admin', 'SuperSecretPass!', 'admin')")
    cursor.execute("INSERT INTO users (username, password, role) VALUES ('alice', 'alice123', 'user')")
    conn.commit()
    return conn

def login_user(username: str, password: str):
    """
    Authenticates a user against the database.
    SECURE: Parameterized query ensures input values are never executed as SQL logic.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Parameterized query with safe placeholders
    query = "SELECT id, username, role FROM users WHERE username = ? AND password = ?"
    cursor.execute(query, (username, password))
    
    user = cursor.fetchone()
    conn.close()
    return user
