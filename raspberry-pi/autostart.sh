#!/bin/bash

# RetroTV Autostart Script for Raspberry Pi
# This script should be added to autostart on Raspberry Pi OS

# Wait for system to be ready
sleep 10

# Start RetroTV server in the background
cd /home/pi/retrotv
npm start > /tmp/retrotv.log 2>&1 &

# Wait for server to be ready
sleep 5

# Start Chromium in kiosk mode on the default channel (80s TV)
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --autoplay-policy=no-user-gesture-required \
  --allow-autoplay \
  --no-user-gesture-required \
  --disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies \
  --start-fullscreen \
  http://localhost:3000/?channel=80s-tv &

# Disable screensaver and screen blanking
xset s off
xset s noblank
xset -dpms
