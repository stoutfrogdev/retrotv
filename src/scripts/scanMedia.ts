import * as fs from 'fs';
import * as path from 'path';
import { MediaScanner } from '../utils/mediaScanner';
import { loadConfig } from '../utils/configLoader';

async function main() {
  console.log('📂 Scanning media library...\n');

  // Load configuration (with .env overrides)
  const config = loadConfig();

  const scanner = new MediaScanner();

  // Scan content library
  console.log('Scanning content files...');
  const contentLibrary = await scanner.scanMediaLibrary(
    config.mediaPath,
    config.channels
  );

  // Scan commercials
  console.log('\nScanning commercials...');
  const commercials = await scanner.scanCommercials(config.mediaPath);

  // Save media library metadata
  const outputDir = path.join(__dirname, '../../media-library');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save content library
  const contentData: any = {};
  contentLibrary.forEach((files, channelId) => {
    contentData[channelId] = files;
  });
  fs.writeFileSync(
    path.join(outputDir, 'content.json'),
    JSON.stringify(contentData, null, 2)
  );

  // Save commercials
  const commercialData: any = {};
  commercials.forEach((files, decade) => {
    commercialData[decade] = files;
  });
  fs.writeFileSync(
    path.join(outputDir, 'commercials.json'),
    JSON.stringify(commercialData, null, 2)
  );

  console.log('\n✅ Media scan complete!');
  console.log(`📊 Results saved to: ${outputDir}`);

  // Print summary
  console.log('\n📈 Summary:');
  contentLibrary.forEach((files, channelId) => {
    const totalDuration = files.reduce((sum, file) => sum + file.duration, 0);
    const hours = Math.round(totalDuration / 3600);
    console.log(`  ${channelId}: ${files.length} files (${hours} hours)`);
  });

  console.log('\n📺 Commercials:');
  commercials.forEach((files, decade) => {
    const totalDuration = files.reduce((sum, file) => sum + file.duration, 0);
    const minutes = Math.round(totalDuration / 60);
    console.log(`  ${decade}: ${files.length} files (${minutes} minutes)`);
  });
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
