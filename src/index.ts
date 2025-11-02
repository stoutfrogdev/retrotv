import { PlayerService } from './services/playerService';
import { RetroTVServer } from './server';
import { loadConfig } from './utils/configLoader';

async function main() {
  console.log('🎬 Starting RetroTV...');

  // Load configuration (with .env overrides)
  const config = loadConfig();
  console.log(`Loaded configuration for ${config.channels.length} channels`);
  console.log(`Media path: ${config.mediaPath}`);
  console.log(`Schedule path: ${config.schedulePath}`);

  // Initialize player service
  const playerService = new PlayerService();
  
  // Load schedules
  const channelIds = config.channels.map(c => c.id);
  playerService.loadSchedules(config.schedulePath, channelIds);

  // Start server
  const server = new RetroTVServer(config, playerService);
  server.start();

  console.log('✅ RetroTV is ready!');
  console.log(`📺 Open http://localhost:${config.port} in Chrome`);
  console.log(`🎯 Default channel: ${config.defaultChannel}`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down RetroTV...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down RetroTV...');
  process.exit(0);
});

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
