#!/bin/bash

# RetroTV Development Mode
# Starts the server and launches Chrome with autoplay enabled

echo "🎬 Starting RetroTV Development Mode..."
echo ""

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Server already running on port 3000"
    echo "   Kill it first with: kill \$(lsof -t -i:3000)"
    exit 1
fi

# Start the server in the background
echo "📺 Starting RetroTV server..."
npm start > /tmp/retrotv-dev.log 2>&1 &
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
        tail -20 /tmp/retrotv-dev.log
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
done

# Give it one more second to stabilize
sleep 1

# Launch Chrome with autoplay enabled
echo "🚀 Launching Chrome in fullscreen..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --autoplay-policy=no-user-gesture-required \
  --disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies \
  --unsafely-treat-insecure-origin-as-secure="http://localhost:3000" \
  --kiosk \
  --no-first-run \
  --no-default-browser-check \
  --disable-sync \
  --user-data-dir="/tmp/chrome-retrotv-dev-$RANDOM" \
  http://localhost:3000 &

CHROME_PID=$!

echo ""
echo "✨ RetroTV is running!"
echo "   Server PID: $SERVER_PID"
echo "   Chrome PID: $CHROME_PID"
echo ""
echo "📋 Logs: /tmp/retrotv-dev.log"
echo "🛑 To stop: Press Ctrl+C or run: kill $SERVER_PID $CHROME_PID"
echo ""

# Wait for Chrome to exit
wait $CHROME_PID

# When Chrome closes, kill the server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Development mode stopped"
