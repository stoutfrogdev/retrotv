# RetroTV Quick Start Guide

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your paths
nano .env
```

Update these values in `.env`:
```bash
MEDIA_PATH=/mnt/media              # Path to your video files
SCHEDULE_PATH=./schedules          # Where to save schedules
PORT=3000                          # Server port
DEFAULT_CHANNEL=80s-tv             # Channel to load on startup
COMMERCIAL_INTERVAL=15             # Minutes between commercials
COMMERCIAL_DURATION=2              # Length of commercial blocks
TVDB_API_KEY=                      # Optional: For TV show metadata
```

**Optional: TVDB Integration**

For enhanced TV show metadata (episode titles, descriptions), get a free API key:
1. Visit [thetvdb.com](https://thetvdb.com) and create an account
2. Go to [API Information](https://thetvdb.com/api-information)
3. Create an API key and add it to `.env`

See `docs/TVDB_INTEGRATION.md` for details.

### 3. Organize Your Media

Create this directory structure at your `MEDIA_PATH`:

```
/mnt/media/
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

**File Naming Tips:**
- TV Shows: `ShowName.S01E01.mp4` or `ShowName.1x01.mp4`
- Halloween: Include "halloween" or "horror" in filename
- Christmas: Include "christmas" or "xmas" in filename
- Movies: `MovieTitle.1989.mp4`

### 4. Build the Project
```bash
npm run build
```

### 5. Scan Your Media Library
```bash
npm run scan-media
```

This will:
- Scan all video files in your media directories
- Extract duration and metadata using FFmpeg
- Save results to `media-library/` directory

### 6. Generate Schedules
```bash
npm run generate-schedule
```

This will:
- Create year-long 24/7 schedules for all 6 channels
- Insert commercials every 15 minutes
- Prioritize seasonal content during appropriate periods
- Save schedules to your `SCHEDULE_PATH` directory

### 7. Start the Server
```bash
npm start
```

### 8. Access RetroTV
Open your browser to: `http://localhost:3000`

The 80s TV channel will start playing automatically!

## Development Mode

For development with auto-reload:
```bash
npm run dev
```

## Troubleshooting

### "Configuration file not found"
Make sure `config.json` exists in the project root.

### "No media files found"
- Verify `MEDIA_PATH` in `.env` is correct
- Ensure video files are in the correct subdirectories
- Check that FFmpeg is installed: `ffmpeg -version`

### "Schedule not found"
Run `npm run generate-schedule` to create schedules.

### Port already in use
Change `PORT` in `.env` to a different port number.

## Updating Configuration

After changing `.env`:
1. Restart the server
2. If media paths changed, re-run: `npm run scan-media`
3. If you want new schedules, re-run: `npm run generate-schedule`

## Next Steps

- See `README.md` for complete documentation
- See `raspberry-pi/SETUP.md` for Raspberry Pi deployment
- Edit `config.json` to customize channel definitions and seasonal content periods
