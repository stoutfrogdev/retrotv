export interface Channel {
  id: string;
  name: string;
  decade: '80s' | '90s';
  type: 'tv' | 'music' | 'movies';
  mediaFolder: string;
}

export interface MediaFile {
  id: string;
  path: string;
  filename: string;
  duration: number; // in seconds
  type: 'content' | 'commercial';
  decade?: '80s' | '90s';
  category?: 'tv' | 'music' | 'movies';
  seasonalTag?: 'halloween' | 'christmas' | 'thanksgiving' | 'valentines';
  series?: string;
  season?: number;
  episode?: number;
  title?: string;
  // TVDB metadata
  seriesName?: string;     // Friendly series name from TVDB
  episodeTitle?: string;   // Episode title from TVDB
  overview?: string;       // Episode description
  airDate?: string;        // Original air date
  tvdbId?: number;         // TVDB series ID
}

export interface ScheduleEntry {
  id: string;
  channelId: string;
  startTime: Date;
  endTime: Date;
  mediaFile: MediaFile;
  isCommercial: boolean;
  // For year-agnostic scheduling
  dayOfYear?: number;      // 1-365
  monthDay?: string;       // MM-DD format
  timeOfDay?: string;      // HH:mm:ss format
}

export interface DaySchedule {
  channelId: string;
  date: string; // YYYY-MM-DD
  entries: ScheduleEntry[];
}

export interface YearSchedule {
  year: number;
  channelId: string;
  days: Map<string, DaySchedule>;
}

export interface Config {
  mediaPath: string;
  schedulePath: string;
  port: number;
  defaultChannel: string;
  commercialInterval: number; // minutes
  commercialDuration: number; // minutes
  channels: Channel[];
  seasonalContent: {
    [key: string]: {
      start: string; // MM-DD
      end: string; // MM-DD
      weight: number;
    };
  };
}

export interface EnvConfig {
  MEDIA_PATH: string;
  SCHEDULE_PATH: string;
  PORT: string;
  DEFAULT_CHANNEL: string;
  COMMERCIAL_INTERVAL: string;
  COMMERCIAL_DURATION: string;
}

export interface MediaLibrary {
  content: Map<string, MediaFile[]>; // key: channelId
  commercials: Map<string, MediaFile[]>; // key: decade
}

export interface CurrentPlayback {
  channelId: string;
  entry: ScheduleEntry;
  startedAt: Date;
  progress: number; // seconds
}
