#!/usr/bin/env python3
"""
Migration script to add prompt_number field to existing database.
This script safely adds the new column to existing tables.
"""

import sys
import os

# Add the dashboard directory to the path
sys.path.insert(0, '/home/Fate/.openclaw/workspace/toabh/new_dashboard')

from flask import Flask
from config import Config
from database import db

app = Flask(__name__)
app.config.from_object(Config)

def migrate():
    with app.app_context():
        db.init_app(app)
        
        # Check if column exists in prompts table
        inspector = db.inspect(db.engine)
        prompt_columns = [col['name'] for col in inspector.get_columns('prompts')]
        image_columns = [col['name'] for col in inspector.get_columns('generated_images')]
        
        print("Current prompts columns:", prompt_columns)
        print("Current generated_images columns:", image_columns)
        
        # Add prompt_number to prompts if not exists
        if 'prompt_number' not in prompt_columns:
            print("Adding prompt_number column to prompts table...")
            db.session.execute(db.text(
                "ALTER TABLE prompts ADD COLUMN prompt_number VARCHAR(10)"
            ))
            db.session.commit()
            print("✓ Added prompt_number to prompts")
        else:
            print("✓ prompt_number already exists in prompts")
        
        # Add prompt_number to generated_images if not exists
        if 'prompt_number' not in image_columns:
            print("Adding prompt_number column to generated_images table...")
            db.session.execute(db.text(
                "ALTER TABLE generated_images ADD COLUMN prompt_number VARCHAR(10)"
            ))
            db.session.commit()
            print("✓ Added prompt_number to generated_images")
        else:
            print("✓ prompt_number already exists in generated_images")
        
        # Now backfill prompt numbers for existing prompts
        print("\nBackfilling prompt numbers for existing prompts...")
        result = db.session.execute(db.text(
            "SELECT id FROM prompts WHERE prompt_number IS NULL ORDER BY id"
        ))
        rows = result.fetchall()
        
        if rows:
            # Get the max existing prompt number first
            max_result = db.session.execute(db.text(
                "SELECT prompt_number FROM prompts WHERE prompt_number IS NOT NULL ORDER BY prompt_number DESC LIMIT 1"
            ))
            max_row = max_result.fetchone()
            
            if max_row and max_row[0]:
                try:
                    next_num = int(max_row[0][1:]) + 1
                except:
                    next_num = 1
            else:
                next_num = 1
            
            for row in rows:
                prompt_num = f"P{next_num:03d}"
                db.session.execute(
                    db.text("UPDATE prompts SET prompt_number = :num WHERE id = :id"),
                    {"num": prompt_num, "id": row[0]}
                )
                next_num += 1
            
            db.session.commit()
            print(f"✓ Backfilled {len(rows)} prompt numbers")
        
        # Also backfill prompt_number for existing generated images
        print("\nBackfilling prompt numbers for existing generated images...")
        result = db.session.execute(db.text(
            """SELECT gi.id, p.prompt_number 
               FROM generated_images gi 
               JOIN prompts p ON gi.prompt_id = p.id 
               WHERE gi.prompt_number IS NULL"""
        ))
        rows = result.fetchall()
        
        if rows:
            for row in rows:
                if row[1]:  # prompt has a prompt_number
                    db.session.execute(
                        db.text("UPDATE generated_images SET prompt_number = :num WHERE id = :id"),
                        {"num": row[1], "id": row[0]}
                    )
            db.session.commit()
            print(f"✓ Backfilled {len(rows)} image prompt numbers")
        
        print("\n✅ Migration complete!")

if __name__ == '__main__':
    migrate()
