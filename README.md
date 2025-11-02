# RetroTV 📺

A nostalgic TV experience that brings back the magic of 80s and 90s television. Built for Raspberry Pi, RetroTV creates a continuous streaming experience with authentic commercials, seasonal programming, and 24/7 schedules.

## Features

- 🎬 **6 Dedicated Channels**
  - 80s TV, Music, and Movies
  - 90s TV, Music, and Movies
  
- 📅 **Year-Long Scheduling**
  - Automated 365-day schedules for each channel
  - 24/7 continuous programming
  - No repeats for extended periods

- 🎃 **Seasonal Content**
  - Halloween specials in October
  - Christmas programming in December
  - Thanksgiving and Valentine's content
  - Automatic seasonal rotation

- 📺 **Authentic Commercial Breaks**
  - Period-accurate commercials every 15 minutes
  - 2-minute commercial blocks
  - Decade-specific advertising

- 🎮 **Modern Interface**
  - Retro-styled web interface
  - Channel switching
  - Live schedule viewing
  - Responsive design

- 🔄 **Synchronized Playback**
  - True broadcast-style experience
  - All viewers see the same content
  - Automatic time synchronization

- 📺 **TVDB Integration** (Optional)
  - Automatic TV show metadata fetching
  - Friendly series and episode names
  - Episode descriptions and air dates

- ♻️ **Year-Agnostic Schedules**
  - Schedules repeat automatically every year
  - No need to regenerate for new years
  - Seasonal content adapts to current date

## Quick Start

### Prerequisites
- Node.js 18+
- FFmpeg
- Video files organized by decade and type

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd retrotv

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your paths:
```bash
MEDIA_PATH=/path/to/your/media
SCHEDULE_PATH=./schedules
PORT=3000
DEFAULT_CHANNEL=80s-tv
COMMERCIAL_INTERVAL=15
COMMERCIAL_DURATION=2
```

> Note: `config.json` contains channel definitions and seasonal content settings. Environment variables in `.env` override the paths and basic settings.

### Media Organization

```
/media/
├── 80s/
│   ├── tv/          # TV shows
│   ├── music/       # Music videos
│   ├── movies/      # Movies
│   └── commercials/ # Commercials
└── 90s/
    ├── tv/
    ├── music/
    ├── movies/
    └── commercials/
```

### File Naming

- **TV Shows**: `ShowName.S01E01.mp4`
- **Seasonal**: `ShowName.Halloween.Special.mp4`
- **Movies**: `MovieName.1989.mp4`

### Setup

```bash
# Scan your media library
npm run scan-media

# Generate year-long schedules
npm run generate-schedule

# Start the server
npm start
```

Open `http://localhost:3000` in your browser!

## Raspberry Pi Deployment

See [raspberry-pi/SETUP.md](raspberry-pi/SETUP.md) for complete Raspberry Pi setup instructions.

## API Endpoints

### Channels
- `GET /api/channels` - List all channels
- `GET /api/channel/:id/current` - Current playing content
- `GET /api/channel/:id/upcoming` - Upcoming schedule
- `GET /api/channel/:id/schedule` - Full day schedule

### Streaming
- `GET /api/channel/:id/stream` - Video stream
- `GET /api/channel/:id/sync` - Sync information

### System
- `GET /api/health` - Server health check

## Development

```bash
# Development mode with auto-reload
npm run dev

# Run linter
npm run lint

# Run tests
npm test
```

## Project Structure

```
retrotv/
├── src/
│   ├── types/              # TypeScript interfaces
│   ├── services/           # Core services
│   ├── utils/              # Utilities
│   ├── scripts/            # CLI scripts
│   ├── server.ts           # Express server
│   └── index.ts            # Entry point
├── public/                 # Frontend files
├── raspberry-pi/           # Pi deployment files
├── config.json             # Configuration
└── package.json
```

## License

MIT

---

**Note**: This project requires you to provide your own video content. RetroTV does not include any media files.
