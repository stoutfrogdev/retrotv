# Commercial System

RetroTV includes an authentic commercial break system that mimics traditional broadcast television.

## Features

✅ **Variable-Length Commercials**
- Supports commercials of any length (15s, 30s, 60s, etc.)
- Automatically combines multiple commercials to fill break time
- Ensures at least minimum duration is met

✅ **Smart Commercial Selection**
- Avoids repeating the same commercial in one break
- Randomly selects from decade-appropriate commercials
- Allows reuse only when necessary

✅ **Seamless Transitions**
- No lag between shows and commercials
- Automatic content switching
- Prefetching for smooth playback

## How It Works

### Commercial Break Generation

When creating schedules, the system:

1. **Checks Timing**: Every 15 minutes (configurable)
2. **Selects Commercials**: Randomly picks commercials until minimum duration is met
3. **Creates Entries**: Each commercial gets its own schedule entry
4. **Chains Together**: Multiple commercials form one break

### Example Break

**Configuration:**
- `COMMERCIAL_INTERVAL=15` (commercial break every 15 minutes)
- `COMMERCIAL_DURATION=2` (minimum 2 minutes of commercials)

**Possible Commercial Break:**
```
14:45 - 14:45:30  Commercial 1 (30 seconds)
14:45:30 - 14:46:30  Commercial 2 (60 seconds)
14:46:30 - 14:47:00  Commercial 3 (30 seconds)
14:47:00 - 14:48:00  Commercial 4 (60 seconds)
Total: 3 minutes (exceeds 2-minute minimum ✓)
```

### Algorithm

```typescript
function createCommercialBreak(minDuration) {
  const commercials = [];
  let totalDuration = 0;
  const used = new Set();
  
  while (totalDuration < minDuration) {
    // Pick random commercial not used in this break
    const commercial = selectUnused(used);
    commercials.push(commercial);
    totalDuration += commercial.duration;
    used.add(commercial);
  }
  
  return commercials;
}
```

## Configuration

### Environment Variables

In `.env`:

```bash
# Minutes between commercial breaks (default: 15)
COMMERCIAL_INTERVAL=15

# Minimum minutes of commercials per break (default: 2)
COMMERCIAL_DURATION=2
```

### In config.json

```json
{
  "commercialInterval": 15,
  "commercialDuration": 2
}
```

**Note:** `.env` overrides `config.json`

## Commercial File Organization

```
/mnt/media/
├── 80s/
│   └── commercials/
│       ├── pepsi-30s.mp4
│       ├── nike-60s.mp4
│       ├── mcdonalds-45s.mp4
│       └── ...
└── 90s/
    └── commercials/
        ├── reebok-30s.mp4
        ├── surge-60s.mp4
        └── ...
```

### File Naming

No specific naming required, but helpful to include duration:
- `product-30s.mp4` (30 second commercial)
- `product-60s.mp4` (60 second commercial)

## Commercial Matching

Commercials are matched by decade:
- **80s channels** (80s TV, Music, Movies) → `80s/commercials/`
- **90s channels** (90s TV, Music, Movies) → `90s/commercials/`

## Break Duration Logic

### Minimum Duration

The system ensures **at least** the configured duration:

**Config:** `COMMERCIAL_DURATION=2` (2 minutes)

**Possible outcomes:**
- ✅ 2:00 - Exactly 2 minutes
- ✅ 2:15 - 2 minutes 15 seconds (acceptable)
- ✅ 2:30 - 2 minutes 30 seconds (acceptable)
- ❌ 1:45 - Less than 2 minutes (will add another commercial)

### Why Overrun is Acceptable

Real broadcast TV doesn't have perfectly timed commercial breaks either. A 2-minute break often runs 2-3 minutes depending on commercial lengths.

### Maximum Commercials

Safety limit: **10 commercials per break**

This prevents infinite loops if something goes wrong with commercial selection.

## Playback Behavior

### Client-Side Transitions

The web player handles transitions:

1. **Video Ends**: Immediately requests next content
2. **Prefetching**: Loads next content info 3 seconds before end
3. **Entry Tracking**: Monitors current content ID
4. **Auto-Switch**: Detects schedule changes every 30 seconds

### Lag Prevention

**Features that prevent lag:**

- Pre-fetching next content metadata
- Entry ID change detection
- Reduced sync drift tolerance (3 seconds)
- `onended` event for immediate transitions

### Server Response

Server provides:
- Current schedule entry
- Seek position for sync
- Entry ID for change detection

## Troubleshooting

### Long Gaps Between Content

**Symptom:** Black screen or pause between show and commercial

**Causes:**
1. Network latency
2. Large video files
3. Client performance

**Solutions:**
```bash
# Check server logs
npm start

# Check browser console
# Look for: "Video ended, loading next content..."
```

