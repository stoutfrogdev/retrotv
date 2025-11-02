#!/bin/bash

# RetroTV Kiosk Mode (Production)
# Starts the server and launches Chromium in kiosk mode for Raspberry Pi

echo "🎬 Starting RetroTV in Kiosk Mode..."
echo ""

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Server already running on port 3000"
    echo "   Kill it first with: kill \$(lsof -t -i:3000)"
    exit 1
fi

# Start the server in the background
echo "📺 Starting RetroTV server..."
npm start > /tmp/retrotv.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Server is ready!"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "❌ Server failed to start. Check logs:"
        tail -20 /tmp/retrotv.log
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
done

# Give it one more second to stabilize
sleep 1

# Detect browser (Chromium on Raspberry Pi, Chrome on Mac for testing)
if command -v chromium-browser &> /dev/null; then
    BROWSER="chromium-browser"
elif [ -d "/Applications/Google Chrome.app" ]; then
    BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
    echo "❌ No suitable browser found"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Launch browser in kiosk mode
echo "🚀 Launching browser in kiosk mode..."
$BROWSER \
  --autoplay-policy=no-user-gesture-required \
  --disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies \
  --unsafely-treat-insecure-origin-as-secure="http://localhost:3000" \
  --kiosk \
  --no-first-run \
  --no-default-browser-check \
  --disable-sync \
  --disable-infobars \
  --disable-translate \
  --disable-session-crashed-bubble \
  --disable-component-update \
  --user-data-dir="/tmp/chrome-retrotv-kiosk-$RANDOM" \
  http://localhost:3000 &

BROWSER_PID=$!

echo ""
echo "✨ RetroTV is running in kiosk mode!"
echo "   Server PID: $SERVER_PID"
echo "   Browser PID: $BROWSER_PID"
echo ""
echo "📋 Logs: /tmp/retrotv.log"
echo "🛑 To stop: kill $SERVER_PID $BROWSER_PID"
echo ""

# Wait for browser to exit
wait $BROWSER_PID

# When browser closes, kill the server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Kiosk mode stopped"
