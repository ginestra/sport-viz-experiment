# Player Data Update Scripts

Scripts to automatically update player data from Wikipedia using their official API.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Manual Update from Wikipedia

```bash
python scripts/update-player-data.py
```

This script will:
- Search Wikipedia for each player in `public/data/players.csv`
- Extract club information from player Wikipedia pages
- Update the CSV file with the latest club data

**Note:** The script adds a 1-second delay between requests to be respectful to Wikipedia's servers.

### Automated Weekly Updates

The project includes a GitHub Actions workflow (`.github/workflows/update-player-data.yml`) that:
- **Runs automatically every Monday at 2 AM UTC** (weekly)
- Can also be triggered manually via GitHub Actions UI
- Commits and pushes changes if any updates are found

## Features

- ✅ Uses Wikipedia API (free, legal, no authentication needed)
- ✅ Automatically searches for player pages
- ✅ Extracts club history from infoboxes
- ✅ Updates CSV in-place with new data
- ✅ Automated weekly updates via GitHub Actions
- ✅ Respectful rate limiting (1 second between requests)

## Limitations

- Wikipedia infobox formats can vary, so parsing may not work for all players
- Some players may not have complete club histories on Wikipedia
- Manual verification may be needed for some entries

## GitHub Actions Setup

The workflow is already configured. To enable:
1. Ensure the workflow file exists: `.github/workflows/update-player-data.yml`
2. Push to your repository
3. GitHub Actions will automatically run weekly

To manually trigger:
1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Update Player Data from Wikipedia"
4. Click "Run workflow"

## Alternative Sources

If Wikipedia doesn't have complete data, consider:
- Manual updates (most reliable)
- Transfermarkt (requires scraping)
- FBref (requires scraping)
- Official club/league websites

