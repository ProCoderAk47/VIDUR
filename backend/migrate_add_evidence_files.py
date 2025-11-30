"""
Migration script to add evidence_files column to the Case table.
Run this script once to update your database schema.
"""
import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add evidence_files column to the case table"""
    # Get database path
    basedir = Path(__file__).parent
    db_path = basedir / 'app' / 'database' / 'db.sqlite3'
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        print("Creating database with new schema...")
        from app import create_app, db
        app = create_app()
        with app.app_context():
            db.create_all()
        print("✓ Database created with new schema")
        return
    
    print(f"Migrating database at {db_path}...")
    
    # Connect to database
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute('PRAGMA table_info("case")')
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'evidence_files' in columns:
            print("[OK] Column 'evidence_files' already exists. Migration not needed.")
            conn.close()
            return
        
        # Add the new column
        print("Adding 'evidence_files' column...")
        cursor.execute("""
            ALTER TABLE "case" 
            ADD COLUMN evidence_files TEXT
        """)
        
        conn.commit()
        print("[OK] Migration completed successfully!")
        print("  - Added 'evidence_files' column (TEXT/JSON type)")
        
    except sqlite3.Error as e:
        print(f"[ERROR] Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()

