import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Config } from '../types';

// Load environment variables
dotenv.config();

export function loadConfig(configPath?: string): Config {
  // Load base config from JSON
  const defaultConfigPath = configPath || path.join(__dirname, '../../config.json');
  
  if (!fs.existsSync(defaultConfigPath)) {
    throw new Error(`Configuration file not found: ${defaultConfigPath}`);
  }

  const baseConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));

  // Override with environment variables if they exist
  const config: Config = {
    ...baseConfig,
    mediaPath: process.env.MEDIA_PATH || baseConfig.mediaPath,
    schedulePath: process.env.SCHEDULE_PATH || baseConfig.schedulePath,
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : baseConfig.port,
    defaultChannel: process.env.DEFAULT_CHANNEL || baseConfig.defaultChannel,
    commercialInterval: process.env.COMMERCIAL_INTERVAL 
      ? parseInt(process.env.COMMERCIAL_INTERVAL, 10) 
      : baseConfig.commercialInterval,
    commercialDuration: process.env.COMMERCIAL_DURATION 
      ? parseInt(process.env.COMMERCIAL_DURATION, 10) 
      : baseConfig.commercialDuration,
  };

  return config;
}
