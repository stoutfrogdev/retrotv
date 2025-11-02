#!/bin/bash

# Development Chrome launcher for RetroTV
# This launches Chrome with flags to bypass autoplay restrictions

echo "Starting Chrome with autoplay enabled..."
echo "Make sure RetroTV server is running (npm start)"
echo ""

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --autoplay-policy=no-user-gesture-required \
  --disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies \
  --unsafely-treat-insecure-origin-as-secure="http://localhost:3000" \
  --start-fullscreen \
  http://localhost:3000
