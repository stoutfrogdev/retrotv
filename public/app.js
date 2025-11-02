class RetroTVClient {
    constructor() {
        this.currentChannel = null;
        this.currentEntryId = null;
        this.videoPlayer = document.getElementById('videoPlayer');
        this.channelOverlay = document.getElementById('channelOverlay');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.debugPanel = document.getElementById('debugPanel');
        this.debugCurrent = document.getElementById('debugCurrent');
        this.debugSchedule = document.getElementById('debugSchedule');
        this.channelName = document.getElementById('channelName');
        this.nowPlaying = document.getElementById('nowPlaying');
        this.syncInterval = null;
        this.scheduleUpdateInterval = null;
        this.isDevMode = this.detectDevMode();
        this.inTechnicalDifficulties = false;
        this.technicalDifficultiesRetryTimer = null;
        
        this.init();
    }

    detectDevMode() {
        // Check URL parameter or hostname for dev mode
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('debug') === 'true' || 
               window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    }

    async init() {
        this.setupDebugPanel();
        this.setupFullscreen();
        await this.loadDefaultChannel();
        this.startSync();
    }
    
    setupDebugPanel() {
        if (this.isDevMode && this.debugPanel) {
            this.debugPanel.classList.add('visible');
            
            const toggleBtn = document.getElementById('debugToggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    this.debugPanel.classList.toggle('collapsed');
                });
            }
            
            // Set up audio monitoring
            this.setupAudioMonitoring();
        }
    }
    
    setupAudioMonitoring() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(this.videoPlayer);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            // Check audio level every second
            setInterval(() => {
                if (this.videoPlayer.paused || this.videoPlayer.ended) return;
                
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                
                // If audio level is consistently very low (< 1) for playing video, log warning
                if (average < 1 && this.videoPlayer.currentTime > 1) {
                    console.warn('No audio detected - possible silent video or audio issue');
                }
            }, 1000);
        } catch (error) {
            console.warn('Audio monitoring not available:', error);
        }
    }
    
    setupFullscreen() {
        // Request fullscreen on first user interaction
        const requestFullscreen = () => {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => {
                    console.log('Fullscreen request failed:', err);
                });
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
            document.removeEventListener('click', requestFullscreen);
        };
        
        document.addEventListener('click', requestFullscreen, { once: true });
    }

    async loadDefaultChannel() {
        const urlParams = new URLSearchParams(window.location.search);
        const channel = urlParams.get('channel') || '80s-tv';
        await this.changeChannel(channel);
    }

    async changeChannel(channelId) {
        if (this.currentChannel === channelId) return;

        this.showLoading(true);
        this.currentChannel = channelId;

        try {
            await this.loadChannelStream(channelId);
            this.showChannelOverlay(channelId);
            this.updateDebugPanel();
        } catch (error) {
            console.error('Error changing channel:', error);
            this.showLoading(false);
        }
    }

    async loadChannelStream(channelId) {
        try {
            // Get sync information
            const syncResponse = await fetch(`/api/channel/${channelId}/sync`);
            
            if (!syncResponse.ok) {
                console.error(`Sync endpoint returned ${syncResponse.status}`);
                // Retry after a short delay
                setTimeout(() => this.loadChannelStream(channelId), 1000);
                return;
            }
            
            const syncData = await syncResponse.json();
            
            if (!syncData || !syncData.entry) {
                console.error('Invalid sync data received');
                setTimeout(() => this.loadChannelStream(channelId), 1000);
                return;
            }
            
            // Store current entry ID for change detection
            this.currentEntryId = syncData.entry.id;
            
            // Set up error handlers BEFORE loading video
            this.videoPlayer.onerror = (e) => {
                if (this.inTechnicalDifficulties) {
                    console.error('Error during technical difficulties, will retry channel load');
                    return;
                }
                
                console.error('Video error:', e);
                const errorMsg = this.videoPlayer.error?.message || 'Unknown error';
                console.log('Video src that failed:', this.videoPlayer.src);
                
                if (this.isDevMode) {
                    this.debugCurrent.innerHTML = `<div style="color: #ff6b6b;">Video Error: ${errorMsg}</div>`;
                }
                
                // Show technical difficulties
                this.showTechnicalDifficulties(`Video error: ${errorMsg}`);
            };

            // Set video source with cache busting
            const cacheBuster = Date.now();
            this.videoPlayer.src = `/api/channel/${channelId}/stream?t=${cacheBuster}`;
            
            // Wait for metadata to load before seeking
            this.videoPlayer.onloadedmetadata = () => {
                const seekPos = syncData.seekPosition;
                const duration = this.videoPlayer.duration;
                
                console.log(`Video duration: ${duration}s, Seek position: ${seekPos}s`);
                
                // Force repaint to ensure video is visible
                this.videoPlayer.style.display = 'none';
                this.videoPlayer.offsetHeight; // Force reflow
                this.videoPlayer.style.display = 'block';
                
                // Only seek if position is within video duration
                if (seekPos < duration && seekPos > 0) {
                    console.log(`Seeking to ${seekPos} seconds`);
                    this.videoPlayer.currentTime = seekPos;
                } else if (seekPos >= duration) {
                    console.log(`Seek position exceeds duration, loading next content...`);
                    // Video has already ended in schedule, load next
                    setTimeout(() => this.loadChannelStream(channelId), 100);
                    return;
                } else {
                    console.log('Starting from beginning');
                    this.videoPlayer.currentTime = 0;
                }
            };
            
            // Update now playing info
            this.updateNowPlaying(syncData.entry);

            // Play video with better error handling
            this.videoPlayer.oncanplay = () => {
                const playPromise = this.videoPlayer.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('Playback started successfully');
                            this.showLoading(false);
                            
                            // Force another repaint when playback starts
                            requestAnimationFrame(() => {
                                this.videoPlayer.style.transform = 'translateZ(0)';
                            });
                        })
                        .catch(error => {
                            console.error('Autoplay error:', error);
                            console.log('Click anywhere on the page to start playback');
                            this.showLoading(false);
                            
                            // Add click handler to start playback on user interaction
                            const clickHandler = () => {
                                this.videoPlayer.play();
                                document.removeEventListener('click', clickHandler);
                            };
                            document.addEventListener('click', clickHandler);
                        });
                }
            };

            // Set up video ended event to immediately load next content
            this.videoPlayer.onended = async () => {
                console.log('Video ended, loading next content...');
                await this.loadChannelStream(channelId);
            };
            
            // Monitor for stalled/frozen video
            this.videoPlayer.onstalled = () => {
                console.warn('Video playback stalled');
            };
            
            // Detect if video appears stuck (no progress for 3 seconds)
            let lastTime = 0;
            let stuckCount = 0;
            this.videoPlayer.ontimeupdate = () => {
                if (!this.videoPlayer.duration) return;
                
                const currentTime = this.videoPlayer.currentTime;
                
                // Check if video is stuck
                if (currentTime === lastTime && !this.videoPlayer.paused && !this.videoPlayer.ended) {
                    stuckCount++;
                    if (stuckCount > 3) {
                        console.error('Video appears frozen');
                        this.showTechnicalDifficulties('Video playback frozen');
                        stuckCount = 0;
                    }
                } else {
                    stuckCount = 0;
                    lastTime = currentTime;
                }
                
                // Pre-load next content when 3 seconds remain
                const timeRemaining = this.videoPlayer.duration - currentTime;
                if (timeRemaining <= 3 && timeRemaining > 2.5) {
                    console.log('Preparing next content...');
                    fetch(`/api/channel/${channelId}/sync`).catch(err => 
                        console.warn('Prefetch failed:', err)
                    );
                }
            };
            
            // Also check when video is about to end (5 seconds before)
            this.videoPlayer.ontimeupdate = () => {
                if (!this.videoPlayer.duration) return;
                
                const timeRemaining = this.videoPlayer.duration - this.videoPlayer.currentTime;
                
                // Pre-load next content when 3 seconds remain
                if (timeRemaining <= 3 && timeRemaining > 2.5) {
                    console.log('Preparing next content...');
                    // Prefetch next content sync info
                    fetch(`/api/channel/${channelId}/sync`).catch(err => 
                        console.warn('Prefetch failed:', err)
                    );
                }
            };

        } catch (error) {
            console.error('Error loading stream:', error);
            throw error;
        }
    }

    updateNowPlaying(entry) {
        const title = entry.title || 'Unknown';
        const type = entry.isCommercial ? '📺 Commercial Break' : '🎬 Now Playing';
        this.nowPlaying.innerHTML = `${type}<br><strong>${title}</strong>`;
    }

    showChannelOverlay(channelId) {
        const channelNames = {
            '80s-tv': '80s TV',
            '80s-music': '80s Music',
            '80s-movies': '80s Movies',
            '90s-tv': '90s TV',
            '90s-music': '90s Music',
            '90s-movies': '90s Movies'
        };

        this.channelName.textContent = channelNames[channelId] || channelId;
        this.channelOverlay.classList.add('visible');

        setTimeout(() => {
            this.channelOverlay.classList.remove('visible');
        }, 3000);
    }

    showLoading(show) {
        if (show) {
            this.loadingScreen.classList.add('visible');
        } else {
            this.loadingScreen.classList.remove('visible');
        }
    }

    async updateDebugPanel() {
        if (!this.isDevMode || !this.currentChannel) return;

        try {
            // Get current playing info
            const syncResponse = await fetch(`/api/channel/${this.currentChannel}/sync`);
            
            if (!syncResponse.ok) {
                this.debugCurrent.innerHTML = `<div style="color: #ff6b6b;">Sync error: ${syncResponse.status}</div>`;
                return;
            }
            
            const syncData = await syncResponse.json();
            
            if (!syncData || !syncData.entry) {
                this.debugCurrent.innerHTML = `<div style="color: #ff6b6b;">Invalid sync data</div>`;
                return;
            }
            
            // Update current section
            const entry = syncData.entry;
            const type = entry.isCommercial ? 'Commercial' : 'Content';
            const seekPos = Math.floor(syncData.seekPosition);
            
            let titleHtml = '';
            if (entry.isCommercial) {
                const commercialTitle = entry.mediaFile?.title || entry.mediaFile?.filename || 'Unknown';
                titleHtml = `<div><strong>Title:</strong> ${commercialTitle}</div>`;
            } else {
                const seriesName = entry.mediaFile?.seriesName || 'Unknown Series';
                const episodeTitle = entry.mediaFile?.episodeTitle || 'Unknown Episode';
                const season = entry.mediaFile?.season || '?';
                const episode = entry.mediaFile?.episode || '?';
                const airDate = entry.mediaFile?.airDate || 'Unknown';
                titleHtml = `
                    <div><strong>Series:</strong> ${seriesName}</div>
                    <div><strong>Episode:</strong> S${season}E${episode} - ${episodeTitle}</div>
                    <div><strong>Air Date:</strong> ${airDate}</div>
                `;
            }
            
            const filename = entry.mediaFile?.filename || 'Unknown';
            
            this.debugCurrent.innerHTML = `
                <div><strong>Type:</strong> ${type}</div>
                ${titleHtml}
                <div><strong>File:</strong> ${filename}</div>
                <div><strong>Seek:</strong> ${seekPos}s</div>
            `;
            
            // Get upcoming schedule
            const upcomingResponse = await fetch(`/api/channel/${this.currentChannel}/upcoming?count=10`);
            const upcoming = await upcomingResponse.json();

            this.debugSchedule.innerHTML = '';

            upcoming.forEach((entry, index) => {
                const item = document.createElement('div');
                item.className = 'schedule-item' + (entry.isCommercial ? ' commercial' : '');
                if (index === 0) item.classList.add('current');
                
                // Make clickable in dev mode
                item.style.cursor = 'pointer';
                item.title = 'Click to jump to this content';

                const startTime = new Date(entry.startTime);
                const endTime = new Date(entry.endTime);
                const duration = Math.round((endTime - startTime) / 60000);

                let title;
                if (entry.isCommercial) {
                    title = '📺 ' + (entry.mediaFile.title || entry.mediaFile.filename);
                } else {
                    const seriesName = entry.mediaFile.seriesName || entry.mediaFile.filename;
                    const episodeTitle = entry.mediaFile.episodeTitle || '';
                    const season = entry.mediaFile.season || '?';
                    const episode = entry.mediaFile.episode || '?';
                    title = `${seriesName} - S${season}E${episode}`;
                    if (episodeTitle) {
                        title += `<br><small style="opacity: 0.7;">${episodeTitle}</small>`;
                    }
                }
                
                const timeStr = startTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });

                item.innerHTML = `
                    <div class="schedule-time">${timeStr}</div>
                    <div class="schedule-title">${title}</div>
                    <div class="schedule-duration">${duration} min</div>
                `;
                
                // Add click handler to jump to this content
                item.addEventListener('click', () => {
                    this.jumpToEntry(entry);
                });

                this.debugSchedule.appendChild(item);
            });
        } catch (error) {
            console.error('Error updating debug panel:', error);
        }
    }

    startSync() {
        // Update debug panel every 10 seconds in dev mode
        if (this.isDevMode) {
            this.scheduleUpdateInterval = setInterval(() => {
                this.updateDebugPanel();
            }, 10000);
            
            // In dev mode, don't check for time drift - just let videos play sequentially
            console.log('Dev mode: Time drift checking disabled');
            return;
        }

        // Sync with server every 30 seconds to ensure playback is in sync (production only)
        this.syncInterval = setInterval(async () => {
            if (!this.currentChannel) return;

            try {
                const response = await fetch(`/api/channel/${this.currentChannel}/sync`);
                
                if (!response.ok) {
                    console.warn(`Sync check failed with status ${response.status}`);
                    return;
                }
                
                const syncData = await response.json();
                
                if (!syncData || !syncData.entry) {
                    console.warn('Invalid sync data received');
                    return;
                }

                // Check if we need to switch to different content
                const currentEntryId = this.currentEntryId;
                const newEntryId = syncData.entry.id;
                
                if (currentEntryId && currentEntryId !== newEntryId) {
                    // Content changed, reload immediately
                    console.log('Content changed, switching...');
                    await this.loadChannelStream(this.currentChannel);
                } else if (this.videoPlayer.duration) {
                    // Check time sync only if video is loaded
                    const currentTime = this.videoPlayer.currentTime;
                    const expectedTime = syncData.seekPosition;
                    const drift = Math.abs(currentTime - expectedTime);

                    // Only resync if drift is significant AND seek position is valid
                    if (drift > 10 && expectedTime < this.videoPlayer.duration) {
                        console.log(`Time drift detected: ${drift}s, resyncing...`);
                        await this.loadChannelStream(this.currentChannel);
                    }
                }
            } catch (error) {
                console.error('Sync error:', error);
            }
        }, 30000);
    }

    async showTechnicalDifficulties(reason) {
        if (this.inTechnicalDifficulties) return;
        
        console.error(`Technical difficulties: ${reason}`);
        this.inTechnicalDifficulties = true;
        
        // Stop sync intervals to prevent interference
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        if (this.scheduleUpdateInterval) {
            clearInterval(this.scheduleUpdateInterval);
            this.scheduleUpdateInterval = null;
        }
        
        // Stop current playback and clear all handlers
        this.videoPlayer.pause();
        this.videoPlayer.src = '';
        this.videoPlayer.onerror = null;
        this.videoPlayer.onended = null;
        this.videoPlayer.onloadedmetadata = null;
        this.videoPlayer.oncanplay = null;
        this.videoPlayer.onstalled = null;
        this.videoPlayer.ontimeupdate = null;
        
        // Get media path from config
        try {
            const response = await fetch('/api/media-path');
            const data = await response.json();
            const technicalDifficultiesPath = `/api/static-video?path=${encodeURIComponent(data.mediaPath + '/lib/technical-difficulties.mp4')}`;
            
            // Play technical difficulties video
            this.videoPlayer.src = technicalDifficultiesPath;
            this.videoPlayer.loop = false;
            
            // Show overlay immediately
            this.channelName.textContent = 'Technical Difficulties';
            this.nowPlaying.innerHTML = `We're experiencing technical difficulties.<br>Please stand by...`;
            this.channelOverlay.classList.add('visible');
            
            try {
                await this.videoPlayer.play();
                console.log('Technical difficulties video playing');
            } catch (playError) {
                console.error('Failed to play technical difficulties video:', playError);
                // Skip video, go straight to retry
                this.retryAfterTechnicalDifficulties();
                return;
            }
            
            // After technical difficulties video ends, retry loading the channel
            this.videoPlayer.onended = () => {
                this.retryAfterTechnicalDifficulties();
            };
        } catch (error) {
            console.error('Failed to load technical difficulties video:', error);
            this.retryAfterTechnicalDifficulties();
        }
    }
    
    retryAfterTechnicalDifficulties() {
        this.channelOverlay.classList.remove('visible');
        this.inTechnicalDifficulties = false;
        
        console.log('Retrying channel load after technical difficulties...');
        setTimeout(async () => {
            await this.loadChannelStream(this.currentChannel);
            // Restart sync intervals
            this.startSync();
        }, 2000);
    }

    async jumpToEntry(entry) {
        if (!this.isDevMode) {
            console.warn('Jump to entry is only available in dev mode');
            return;
        }
        
        console.log(`Jumping to entry: ${entry.mediaFile.filename} at ${entry.startTime}`);
        
        try {
            // Stop current playback and clear src
            this.videoPlayer.pause();
            this.videoPlayer.src = '';
            this.videoPlayer.load();
            
            // Set server time to this entry's start time for dev mode
            const response = await fetch('/api/dev/set-time', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: this.currentChannel,
                    time: entry.startTime
                })
            });
            
            if (!response.ok) {
                console.error('Failed to set dev time');
                return;
            }
            
            console.log('Dev time set, loading new stream...');
            
            // Wait a moment for server to process
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Reload the stream with the new time
            this.showLoading(true);
            await this.loadChannelStream(this.currentChannel);
            this.updateDebugPanel();
        } catch (error) {
            console.error('Error jumping to entry:', error);
            this.showLoading(false);
        }
    }

    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.scheduleUpdateInterval) {
            clearInterval(this.scheduleUpdateInterval);
        }
        this.videoPlayer.pause();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new RetroTVClient();
    window.retroTV = app;
});