### Commercials Too Short

**Symptom:** Commercial breaks less than 2 minutes

**Check:**
```bash
# Verify commercial files exist
ls /mnt/media/80s/commercials/
ls /mnt/media/90s/commercials/

# Check commercial durations
npm run scan-media
# Look in media-library/commercials.json
```

### Repeated Commercials

**Expected behavior:** Same commercial may repeat in different breaks

**Unexpected:** Same commercial plays twice in one break

**Solution:** Regenerate schedules:
```bash
npm run generate-schedule
```

### Missing Commercials

**Symptom:** Shows play without commercial breaks

**Check:**
1. Commercial files exist in correct folders
2. Files were scanned: Check `media-library/commercials.json`
3. Schedule includes commercials: Check `schedules/80s-tv.json`

**Fix:**
```bash
# Re-scan commercials
npm run scan-media

# Regenerate schedules
npm run generate-schedule

# Restart server
npm start
```

## Schedule Inspection

### View Commercial Breaks

Check generated schedule:

```bash
cat schedules/80s-tv.json | grep -A 5 "isCommercial.*true"
```

### Commercial Break Stats

During schedule generation, watch for:

```
Commercial break: 4 ads, 2 minutes
Commercial break: 5 ads, 3 minutes
```

This shows how many commercials were added to each break.

## Performance

### Impact on Playback

- **Negligible**: Commercials are treated like regular content
- **No extra buffering**: Same video streaming mechanism
- **Smooth transitions**: Pre-fetching minimizes wait time

### Schedule Size

More commercials = larger schedule files:
- 1 commercial per break: ~4KB per day
- 5 commercials per break: ~8KB per day
- Insignificant for modern systems

## Best Practices

### Commercial Collection

1. **Variety**: Aim for 20+ different commercials per decade
2. **Quality**: Use consistent video quality (720p recommended)
3. **Length**: Mix of 15s, 30s, and 60s commercials works well
4. **Encoding**: Use H.264/AAC in MP4 containers

### Timing Configuration

**Traditional TV:**
- Prime time: 4-5 minutes of commercials per 15 minutes
- Daytime: 3-4 minutes per 15 minutes

**RetroTV Default:**
- 2 minutes per 15 minutes (13% commercial time)
- More authentic: Increase to 3-4 minutes

**Configuration examples:**

```bash
# Light commercial load (13%)
COMMERCIAL_INTERVAL=15
COMMERCIAL_DURATION=2

# Medium commercial load (20%)
COMMERCIAL_INTERVAL=15
COMMERCIAL_DURATION=3

# Heavy commercial load (traditional TV, 27%)
COMMERCIAL_INTERVAL=15
COMMERCIAL_DURATION=4
```

### File Organization

```
commercials/
├── food/
│   ├── mcdonalds-80s-30s.mp4
│   └── pizzahut-80s-60s.mp4
├── toys/
│   ├── transformers-80s-30s.mp4
│   └── barbie-80s-45s.mp4
└── tech/
    ├── nintendo-80s-60s.mp4
    └── sony-walkman-80s-30s.mp4
```

Benefits:
- Easier to manage
- Can add category-based scheduling (future feature)
- Organized archive

## Future Enhancements

Planned improvements:
- [ ] Category-based commercial selection
- [ ] Time-of-day commercial targeting
- [ ] Frequency capping (limit how often a commercial plays)
- [ ] Priority/weight system for certain commercials
- [ ] Commercial analytics (track what's been played)

## Technical Details

### Data Structure

Each commercial break creates multiple schedule entries:

```json
{
  "entries": [
    {
      "id": "80s-tv-12345-abc",
      "startTime": "10-01 14:45:00",
      "endTime": "10-01 14:45:30",
      "isCommercial": true,
      "mediaFile": {
        "filename": "pepsi-30s.mp4",
        "duration": 30
      }
    },
    {
      "id": "80s-tv-12346-def",
      "startTime": "10-01 14:45:30",
      "endTime": "10-01 14:46:30",
      "isCommercial": true,
      "mediaFile": {
        "filename": "nike-60s.mp4",
        "duration": 60
      }
    }
  ]
}
```

### API Response

When player requests sync:

```json
{
  "entry": {
    "id": "80s-tv-12345-abc",
    "title": "pepsi-30s.mp4",
    "isCommercial": true
  },
  "seekPosition": 15,
  "serverTime": "2025-11-02T21:00:00Z"
}
```

## Summary

The commercial system provides an authentic retro TV experience by:
- Handling variable-length commercials intelligently
- Ensuring proper break duration
- Providing smooth transitions
- Matching commercials to decades

It's fully configurable and works seamlessly with the rest of RetroTV!
