import { 
  MediaFile, 
  ScheduleEntry, 
  DaySchedule, 
  Config 
} from '../types';
import { 
  startOfYear, 
  addDays, 
  format, 
  isWithinInterval, 
  parse,
  getDayOfYear
} from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

export class ScheduleGenerator {
  private config: Config;
  private contentLibrary: Map<string, MediaFile[]>;
  private commercials: Map<string, MediaFile[]>;
  private usedContentIndexes: Map<string, number>;

  constructor(
    config: Config,
    contentLibrary: Map<string, MediaFile[]>,
    commercials: Map<string, MediaFile[]>
  ) {
    this.config = config;
    this.contentLibrary = contentLibrary;
    this.commercials = commercials;
    this.usedContentIndexes = new Map();
  }

  generateYearSchedule(year: number, channelId: string): DaySchedule[] {
    const schedules: DaySchedule[] = [];
    const startDate = startOfYear(new Date(year, 0, 1));

    console.log(`Generating year-long schedule for ${channelId} in ${year}`);

    for (let dayIndex = 0; dayIndex < 365; dayIndex++) {
      const currentDate = addDays(startDate, dayIndex);
      const daySchedule = this.generateDaySchedule(currentDate, channelId);
      schedules.push(daySchedule);
    }

    console.log(`Generated ${schedules.length} days of schedule for ${channelId}`);
    return schedules;
  }

  private generateDaySchedule(date: Date, channelId: string): DaySchedule {
    const entries: ScheduleEntry[] = [];
    const channel = this.config.channels.find(c => c.id === channelId);
    
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    let currentTime = new Date(date);
    currentTime.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let lastCommercialTime = currentTime;
    const commercialIntervalMs = this.config.commercialInterval * 60 * 1000;

    while (currentTime < endOfDay) {
      // Add content first
      const contentFile = this.selectContent(channelId, date);
      
      if (!contentFile) {
        console.warn(`No content available for ${channelId} at ${currentTime}`);
        break;
      }

      const entry = this.createScheduleEntry(channelId, currentTime, contentFile, false);
      entries.push(entry);
      currentTime = entry.endTime;
      
      // Check if it's time for a commercial break AFTER content
      const timeSinceLastCommercial = currentTime.getTime() - lastCommercialTime.getTime();
      
      if (timeSinceLastCommercial >= commercialIntervalMs && currentTime < endOfDay) {
        const commercialBreak = this.createCommercialBreak(
          channelId,
          channel.decade,
          currentTime
        );
        
        // Add all commercials in this break
        if (commercialBreak.length > 0) {
          entries.push(...commercialBreak);
          // Update current time to end of last commercial
          const lastCommercial = commercialBreak[commercialBreak.length - 1];
          currentTime = lastCommercial.endTime;
          lastCommercialTime = currentTime;
        }
      }
    }

    return {
      channelId,
      date: format(date, 'yyyy-MM-dd'),
      entries,
    };
  }

  private selectContent(channelId: string, date: Date): MediaFile | null {
    const contentFiles = this.contentLibrary.get(channelId);
    
    if (!contentFiles || contentFiles.length === 0) {
      return null;
    }

    // Determine if this is a seasonal period
    const seasonalContent = this.getSeasonalContent(contentFiles, date);
    
    // Get current index for this channel
    const currentIndex = this.usedContentIndexes.get(channelId) || 0;
    
    // Prefer seasonal content during seasonal periods
    if (seasonalContent.length > 0 && Math.random() < 0.7) {
      const randomIndex = Math.floor(Math.random() * seasonalContent.length);
      return seasonalContent[randomIndex];
    }

    // Otherwise, cycle through all content
    const selectedFile = contentFiles[currentIndex % contentFiles.length];
    this.usedContentIndexes.set(channelId, currentIndex + 1);
    
    return selectedFile;
  }

  private getSeasonalContent(contentFiles: MediaFile[], date: Date): MediaFile[] {
    const seasonal: MediaFile[] = [];

    for (const [seasonName, period] of Object.entries(this.config.seasonalContent)) {
      if (this.isDateInSeasonalPeriod(date, period.start, period.end)) {
        const seasonalFiles = contentFiles.filter(
          file => file.seasonalTag === seasonName
        );
        seasonal.push(...seasonalFiles);
      }
    }

    return seasonal;
  }

