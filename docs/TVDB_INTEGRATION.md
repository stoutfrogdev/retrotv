# TVDB Integration Guide

RetroTV can automatically fetch TV show metadata from TheTVDB.com to provide friendly show names and episode titles instead of just filenames.

## Features

- Automatic series name lookup
- Episode title retrieval
- Episode descriptions
- Original air dates
- Caching to reduce API calls

## Setup

### 1. Get a TVDB API Key

1. Visit [TheTVDB.com](https://thetvdb.com)
2. Create a free account
3. Go to [API Information](https://thetvdb.com/api-information)
4. Create a new API key
5. Copy your API key

### 2. Configure RetroTV

Add your API key to `.env`:

```bash
TVDB_API_KEY=your_api_key_here
```

That's it! The integration is optional - if no API key is provided, RetroTV will use filename parsing only.

## How It Works

### During Media Scan

When you run `npm run scan-media`, RetroTV will:

1. Parse filenames to extract series name, season, and episode numbers
2. If TVDB integration is enabled:
   - Search TVDB for the series
   - Fetch the specific episode metadata
   - Cache the results
   - Add metadata to the media library

### Example Output

**Without TVDB:**
```
Family Matters.S01E01.mp4
```

**With TVDB:**
```
✓ Family Matters - S01E01: The Mama Who Came to Dinner
```

### Metadata Added

For each TV show episode, TVDB provides:

- `seriesName`: "Family Matters" (official name)
- `episodeTitle`: "The Mama Who Came to Dinner"
- `overview`: Episode description/summary
- `airDate`: Original broadcast date
- `tvdbId`: TVDB series ID for future lookups

## File Naming Requirements

For TVDB lookup to work, files must follow standard TV naming conventions:

**Supported formats:**
- `ShowName.S01E01.mp4` (recommended)
- `ShowName.1x01.mp4`
- `ShowName.Season 1.Episode 1.mp4`

**Examples:**
```
Saved by the Bell.S01E01.mkv
Full House.S03E12.mp4
The Fresh Prince of Bel-Air.1x05.avi
```

## Performance

### API Limits

TVDB has rate limits on their free API:
- Tokens are valid for 30 days
- Caching reduces duplicate requests
- Media scans may take longer with TVDB enabled

### Caching

- Metadata is cached during the scan process
- Cache is stored in `media-library/content.json`
- Re-scanning will use cached data unless you delete the file

### Recommendations

1. **Initial Scan**: Run once with TVDB enabled to populate metadata
2. **Incremental Updates**: Only rescan when adding new content
3. **Backup**: Keep a copy of `media-library/` to avoid re-fetching

## Troubleshooting

### "TVDB integration disabled"

This message appears when no API key is configured. RetroTV will work fine without TVDB - it just won't have the enhanced metadata.

### "No TVDB match found for: SeriesName"

Possible causes:
- Series name in filename doesn't match TVDB database
- Series not in TVDB database
- API connectivity issues

**Solution**: Check the series name on thetvdb.com and adjust your filename.

### "Failed to authenticate with TVDB"

Possible causes:
- Invalid API key
- Network connectivity issues
- TVDB API is down

**Solution**: 
1. Verify your API key in `.env`
2. Check internet connection
3. Visit thetvdb.com to verify service status

### Rate Limiting

If you're scanning a very large library (1000+ shows), you might hit rate limits.

**Solution**:
- Scan in batches (scan one decade at a time)
- Wait a few minutes between scans
- Consider upgrading to TVDB premium

## Without TVDB

RetroTV works perfectly fine without TVDB integration:
- Uses filename for display names
- Extracts season/episode numbers from filenames
- Faster scanning
- No external dependencies

## API Documentation

For advanced users, TVDB API documentation:
- [TVDB API v4 Docs](https://thetvdb.github.io/v4-api/)

## Privacy

- TVDB API calls include only series names and episode numbers
- No personal information is sent to TVDB
- All cached data is stored locally

## Future Enhancements

Planned features:
- Poster/artwork downloads
- Actor information
- Genre tagging
- Rating information
- Manual override system
