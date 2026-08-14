import sqlite3

DB_NAME = "dictionary.db"

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row  # lets us access columns by name
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS words (
            word TEXT PRIMARY KEY,
            meaning TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def add_word(word, meaning):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO words (word, meaning) VALUES (?, ?)", (word, meaning))
    conn.commit()
    conn.close()

def get_word(word):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM words WHERE word = ?", (word,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_words():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM words")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_word(word, meaning):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE words SET meaning = ? WHERE word = ?", (meaning, word))
    conn.commit()
    conn.close()

def delete_word(word):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM words WHERE word = ?", (word,))
    conn.commit()
    conn.close()