  private isDateInSeasonalPeriod(date: Date, startMMDD: string, endMMDD: string): boolean {
    const year = date.getFullYear();
    const start = parse(`${year}-${startMMDD}`, 'yyyy-MM-dd', new Date());
    const end = parse(`${year}-${endMMDD}`, 'yyyy-MM-dd', new Date());

    return isWithinInterval(date, { start, end });
  }

  private createCommercialBreak(
    channelId: string,
    decade: string,
    startTime: Date
  ): ScheduleEntry[] {
    const commercialFiles = this.commercials.get(decade);
    
    if (!commercialFiles || commercialFiles.length === 0) {
      console.warn(`No commercials available for ${decade}`);
      return [];
    }

    const minCommercialDurationSeconds = this.config.commercialDuration * 60;
    let totalDuration = 0;
    const commercialEntries: ScheduleEntry[] = [];
    let currentTime = new Date(startTime);
    const usedIndexes = new Set<number>();

    // Keep adding commercials until we reach at least the minimum duration
    while (totalDuration < minCommercialDurationSeconds) {
      // Select a random commercial that hasn't been used in this break
      let attempts = 0;
      let randomIndex: number;
      
      do {
        randomIndex = Math.floor(Math.random() * commercialFiles.length);
        attempts++;
        // If we've tried all commercials, allow reuse
        if (attempts > commercialFiles.length * 2) {
          usedIndexes.clear();
        }
      } while (usedIndexes.has(randomIndex) && usedIndexes.size < commercialFiles.length);
      
      usedIndexes.add(randomIndex);
      const commercial = commercialFiles[randomIndex];
      
      // Create entry for this commercial
      const entry = this.createScheduleEntry(channelId, currentTime, commercial, true);
      commercialEntries.push(entry);
      
      totalDuration += commercial.duration;
      currentTime = entry.endTime;
      
      // Safety check: don't add more than 10 commercials in one break
      if (commercialEntries.length >= 10) {
        break;
      }
    }

    const totalMinutes = Math.round(totalDuration / 60);
    console.log(`  Commercial break: ${commercialEntries.length} ads, ${totalMinutes} minutes`);
    
    return commercialEntries;
  }

  private createScheduleEntry(
    channelId: string,
    startTime: Date,
    mediaFile: MediaFile,
    isCommercial: boolean
  ): ScheduleEntry {
    // Use exact duration in milliseconds for precise timing
    const durationMs = mediaFile.duration * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);

    return {
      id: `${channelId}-${startTime.getTime()}-${mediaFile.id}`,
      channelId,
      startTime: new Date(startTime),
      endTime,
      mediaFile,
      isCommercial,
      // Year-agnostic fields for repeating schedules
      dayOfYear: getDayOfYear(startTime),
      monthDay: format(startTime, 'MM-dd'),
      timeOfDay: format(startTime, 'HH:mm:ss'),
    };
  }

  saveScheduleToFile(schedule: DaySchedule[], outputPath: string): void {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Convert to year-agnostic format for serialization
    const serializable = schedule.map(day => ({
      ...day,
      entries: day.entries.map(entry => ({
        ...entry,
        // Store only the time components, not the full date
        startTime: entry.monthDay + ' ' + entry.timeOfDay,
        endTime: format(entry.endTime, 'MM-dd HH:mm:ss'),
        // Keep the year-agnostic fields
        dayOfYear: entry.dayOfYear,
        monthDay: entry.monthDay,
        timeOfDay: entry.timeOfDay,
      })),
    }));

    fs.writeFileSync(outputPath, JSON.stringify(serializable, null, 2));
    console.log(`Schedule saved to ${outputPath}`);
  }

  static loadScheduleFromFile(filePath: string): DaySchedule[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Schedule file not found: ${filePath}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Convert ISO strings back to Date objects
    return data.map((day: any) => ({
      ...day,
      entries: day.entries.map((entry: any) => ({
        ...entry,
        startTime: new Date(entry.startTime),
        endTime: new Date(entry.endTime),
      })),
    }));
  }
}
