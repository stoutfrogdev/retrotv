# Changelog

## [Unreleased]

### Added - November 2025

#### Improved Commercial System
- **Multiple commercials per break** - Each break now contains several individual commercials
- **Variable-length commercial support** - Handles 15s, 30s, 60s commercials automatically
- **Smart commercial selection** - Avoids repeating the same commercial within a break
- **Minimum duration guarantee** - Ensures at least 2 minutes (configurable) of commercials
- **Seamless transitions** - Eliminated lag between shows and commercials
- **Prefetching** - Loads next content info 3 seconds before current ends
- **Entry ID tracking** - Better change detection for immediate switching

**Benefits:**
- More authentic TV experience with multiple ads per break
- No black screens or pauses between content
- Flexible commercial library (any video length works)
- Break duration can run slightly over minimum (like real TV)

**Technical Changes:**
- `createCommercialBreak()` returns array of entries instead of single entry
- Frontend tracks `currentEntryId` for change detection
- Reduced sync drift tolerance to 3 seconds
- Added `ontimeupdate` handler for prefetching

#### Year-Agnostic Scheduling System
- **Schedules now work indefinitely** without needing regeneration each year
- Start/end times stored as `MM-DD HH:mm:ss` format instead of full ISO timestamps
- Added `dayOfYear`, `monthDay`, and `timeOfDay` fields to schedule entries
- PlayerService automatically reconstructs dates using current year on load
- Seasonal content automatically aligns with current calendar year
- **Breaking Change**: Old schedule files must be regenerated

**Benefits:**
- Set it and forget it - generate once, use forever
- Smaller schedule file sizes
- Automatic seasonal content rotation year after year

**Migration:**
```bash
# Delete old schedules
rm schedules/*.json

# Generate new year-agnostic schedules
npm run generate-schedule
```

#### TVDB Integration (Optional)
- Added automatic TV show metadata fetching from TheTVDB.com
- Retrieves friendly series names and episode titles
- Includes episode descriptions and original air dates
- Built-in caching to minimize API calls
- Fully optional - works without API key

**New Features:**
- `TVDBService` class for API communication
- Automatic metadata lookup during media scan
- Token management with 30-day validity
- Graceful fallback to filename parsing

**New Fields in MediaFile:**
- `seriesName` - Official series name from TVDB
- `episodeTitle` - Episode title
- `overview` - Episode description
- `airDate` - Original air date
- `tvdbId` - TVDB series ID

**Setup:**
1. Get free API key from https://thetvdb.com/api-information
2. Add to `.env`: `TVDB_API_KEY=your_key_here`
3. Run `npm run scan-media`

**Example Output:**
```
✓ Family Matters - S01E01: The Mama Who Came to Dinner
```

### Changed

#### Configuration System
- All path settings now configurable via `.env` file
- Added `configLoader` utility to merge `.env` with `config.json`
- Environment variables override JSON configuration
- `SCHEDULE_PATH` now fully customizable

**New Environment Variables:**
```bash
MEDIA_PATH=/mnt/media
SCHEDULE_PATH=./schedules      # NEW: Customizable schedule location
TVDB_API_KEY=                  # NEW: Optional TVDB integration
```

#### Media Scanner
- Integrated TVDBService for metadata enrichment
- Enhanced console output with TVDB status
- Better error handling for file processing
- Added metadata logging for TV shows

#### Schedule Generator
- Refactored to create year-agnostic schedules
- Added `getDayOfYear` from date-fns
- Modified serialization to store relative dates
- Improved schedule file format

#### Player Service
- Updated to load and reconstruct year-agnostic schedules
- Handles midnight crossover correctly
- Logs current year on schedule load
- Better date parsing with fallback support

### Dependencies

**Added:**
- `axios` - HTTP client for TVDB API
- `node-tvdb` - TVDB API wrapper
- `dotenv` - Environment variable management

**Already included:**
- `date-fns` - Date manipulation (enhanced usage)

### Documentation

**New Files:**
- `docs/TVDB_INTEGRATION.md` - Complete TVDB setup guide
- `docs/YEAR_AGNOSTIC_SCHEDULES.md` - Technical documentation on scheduling system
- `QUICKSTART.md` - Quick setup guide
- `CONFIGURATION.md` - Configuration system documentation
- `CHANGELOG.md` - This file

**Updated:**
- `README.md` - Added TVDB and year-agnostic features
- `.env.example` - Added TVDB_API_KEY
- `raspberry-pi/SETUP.md` - Updated with .env configuration

### Technical Details

#### Type Changes
```typescript
// MediaFile - Added TVDB fields
interface MediaFile {
  // ... existing fields
  seriesName?: string;
  episodeTitle?: string;
  overview?: string;
  airDate?: string;
  tvdbId?: number;
}

// ScheduleEntry - Added year-agnostic fields
interface ScheduleEntry {
  // ... existing fields
  dayOfYear?: number;
  monthDay?: string;
  timeOfDay?: string;
}
```

#### File Format Changes

**Old Schedule Format:**
```json
{
  "startTime": "2025-10-01T14:30:00.000Z",
  "endTime": "2025-10-01T15:00:00.000Z"
}
```

**New Schedule Format:**
```json
{
  "startTime": "10-01 14:30:00",
  "endTime": "10-01 15:00:00",
  "dayOfYear": 274,
  "monthDay": "10-01",
  "timeOfDay": "14:30:00"
}
```

### Breaking Changes

⚠️ **Schedule files must be regenerated**

Old schedule files (with full ISO timestamps) will not work correctly with the new system. Follow the migration steps:

1. Back up your media library metadata (optional): `cp -r media-library media-library.bak`
2. Delete old schedules: `rm schedules/*.json`
3. Regenerate schedules: `npm run generate-schedule`

**Note:** Media library files (`media-library/content.json`) do not need to be regenerated unless you want TVDB metadata.

### Migration Guide

#### For Existing Users

1. **Update codebase:**
   ```bash
   git pull
   npm install
   npm run build
   ```

2. **Update .env file:**
   ```bash
   cp .env.example .env.new
   # Copy your settings from old .env
   # Add TVDB_API_KEY if desired
   mv .env.new .env
   ```

3. **Regenerate schedules:**
   ```bash
   rm schedules/*.json
   npm run generate-schedule
   ```

4. **(Optional) Re-scan for TVDB metadata:**
   ```bash
   rm media-library/content.json
   npm run scan-media
   ```

5. **Restart server:**
   ```bash
   npm start
   ```

#### For New Users

Follow the standard setup in `QUICKSTART.md` - no migration needed!

### Known Issues

None at this time.

### Future Enhancements

- [ ] Poster/artwork downloads from TVDB
- [ ] Actor and genre information
- [ ] Manual schedule override system
- [ ] Web-based schedule editor
- [ ] Multi-timezone support
- [ ] DST handling improvements

---

## [1.0.0] - Initial Release

- 6 dedicated channels (80s/90s TV, Music, Movies)
- Year-long scheduling system
- Seasonal content distribution
- Commercial break insertion
- Retro-styled web interface
- Raspberry Pi deployment support
- Express-based REST API
- Synchronized video playback
