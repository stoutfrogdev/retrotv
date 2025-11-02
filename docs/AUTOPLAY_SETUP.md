# Autoplay Setup Guide

Chrome has strict autoplay policies that prevent videos from playing without user interaction. RetroTV needs autoplay to work properly for the authentic TV experience.

## Solution

RetroTV uses **muted autoplay** which is allowed by Chrome. Users can unmute after playback starts.

## Features

✅ **Muted Autoplay** - Videos start muted automatically  
✅ **Volume Button** - Easy unmute with floating button (bottom-right corner)  
✅ **Fallback** - Click anywhere if autoplay fails  
✅ **Time Sync** - Videos seek to correct position automatically

## For Development (Mac/Local)

### Testing in Chrome

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open Chrome:**
   ```
   http://localhost:3000
   ```

3. **If autoplay doesn't work:**
   - Click anywhere on the page
   - Or click the volume button (🔇)

### Chrome Flags for Development

If you want unmuted autoplay during development:

1. Open Chrome: `chrome://flags`
2. Search for: `Autoplay policy`
3. Set to: `No user gesture is required`
4. Restart Chrome

**Or launch Chrome from command line:**

```bash
# Mac
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --autoplay-policy=no-user-gesture-required \
  http://localhost:3000

# Linux
google-chrome \
  --autoplay-policy=no-user-gesture-required \
  http://localhost:3000
```

## For Raspberry Pi (Production)

The autostart script includes all necessary flags:

```bash
chromium-browser \
  --kiosk \
  --autoplay-policy=no-user-gesture-required \
  --allow-autoplay \
  --no-user-gesture-required \
  --disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies \
  http://localhost:3000/?channel=80s-tv
```

### Setup Steps

1. **Follow Raspberry Pi setup:**
   See `raspberry-pi/SETUP.md`

2. **Autostart is configured automatically**

3. **On first boot:**
   - System starts muted
   - Click volume button (🔇) to unmute
   - Or use a USB remote/keyboard

4. **Volume persists** across reboots (Chrome remembers)

## How Video Seeking Works

### Broadcast-Style Playback

RetroTV syncs to the schedule like a real TV station:

**Example:**
```
Schedule: Show starts at 1:00 PM
Current Time: 1:02 PM
Result: Video seeks to 2 minutes in
```

### Technical Flow

1. **Client requests sync data**
   ```
   GET /api/channel/80s-tv/sync
   ```

2. **Server calculates position**
   ```javascript
   const elapsed = (now - startTime) / 1000; // seconds
   seekPosition = Math.floor(elapsed);
   ```

3. **Client seeks video**
   ```javascript
   video.currentTime = seekPosition; // e.g., 120 seconds
   ```

4. **Video plays from correct position**

### Logging

Check browser console:
```
Seeking to 120 seconds
Playback started successfully
```

## Troubleshooting

### Video Doesn't Start

**Symptom:** Black screen, no playback

**Solutions:**

1. **Check if muted:**
   - Videos must be muted for autoplay
   - Look for volume button (🔇)

2. **Click to play:**
   - Click anywhere on page
   - Or click volume button

3. **Check browser console:**
   ```
   F12 → Console tab
   Look for: "Autoplay error"
   ```

4. **Verify server is running:**
   ```bash
   curl http://localhost:3000/api/health
   ```

### Video Starts from Beginning

**Symptom:** Videos always start at 0:00 instead of mid-way

**Check:**

1. **Browser console for seek position:**
   ```
   Look for: "Seeking to X seconds"
   ```

2. **Server sync endpoint:**
   ```bash
   curl http://localhost:3000/api/channel/80s-tv/sync
   # Should show: "seekPosition": 120
   ```

3. **Regenerate schedules if needed:**
   ```bash
   npm run generate-schedule
   npm start
   ```

### Autoplay Fails Even When Muted

**On Raspberry Pi:**

1. **Check Chrome flags in autostart.sh:**
   ```bash
   cat raspberry-pi/autostart.sh
   # Verify --autoplay-policy flag is present
   ```

2. **Restart Raspberry Pi:**
   ```bash
   sudo reboot
   ```

**On Mac/Dev:**

1. **Try Chrome flags method above**

2. **Or accept the click-to-play behavior**
   - This is only needed once per session

### Audio Not Working After Unmute

**Symptom:** Volume button clicked but no sound

**Check:**

1. **System volume:**
   - Raspberry Pi: Check volume mixer
   - Mac: Check system preferences

2. **Video file has audio:**
   ```bash
   ffprobe your-video.mp4
   # Look for "Audio:" in output
   ```

3. **Browser audio not blocked:**
   - Check Chrome site settings
   - `Settings → Privacy → Site Settings → Sound`

## Best Practices

### For Raspberry Pi Deployment

1. **Test unmute on first boot**
   - After setup, click volume button
   - Verify audio plays
   - Chrome will remember this

2. **Use USB remote**
   - Small USB remote for volume control
   - Or wireless keyboard

3. **Auto-unmute on startup** (optional)
   - Add to autostart.sh:
   ```javascript
   // In app.js, add after page load:
   setTimeout(() => {
     document.getElementById('volumeBtn').click();
   }, 2000);
   ```

### For Public Display

If using in a public space:

1. **Keep muted by default**
   - Less intrusive
   - Prevents audio issues

2. **Or use audio output control**
   - Connect to speaker system
   - Use hardware volume control

## Development Testing

### Test Seek Functionality

```javascript
// In browser console:
fetch('/api/channel/80s-tv/sync')
  .then(r => r.json())
  .then(data => console.log('Seek position:', data.seekPosition));
```

### Simulate Different Times

```javascript
// Test what would play at 3 PM
const testTime = new Date();
testTime.setHours(15, 0, 0); // 3:00 PM
// Server uses current time, so restart server with adjusted system time
```

### Verify Schedule Times

```bash
# Check schedule file
cat schedules/80s-tv.json | grep -A 3 '"startTime"' | head -20
```

## Mobile/Tablet

For testing on mobile devices:

1. **Find your machine's IP:**
   ```bash
   # Mac
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Linux
   ip addr show | grep "inet " | grep -v 127.0.0.1
   ```

2. **Access from mobile:**
   ```
   http://YOUR_IP:3000
   ```

3. **Tap to start playback**
   - Mobile requires user gesture
   - Tap volume button or anywhere on screen

## Summary

- ✅ Videos start **muted** for reliable autoplay
- ✅ Click **volume button** (🔇) to unmute
- ✅ Videos **seek to correct position** automatically
- ✅ Raspberry Pi autostart includes all necessary **Chrome flags**
- ✅ **Fallback**: Click anywhere if autoplay fails

The system is designed to work reliably in production while following browser security policies!
