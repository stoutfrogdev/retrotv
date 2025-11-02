import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import { MediaFile } from '../types';
import { TVDBService } from '../services/tvdbService';

export class MediaScanner {
  private supportedExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.m4v', '.wmv'];
  private tvdbService: TVDBService;

  constructor() {
    this.tvdbService = new TVDBService();
    if (this.tvdbService.isEnabled()) {
      console.log('✓ TVDB integration enabled');
    } else {
      console.log('⚠ TVDB integration disabled (no API key). Using filename parsing only.');
    }
  }

  async scanDirectory(dirPath: string, type: 'content' | 'commercial'): Promise<MediaFile[]> {
    const files: MediaFile[] = [];
    
    if (!fs.existsSync(dirPath)) {
      console.warn(`Directory does not exist: ${dirPath}`);
      return files;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath, type);
        files.push(...subFiles);
      } else if (entry.isFile() && this.isSupportedFile(entry.name)) {
        try {
          const mediaFile = await this.createMediaFile(fullPath, type);
          
          // Fetch TVDB metadata if this is a TV show
          if (mediaFile.series && mediaFile.season && mediaFile.episode) {
            const metadata = await this.tvdbService.getMetadata(
              mediaFile.series,
              mediaFile.season,
              mediaFile.episode
            );
            
            if (metadata) {
              mediaFile.seriesName = metadata.seriesName;
              mediaFile.episodeTitle = metadata.episodeTitle;
              mediaFile.overview = metadata.overview;
              mediaFile.airDate = metadata.airDate;
              mediaFile.tvdbId = metadata.tvdbId;
              console.log(`  ✓ ${metadata.seriesName} - S${mediaFile.season}E${mediaFile.episode}: ${metadata.episodeTitle}`);
            }
          }
          
          files.push(mediaFile);
        } catch (error) {
          console.error(`Error processing file ${fullPath}:`, error);
        }
      }
    }

    return files;
  }

  private isSupportedFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  private async createMediaFile(filePath: string, type: 'content' | 'commercial'): Promise<MediaFile> {
    const duration = await this.getVideoDuration(filePath);
    const filename = path.basename(filePath);
    const metadata = this.parseFilename(filename);

    return {
      id: this.generateId(filePath),
      path: filePath,
      filename,
      duration,
      type,
      ...metadata,
    };
  }

  private getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const duration = metadata.format.duration || 0;
        resolve(Math.floor(duration));
      });
    });
  }

  private parseFilename(filename: string): Partial<MediaFile> {
    const metadata: Partial<MediaFile> = {};

    // Check for seasonal tags
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('halloween') || lowerFilename.includes('horror')) {
      metadata.seasonalTag = 'halloween';
    } else if (lowerFilename.includes('christmas') || lowerFilename.includes('xmas')) {
      metadata.seasonalTag = 'christmas';
    } else if (lowerFilename.includes('thanksgiving')) {
      metadata.seasonalTag = 'thanksgiving';
    } else if (lowerFilename.includes('valentine')) {
      metadata.seasonalTag = 'valentines';
    }

    // Parse TV show pattern: ShowName.S01E01 or ShowName.1x01
    const tvPattern1 = /(.+?)\.S(\d+)E(\d+)/i;
    const tvPattern2 = /(.+?)\.(\d+)x(\d+)/i;
    
    let match = filename.match(tvPattern1) || filename.match(tvPattern2);
    if (match) {
      metadata.series = match[1].replace(/\./g, ' ').trim();
      metadata.season = parseInt(match[2], 10);
      metadata.episode = parseInt(match[3], 10);
    } else {
      // Extract title from filename (remove extension and clean up)
      metadata.title = path.parse(filename).name.replace(/\./g, ' ').trim();
    }

    return metadata;
  }

  private generateId(filePath: string): string {
    // Simple hash-like ID based on file path
    return Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  }

  async scanMediaLibrary(
    basePath: string,
    channels: Array<{ id: string; decade: string; mediaFolder: string }>
  ): Promise<Map<string, MediaFile[]>> {
    const library = new Map<string, MediaFile[]>();

    for (const channel of channels) {
      const channelPath = path.join(basePath, channel.mediaFolder);
      console.log(`Scanning channel: ${channel.id} at ${channelPath}`);
      
      const files = await this.scanDirectory(channelPath, 'content');
      
      // Add decade and category metadata
      files.forEach(file => {
        file.decade = channel.decade as '80s' | '90s';
        file.category = channel.id.split('-')[1] as 'tv' | 'music' | 'movies';
      });

      library.set(channel.id, files);
      console.log(`Found ${files.length} files for ${channel.id}`);
    }

    return library;
  }

  async scanCommercials(basePath: string): Promise<Map<string, MediaFile[]>> {
    const commercials = new Map<string, MediaFile[]>();

    for (const decade of ['80s', '90s']) {
      const commercialPath = path.join(basePath, decade, 'commercials');
      console.log(`Scanning commercials: ${decade} at ${commercialPath}`);
      
      const files = await this.scanDirectory(commercialPath, 'commercial');
      files.forEach(file => {
        file.decade = decade as '80s' | '90s';
      });

      commercials.set(decade, files);
      console.log(`Found ${files.length} commercials for ${decade}`);
    }

    return commercials;
  }
}
