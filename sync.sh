#!/bin/bash
# TOABH Dashboard Sync Script
# Auto-commits and pushes changes to GitHub

cd /home/Fate/.openclaw/workspace/toabh/new_dashboard

# Add all changes
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "No changes to sync"
    exit 0
fi

# Commit with timestamp
git commit -m "Auto-sync $(date '+%Y-%m-%d %H:%M')"

# Push to GitHub
git push origin master

echo "Synced to GitHub at $(date)"
