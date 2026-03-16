"""
Turso sync utilities for database backup/restore
"""
import os
from dotenv import load_dotenv

load_dotenv()

TURSO_DB_URL = os.environ.get('TURSO_DB_URL')
TURSO_AUTH_TOKEN = os.environ.get('TURSO_AUTH_TOKEN')

def get_turso_client():
    """Get Turso client for database sync"""
    if not TURSO_DB_URL or not TURSO_AUTH_TOKEN:
        return None
    
    try:
        import libsql_client
        return libsql_client.create_client(
            url=TURSO_DB_URL,
            auth_token=TURSO_AUTH_TOKEN
        )
    except ImportError:
        return None

def sync_to_turso(local_db='instance/toabh_imagen.db'):
    """Sync local SQLite database to Turso"""
    if not TURSO_DB_URL or not TURSO_AUTH_TOKEN:
        print("Turso not configured, skipping sync")
        return False
    
    try:
        import subprocess
        # Use turso CLI to push database
        result = subprocess.run(
            ['turso', 'db', 'push', 'toabh-images', local_db],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("Database synced to Turso successfully")
            return True
        else:
            print(f"Sync failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"Sync error: {e}")
        return False

def sync_from_turso():
    """Restore database from Turso"""
    if not TURSO_DB_URL or not TURSO_AUTH_TOKEN:
        print("Turso not configured, skipping restore")
        return False
    
    try:
        import subprocess
        result = subprocess.run(
            ['turso', 'db', 'pull', 'toabh-images', 'instance/toabh_imagen.db'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("Database restored from Turso successfully")
            return True
        else:
            print(f"Restore failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"Restore error: {e}")
        return False

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == 'push':
            sync_to_turso()
        elif sys.argv[1] == 'pull':
            sync_from_turso()
    else:
        print("Usage: python turso_sync.py push|pull")
