import * as fs from 'fs';
import * as path from 'path';
import { MediaFile } from '../types';
import { ScheduleGenerator } from '../services/scheduleGenerator';
import { loadConfig } from '../utils/configLoader';

async function main() {
  console.log('📅 Generating schedules...\n');

  // Load configuration (with .env overrides)
  const config = loadConfig();
  console.log(`Using schedule path: ${config.schedulePath}`);

  // Load media library
  const mediaLibraryPath = path.join(__dirname, '../../media-library');
  const contentPath = path.join(mediaLibraryPath, 'content.json');
  const commercialsPath = path.join(mediaLibraryPath, 'commercials.json');

  if (!fs.existsSync(contentPath) || !fs.existsSync(commercialsPath)) {
    console.error('❌ Media library not found!');
    console.error('Please run: npm run scan-media');
    process.exit(1);
  }

  const contentData = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  const commercialData = JSON.parse(fs.readFileSync(commercialsPath, 'utf-8'));

  // Convert to Map
  const contentLibrary = new Map<string, MediaFile[]>();
  Object.entries(contentData).forEach(([channelId, files]) => {
    contentLibrary.set(channelId, files as MediaFile[]);
  });

  const commercials = new Map<string, MediaFile[]>();
  Object.entries(commercialData).forEach(([decade, files]) => {
    commercials.set(decade, files as MediaFile[]);
  });

  // Create schedule generator
  const generator = new ScheduleGenerator(config, contentLibrary, commercials);

  // Generate schedules for each channel
  const year = new Date().getFullYear();
  const scheduleDir = path.join(__dirname, '../../schedules');
  
  if (!fs.existsSync(scheduleDir)) {
    fs.mkdirSync(scheduleDir, { recursive: true });
  }

  for (const channel of config.channels) {
    console.log(`Generating schedule for ${channel.name}...`);
    
    const schedule = generator.generateYearSchedule(year, channel.id);
    const outputPath = path.join(scheduleDir, `${channel.id}.json`);
    
    generator.saveScheduleToFile(schedule, outputPath);
    
    console.log(`  ✅ ${schedule.length} days saved to ${outputPath}`);
  }

  console.log('\n🎉 All schedules generated successfully!');
  console.log(`📁 Schedules saved to: ${scheduleDir}`);
  console.log('\n💡 You can now start the server with: npm start');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
