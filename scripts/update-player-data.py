#!/usr/bin/env python3
"""
Script to update player club data from Wikipedia.
Uses Wikipedia API to fetch up-to-date club information for players.
"""

import csv
import re
import json
import requests
import time
from pathlib import Path

# Wikipedia API endpoint
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"

def fetch_wikipedia_page(player_name):
    """Fetch Wikipedia page content for a player."""
    params = {
        "action": "query",
        "format": "json",
        "titles": player_name,
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main"
    }
    
    try:
        response = requests.get(WIKIPEDIA_API, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        pages = data.get("query", {}).get("pages", {})
        if not pages:
            return None
            
        page = list(pages.values())[0]
        if "revisions" not in page:
            return None
            
        content = page["revisions"][0]["slots"]["main"]["*"]
        return content
    except Exception as e:
        print(f"Error fetching Wikipedia page for {player_name}: {e}")
        return None

def clean_wiki_text(text):
    """Clean Wikipedia markup from text."""
    if not text:
        return None
    # Remove wiki links [[text]] or [[text|display]]
    text = re.sub(r'\[\[([^\]]+)\]\]', r'\1', text)
    text = re.sub(r'\|[^\]]+', '', text)
    # Remove refs
    text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
    # Remove other markup
    text = re.sub(r'{{.*?}}', '', text, flags=re.DOTALL)
    text = text.strip().rstrip('}}').strip()
    return text

def extract_number(text):
    """Extract first number from text, handling commas and parentheses."""
    if not text:
        return None
    # Remove everything in parentheses (like "(3 goals)")
    text = re.sub(r'\([^)]*\)', '', text)
    # Find first number (may have commas like 1,234)
    match = re.search(r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)', text.replace(',', ''))
    if match:
        try:
            return int(float(match.group(1)))
        except:
            return None
    return None

def parse_infobox(content):
    """Parse Wikipedia infobox to extract club information, goals, and appearances."""
    if not content:
        return None
    
    # Extract infobox (try different infobox types for football players)
    infobox_patterns = [
        r'\{\{Infobox football biography.*?\}\}',
        r'\{\{Infobox footballer.*?\}\}',
        r'\{\{Infobox.*football.*biography.*?\}\}'
    ]
    
    infobox = None
    for pattern in infobox_patterns:
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            infobox = match.group(0)
            break
    
    if not infobox:
        return None
    
    # Store original content for later use (e.g., international appearances)
    result = {
        'clubs': [],
        'goals': {},
        'appearances': {},
        '_full_content': content  # Store for later parsing
    }
    
    # Extract total goals (career goals)
    goal_patterns = [
        r'\|goals?\s*=\s*([^\|\n]+)',
        r'\|totalgoals?\s*=\s*([^\|\n]+)',
        r'\|careergoals?\s*=\s*([^\|\n]+)',
    ]
    for pattern in goal_patterns:
        match = re.search(pattern, infobox, re.IGNORECASE)
        if match:
            goals_text = clean_wiki_text(match.group(1))
            goals = extract_number(goals_text)
            if goals is not None:
                result['goals']['career'] = goals
                break
    
    # Extract club goals and international goals if available
    club_goals_match = re.search(r'\|clubgoals?\s*=\s*([^\|\n]+)', infobox, re.IGNORECASE)
    if club_goals_match:
        club_goals_text = clean_wiki_text(club_goals_match.group(1))
        club_goals = extract_number(club_goals_text)
        if club_goals is not None:
            result['goals']['club'] = club_goals
    
    intl_goals_match = re.search(r'\|nationalgoals?\s*=\s*([^\|\n]+)', infobox, re.IGNORECASE)
    if intl_goals_match:
        intl_goals_text = clean_wiki_text(intl_goals_match.group(1))
        intl_goals = extract_number(intl_goals_text)
        if intl_goals is not None:
            result['goals']['international'] = intl_goals
    
    # Extract appearances (career total)
    apps_patterns = [
        r'\|caps?\s*=\s*([^\|\n]+)',
        r'\|appearances?\s*=\s*([^\|\n]+)',
        r'\|totalcaps?\s*=\s*([^\|\n]+)',
        r'\|totalappearances?\s*=\s*([^\|\n]+)',
    ]
    for pattern in apps_patterns:
        match = re.search(pattern, infobox, re.IGNORECASE)
        if match:
            apps_text = clean_wiki_text(match.group(1))
            apps = extract_number(apps_text)
            if apps is not None:
                result['appearances']['career'] = apps
                break
    
    # Extract club appearances
    club_apps_patterns = [
        r'\|clubcaps?\s*=\s*([^\|\n]+)',
        r'\|clubappearances?\s*=\s*([^\|\n]+)',
    ]
    for pattern in club_apps_patterns:
        club_apps_match = re.search(pattern, infobox, re.IGNORECASE)
        if club_apps_match:
            club_apps_text = clean_wiki_text(club_apps_match.group(1))
            club_apps = extract_number(club_apps_text)
            if club_apps is not None:
                result['appearances']['club'] = club_apps
                break
    
    # Extract clubs - Pattern to match club entries: years and clubs (multiple variations)
    patterns = [
        r'\|years(\d+)\s*=\s*([^\|\n]+?)\s*\|clubs\1\s*=\s*([^\|\n]+)',
        r'\|clubs(\d+)\s*=\s*([^\|\n]+?)\s*\|years\1\s*=\s*([^\|\n]+)',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, infobox)
        for match in matches:
            if len(match) == 3:
                # Handle both orderings
                if match[0].isdigit():  # years first
                    match_num, years, club = match
                else:  # clubs first
                    match_num, club, years = match
                
                # Clean up the club name
                club_name = clean_wiki_text(club)
                if not club_name:
                    continue
                
                # Parse years (could be 2010–2014, 2010-present, 2010-2014, etc.)
                years = years.strip()
                year_patterns = [
                    r'(\d{4})\s*[–-]\s*(\d{4}|present|Present)',
                    r'(\d{4})\s*to\s*(\d{4}|present|Present)',
                ]
                
                for year_pattern in year_patterns:
                    year_match = re.match(year_pattern, years)
                    if year_match:
                        start_year = year_match.group(1)
                        end_year = year_match.group(2).lower()
                        if end_year == 'present':
                            result['clubs'].append({
                                'name': club_name,
                                'start': start_year,
                                'end': 'present'
                            })
                        elif end_year.isdigit():
                            result['clubs'].append({
                                'name': club_name,
                                'start': start_year,
                                'end': end_year
                            })
                        break
    
    # Only return if we found at least clubs, goals, or appearances (ignore _full_content in check)
    has_data = bool(result['clubs'] or result['goals'] or result['appearances'])
    if has_data:
        return result
    return None

def search_wikipedia_player(player_name):
    """Search for player Wikipedia page by name."""
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": player_name,
        "srlimit": 1
    }
    
    try:
        response = requests.get(WIKIPEDIA_API, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        search_results = data.get("query", {}).get("search", [])
        if search_results:
            return search_results[0]["title"]
        return None
    except Exception as e:
        print(f"Error searching Wikipedia for {player_name}: {e}")
        return None

def update_player_data(player_name, csv_path):
    """Update a single player's data from Wikipedia."""
    print(f"\nProcessing {player_name}...")
    
    # Search for the player's Wikipedia page
    wiki_title = search_wikipedia_player(player_name)
    if not wiki_title:
        print(f"  ❌ Could not find Wikipedia page for {player_name}")
        return None
    
    print(f"  ✅ Found Wikipedia page: {wiki_title}")
    
    # Fetch the page content
    content = fetch_wikipedia_page(wiki_title)
    if not content:
        print(f"  ❌ Could not fetch content for {wiki_title}")
        return None
    
    # Parse data from infobox
    data = parse_infobox(content)
    if not data:
        print(f"  ⚠️  Could not parse data from infobox")
        return None
    
    result = {}
    
    # Format clubs
    if data.get('clubs'):
        formatted_clubs = []
        for club in data['clubs']:
            end = club['end'] if club['end'] != 'present' else 'present'
            formatted_clubs.append(f"{club['name']} ({club['start']}-{end})")
        result['clubs_with_years'] = ', '.join(formatted_clubs)
        print(f"  ✅ Found {len(data['clubs'])} clubs")
    
    # Update goals
    if data.get('goals'):
        goals = data['goals']
        if 'career' in goals:
            result['career_goals'] = str(goals['career'])
            print(f"  ✅ Career goals: {goals['career']}")
        if 'club' in goals:
            result['club_goals'] = str(goals['club'])
            print(f"  ✅ Club goals: {goals['club']}")
        if 'international' in goals:
            result['international_goals'] = str(goals['international'])
            print(f"  ✅ International goals: {goals['international']}")
    
    # Update appearances
    if data.get('appearances'):
        apps = data['appearances']
        if 'career' in apps:
            result['career_appearances'] = str(apps['career'])
            print(f"  ✅ Career appearances: {apps['career']}")
        if 'club' in apps:
            result['club_appearances'] = str(apps['club'])
            print(f"  ✅ Club appearances: {apps['club']}")
        
        # Try to extract international appearances if available (from full content)
        full_content = data.get('_full_content', '')
        if full_content:
            intl_apps_match = re.search(r'\|nationalcaps?\s*=\s*([^\|\n]+)', full_content, re.IGNORECASE)
            if intl_apps_match:
                intl_apps_text = clean_wiki_text(intl_apps_match.group(1))
                intl_apps = extract_number(intl_apps_text)
                if intl_apps is not None:
                    result['international_appearances'] = str(intl_apps)
                    print(f"  ✅ International appearances: {intl_apps}")
    
    return result if result else None

def main():
    """Main function to update all players in CSV."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_path = project_root / "public" / "data" / "players.csv"
    
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        return 1
    
    # Read existing CSV
    players = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        players = list(reader)
    
    print(f"Found {len(players)} players in CSV")
    print("\nStarting Wikipedia data update...")
    print("=" * 50)
    
    updated_count = 0
    failed_count = 0
    
    for player in players:
        player_name = player['name']
        updates = update_player_data(player_name, csv_path)
        
        if updates:
            # Update all fields that were found
            for key, value in updates.items():
                # Add new columns if they don't exist (for appearances)
                if key not in player:
                    # We'll add these columns when writing
                    pass
                # Only update if value exists and is different
                if value and (key not in player or value != player.get(key, '')):
                    player[key] = value
            updated_count += 1
        else:
            failed_count += 1
        
        # Be respectful - add delay between requests
        time.sleep(1)
    
    if updated_count > 0:
        # Determine all possible fieldnames (including new ones like appearances)
        all_fieldnames = set(players[0].keys())
        for player in players:
            all_fieldnames.update(player.keys())
        
        # Order fieldnames logically
        standard_order = [
            'name', 'country_provenance', 'national_team',
            'career_goals', 'career_assists', 'career_appearances',
            'club_goals', 'club_assists', 'club_appearances',
            'international_goals', 'international_assists', 'international_appearances',
            'clubs_with_years'
        ]
        
        # Build ordered fieldnames list
        ordered_fieldnames = []
        for field in standard_order:
            if field in all_fieldnames:
                ordered_fieldnames.append(field)
        # Add any remaining fields
        for field in sorted(all_fieldnames):
            if field not in ordered_fieldnames:
                ordered_fieldnames.append(field)
        
        # Write updated CSV
        with open(csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=ordered_fieldnames)
            writer.writeheader()
            writer.writerows(players)
        
        print(f"\n{'=' * 50}")
        print(f"✅ Updated {updated_count} players")
        if failed_count > 0:
            print(f"⚠️  Could not update {failed_count} players (manual check may be needed)")
        print(f"CSV file saved to {csv_path}")
        return 0
    else:
        print("\n⚠️  No players were updated. This could mean:")
        print("   - Wikipedia pages not found")
        print("   - Infobox format not recognized")
        print("   - No changes detected")
        return 1

if __name__ == "__main__":
    exit(main())

