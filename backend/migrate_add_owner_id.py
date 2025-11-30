"""
Migration script to add `owner_id` column to the `case` table and backfill values.

Usage:
  - Backup your database first!
  - From project root (Windows PowerShell):
      python .\backend\migrate_add_owner_id.py --default-owner 1

The script will:
  - Check whether `owner_id` exists on the `case` table
  - If missing, ALTER TABLE to add `owner_id` (INTEGER)
  - Backfill existing rows to `--default-owner` (default: 1)
  - Create an index on `owner_id` for query performance

Note: SQLite cannot add FK constraints or alter unique constraints easily; this script only
adds the column and backfills values. For production, use a proper migration tool (Alembic).
"""
import sqlite3
import argparse
from pathlib import Path
import sys


def get_db_path():
    basedir = Path(__file__).parent
    db_path = basedir / 'app' / 'database' / 'db.sqlite3'
    return db_path


def column_exists(conn, table_name, column_name):
    cur = conn.execute(f"PRAGMA table_info('{table_name}')")
    cols = [r[1] for r in cur.fetchall()]
    return column_name in cols


def migrate(db_path: Path, default_owner: int):
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        print("If you expect the DB to be created automatically, run the app once to create it.")
        return

    conn = sqlite3.connect(str(db_path))
    try:
        if column_exists(conn, 'case', 'owner_id'):
            print("[OK] Column 'owner_id' already exists. No migration needed.")
            return

        print(f"Adding column 'owner_id' to table 'case' in {db_path}...")
        # Add the column (SQLite supports ADD COLUMN)
        conn.execute("ALTER TABLE 'case' ADD COLUMN owner_id INTEGER")
        conn.commit()

        print("Backfilling existing rows with provided default owner id...")
        conn.execute("UPDATE 'case' SET owner_id = ? WHERE owner_id IS NULL", (default_owner,))
        conn.commit()

        print("Creating index on owner_id for performance...")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_case_owner_id ON 'case'(owner_id)")
        conn.commit()

        print("[OK] Migration completed. Existing cases were assigned to owner_id=%s" % default_owner)
        print("Reminder: If you need strict FK constraints or unique constraints involving owner_id, use Alembic or recreate the table with the desired schema.")

    except sqlite3.Error as e:
        print(f"[ERROR] Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--default-owner", type=int, default=1, help="Default owner_id to assign to existing cases")
    args = parser.parse_args()

    db_path = get_db_path()

    # Safety prompt
    print("*** IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT ***")
    print(f"Database path: {db_path}")
    resp = input(f"Proceed to add owner_id and backfill to {args.default_owner}? [y/N]: ").strip().lower()
    if resp != 'y':
        print("Cancelled by user.")
        sys.exit(0)

    migrate(db_path, args.default_owner)


if __name__ == '__main__':
    main()
