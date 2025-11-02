# Configuration Guide

RetroTV uses a combination of environment variables (`.env`) and JSON configuration (`config.json`) for maximum flexibility.

## Configuration Files

### `.env` - Environment Variables (Editable Paths)

The `.env` file contains paths and basic settings that are likely to differ between environments (development vs. production, different users, etc.).

**File location:** Project root

**Variables:**

```bash
# Path to media files (where your videos are stored)
MEDIA_PATH=/mnt/media

# Path to store generated schedules
# Can be relative (./schedules) or absolute (/home/pi/retrotv/schedules)
SCHEDULE_PATH=./schedules

# Port the web server runs on
PORT=3000

# Which channel loads by default (80s-tv, 80s-music, 80s-movies, 90s-tv, 90s-music, 90s-movies)
DEFAULT_CHANNEL=80s-tv

# Minutes between commercial breaks
COMMERCIAL_INTERVAL=15

# Length of commercial break in minutes
COMMERCIAL_DURATION=2
```

**Priority:** Environment variables override settings in `config.json`.

---

### `config.json` - Channel & Seasonal Configuration

The `config.json` file contains channel definitions and seasonal content settings. These typically don't change between environments.

**File location:** Project root

**Structure:**

```json
{
  "mediaPath": "/mnt/media",
  "schedulePath": "./schedules",
  "port": 3000,
  "defaultChannel": "80s-tv",
  "commercialInterval": 15,
  "commercialDuration": 2,
  "channels": [
    {
      "id": "80s-tv",
      "name": "80s TV",
      "decade": "80s",
      "type": "tv",
      "mediaFolder": "80s/tv"
    }
    // ... more channels
  ],
  "seasonalContent": {
    "halloween": {
      "start": "10-01",
      "end": "10-31",
      "weight": 3
    }
    // ... more seasonal periods
  }
}
```

**Note:** Values in `config.json` serve as defaults. They are overridden by `.env` variables if present.

---

## Configuration Hierarchy

1. **Environment Variables** (`.env`) - Highest priority
2. **JSON Configuration** (`config.json`) - Default values

### Example:

If `config.json` has:
```json
{
  "schedulePath": "./schedules",
  "port": 3000
}
```

And `.env` has:
```bash
SCHEDULE_PATH=/home/pi/retrotv/schedules
PORT=8080
```

The application will use:
- Schedule path: `/home/pi/retrotv/schedules` (from `.env`)
- Port: `8080` (from `.env`)

---

## Channel Configuration

Channels are defined in `config.json`:

```json
{
  "id": "80s-tv",           // Unique identifier
  "name": "80s TV",         // Display name
  "decade": "80s",          // Used to match commercials
  "type": "tv",             // Content type
  "mediaFolder": "80s/tv"   // Relative to MEDIA_PATH
}
```

**Media folders** are resolved as: `MEDIA_PATH + mediaFolder`

Example: If `MEDIA_PATH=/mnt/media` and `mediaFolder=80s/tv`, the full path is `/mnt/media/80s/tv`

---

## Seasonal Content Configuration

Define seasonal periods in `config.json`:

```json
"seasonalContent": {
  "halloween": {
    "start": "10-01",  // MM-DD format
    "end": "10-31",    // MM-DD format
    "weight": 3        // How much to prioritize (1 = normal, 3 = 70% of content)
  }
}
```

**How it works:**
- During the date range, content with matching `seasonalTag` is prioritized
- Weight of 3 means ~70% of scheduled content will be seasonal
- Files are tagged by detecting keywords in filenames (halloween, christmas, etc.)

**Supported seasonal tags:**
- `halloween` - Triggered by "halloween" or "horror" in filename
- `christmas` - Triggered by "christmas" or "xmas" in filename
- `thanksgiving` - Triggered by "thanksgiving" in filename
- `valentines` - Triggered by "valentine" in filename

---

## Directory Structure

Your media directory should follow this structure:

```
MEDIA_PATH/
├── 80s/
│   ├── tv/
│   ├── music/
│   ├── movies/
│   └── commercials/
└── 90s/
    ├── tv/
    ├── music/
    ├── movies/
    └── commercials/
```

**Commercials** are matched by decade:
- Files in `80s/commercials/` play on 80s channels
- Files in `90s/commercials/` play on 90s channels

---

## Best Practices

### Development Environment
```bash
# .env
MEDIA_PATH=./test-media
SCHEDULE_PATH=./schedules
PORT=3000
```

### Production (Raspberry Pi)
```bash
# .env
MEDIA_PATH=/mnt/media
SCHEDULE_PATH=/home/pi/retrotv/schedules
PORT=3000
```

### Tips
1. Use **relative paths** for portability (e.g., `./schedules`)
2. Use **absolute paths** for external drives (e.g., `/mnt/media`)
3. Keep `.env` out of version control (it's in `.gitignore`)
4. Share `.env.example` with your team as a template
5. Customize seasonal periods in `config.json` to match your content library

---

## Changing Configuration

### After changing `.env`:
```bash
# Restart the server
npm start
```

### After changing `config.json`:
```bash
# If you changed channel definitions, rescan media
npm run scan-media

# Regenerate schedules
npm run generate-schedule

# Restart server
npm start
```

---

## Troubleshooting

**Problem:** Changes to `.env` not taking effect

**Solution:** Restart the server. Environment variables are loaded on startup.

---

**Problem:** Schedules saved in wrong location

**Solution:** Check `SCHEDULE_PATH` in `.env` and ensure the directory is writable.

---

**Problem:** Videos not found

**Solution:** 
1. Verify `MEDIA_PATH` in `.env`
2. Check directory structure matches expected format
3. Run `npm run scan-media` to verify files are detected
