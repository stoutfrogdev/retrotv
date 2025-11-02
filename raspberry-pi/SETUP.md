# Raspberry Pi Setup Guide

This guide will help you set up RetroTV on a Raspberry Pi.

## Prerequisites

- Raspberry Pi 4 (4GB or 8GB RAM recommended)
- Raspberry Pi OS (64-bit recommended)
- External hard drive with video files
- Display connected via HDMI

## Step 1: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Step 2: Install FFmpeg

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

## Step 3: Install Chromium

```bash
sudo apt-get install -y chromium-browser
```

## Step 4: Mount External Hard Drive

1. Connect your external hard drive
2. Find the drive:
```bash
lsblk
```

3. Create mount point:
```bash
sudo mkdir -p /mnt/media
```

4. Mount the drive (replace `/dev/sda1` with your drive):
```bash
sudo mount /dev/sda1 /mnt/media
```

5. Make it permanent by adding to `/etc/fstab`:
```bash
sudo nano /etc/fstab
```

Add this line (replace with your drive's UUID):
```
UUID=your-drive-uuid /mnt/media auto defaults,nofail 0 0
```

Find UUID with: `sudo blkid`

## Step 5: Organize Your Media Files

Your media directory structure should look like this:

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

### Naming Conventions

- **TV Shows**: `ShowName.S01E01.mp4` or `ShowName.1x01.mp4`
- **Seasonal Content**: Include keywords in filename:
  - Halloween: `ShowName.Halloween.Special.mp4`
  - Christmas: `ShowName.Christmas.Episode.mp4`
- **Movies**: `MovieName.Year.mp4`

## Step 6: Install RetroTV

```bash
cd /home/pi
git clone <your-repo-url> retrotv
cd retrotv
npm install
npm run build
```

## Step 7: Configure RetroTV

1. Create environment configuration:
```bash
cp .env.example .env
```

2. Edit `.env` file:
```bash
nano .env
```

3. Update the paths:
```bash
MEDIA_PATH=/mnt/media
SCHEDULE_PATH=/home/pi/retrotv/schedules
PORT=3000
DEFAULT_CHANNEL=80s-tv
COMMERCIAL_INTERVAL=15
COMMERCIAL_DURATION=2
```

> Note: The `SCHEDULE_PATH` should point to a writable location. Using a path in your home directory is recommended for easier management.

## Step 8: Scan Media and Generate Schedules

```bash
# Scan all media files (this may take a while)
npm run scan-media

# Generate year-long schedules for all channels
npm run generate-schedule
```

## Step 9: Test the Server

```bash
npm start
```

Open a browser and navigate to `http://localhost:3000` to test.

## Step 10: Set Up Autostart

### Option A: Using Systemd (Recommended)

1. Copy the service file:
```bash
sudo cp raspberry-pi/retrotv.service /etc/systemd/system/
```

2. Enable and start the service:
```bash
sudo systemctl enable retrotv
sudo systemctl start retrotv
```

3. Check status:
```bash
sudo systemctl status retrotv
```

### Option B: Using Autostart Script

1. Make the script executable:
```bash
chmod +x raspberry-pi/autostart.sh
```

2. Add to autostart:
```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/retrotv.desktop
```

Add this content:
```
[Desktop Entry]
Type=Application
Name=RetroTV
Exec=/home/pi/retrotv/raspberry-pi/autostart.sh
```

## Step 11: Disable Screen Blanking

Edit LXDE autostart:
```bash
nano ~/.config/lxsession/LXDE-pi/autostart
```

Add these lines:
```
@xset s off
@xset -dpms
@xset s noblank
```

## Step 12: Reboot

```bash
sudo reboot
```

After reboot, the system should automatically:
1. Start the RetroTV server
2. Launch Chrome in kiosk mode
3. Begin playing the 80s TV channel

## Troubleshooting

### Check Server Logs
```bash
sudo journalctl -u retrotv -f
```

### Check if Server is Running
```bash
curl http://localhost:3000/api/health
```

### Restart Service
```bash
sudo systemctl restart retrotv
```

### View Media Scan Results
```bash
cat media-library/content.json
```

## Performance Tips

1. Use H.264 encoded MP4 files for best compatibility
2. Consider transcoding large files to reduce CPU usage
3. Monitor temperature: `vcgencmd measure_temp`
4. Ensure adequate cooling for 24/7 operation
5. Use a quality power supply (3A minimum)

## Maintenance

### Update Schedules Annually
```bash
cd /home/pi/retrotv
npm run generate-schedule
sudo systemctl restart retrotv
```

### Add New Content
1. Add files to appropriate directories
2. Re-run: `npm run scan-media`
3. Re-run: `npm run generate-schedule`
4. Restart service

## Remote Access

To access RetroTV from other devices on your network:
1. Find Raspberry Pi IP: `hostname -I`
2. Access from other devices: `http://<raspberry-pi-ip>:3000`
