import * as fs from 'fs';
import * as path from 'path';
import { ScheduleEntry, DaySchedule } from '../types';
import { format, setDayOfYear, startOfYear } from 'date-fns';

export class PlayerService {
  private schedules: Map<string, Map<string, DaySchedule>>;
  private devTimeOverrides: Map<string, Date>; // For dev mode time control

  constructor() {
    this.schedules = new Map();
    this.devTimeOverrides = new Map();
  }

  loadSchedules(schedulePath: string, channelIds: string[]): void {
    for (const channelId of channelIds) {
      const channelSchedulePath = path.join(schedulePath, `${channelId}.json`);
      
      if (!fs.existsSync(channelSchedulePath)) {
        console.warn(`Schedule file not found for ${channelId}: ${channelSchedulePath}`);
        continue;
      }

      try {
        const scheduleData = JSON.parse(fs.readFileSync(channelSchedulePath, 'utf-8'));
        const daySchedules = new Map<string, DaySchedule>();
        const currentYear = new Date().getFullYear();

        for (const day of scheduleData) {
          // Reconstruct dates using current year and local timezone
          const processedDay: DaySchedule = {
            ...day,
            entries: day.entries.map((entry: any) => {
              // Parse year-agnostic date and time in LOCAL timezone
              const [monthDay, timeOfDay] = entry.startTime.split(' ');
              const [month, dayNum] = monthDay.split('-').map(Number); // MM-DD format
              const [hours, minutes, seconds] = timeOfDay.split(':').map(Number);
              
              // Create date in local timezone
              const startDateTime = new Date(
                currentYear,
                month - 1, // JS months are 0-indexed
                dayNum,
                hours,
                minutes,
                seconds
              );
              
              // Calculate end time from start time + duration
              // Don't parse the endTime directly as it may have wrong date
              const durationMs = entry.mediaFile.duration * 1000;
              const endDateTime = new Date(startDateTime.getTime() + durationMs);
              
              return {
                ...entry,
                startTime: startDateTime,
                endTime: endDateTime,
              };
            }),
          };
          
          // Update date to current year using dayOfYear from first entry
          const firstEntry = day.entries[0];
          if (firstEntry && firstEntry.dayOfYear) {
            const currentYearDate = format(
              setDayOfYear(startOfYear(new Date(currentYear, 0, 1)), firstEntry.dayOfYear),
              'yyyy-MM-dd'
            );
            processedDay.date = currentYearDate;
            daySchedules.set(currentYearDate, processedDay);
          } else {
            // Fallback to original date format if dayOfYear is missing
            daySchedules.set(day.date, processedDay);
          }
        }

        this.schedules.set(channelId, daySchedules);
        console.log(`Loaded ${daySchedules.size} days of schedule for ${channelId} (year: ${currentYear})`);
      } catch (error) {
        console.error(`Error loading schedule for ${channelId}:`, error);
      }
    }
  }

  getCurrentEntry(channelId: string, currentTime?: Date): ScheduleEntry | null {
    // Check for dev time override
    const devTime = this.devTimeOverrides.get(channelId);
    const now = currentTime || devTime || new Date();
    const dateKey = format(now, 'yyyy-MM-dd');
    
    console.log(`[getCurrentEntry] Looking for ${channelId} schedule on ${dateKey}, current time: ${now.toISOString()}${devTime ? ' (DEV MODE)' : ''}`);
    
    const channelSchedules = this.schedules.get(channelId);
    if (!channelSchedules) {
      console.error(`No schedules loaded for channel: ${channelId}`);
      return null;
    }

    const daySchedule = channelSchedules.get(dateKey);
    if (!daySchedule) {
      const availableDates = Array.from(channelSchedules.keys()).slice(0, 5);
      console.error(`No schedule for ${channelId} on ${dateKey}. Available dates: ${availableDates.join(', ')}`);
      return null;
    }

    console.log(`[getCurrentEntry] Found schedule with ${daySchedule.entries.length} entries`);

    // Find the entry that's currently playing
    for (const entry of daySchedule.entries) {
      if (now >= entry.startTime && now < entry.endTime) {
        console.log(`[getCurrentEntry] Found current entry: ${entry.mediaFile.filename}`);
        console.log(`  Entry times: ${entry.startTime.toString()} - ${entry.endTime.toString()}`);
        console.log(`  Current time: ${now.toString()}`);
        return entry;
      }
    }

    // Debug: show first few entries and current time
    console.error(`[getCurrentEntry] No entry found playing at ${now.toString()} (${now.toISOString()})`);
    console.error('First 3 entries:');
    daySchedule.entries.slice(0, 3).forEach(e => {
      console.error(`  ${e.startTime.toString()} - ${e.endTime.toString()}: ${e.mediaFile.filename}`);
    });
    return null;
  }

  getUpcomingEntries(channelId: string, count: number = 5): ScheduleEntry[] {
    const now = new Date();
    const dateKey = format(now, 'yyyy-MM-dd');
    
    const channelSchedules = this.schedules.get(channelId);
    if (!channelSchedules) {
      return [];
    }

    const daySchedule = channelSchedules.get(dateKey);
    if (!daySchedule) {
      return [];
    }

    // Find upcoming entries
    const upcoming = daySchedule.entries
      .filter(entry => entry.startTime > now)
      .slice(0, count);

    return upcoming;
  }

  getDaySchedule(channelId: string, date?: Date): DaySchedule | null {
    const targetDate = date || new Date();
    const dateKey = format(targetDate, 'yyyy-MM-dd');
    
    const channelSchedules = this.schedules.get(channelId);
    if (!channelSchedules) {
      return null;
    }

    return channelSchedules.get(dateKey) || null;
  }

  getStreamInfo(channelId: string): {
    currentEntry: ScheduleEntry | null;
    progress: number;
    remaining: number;
  } | null {
    const currentEntry = this.getCurrentEntry(channelId);
    
    if (!currentEntry) {
      return null;
    }

    const now = new Date();
    const elapsed = (now.getTime() - currentEntry.startTime.getTime()) / 1000;
    const remaining = currentEntry.mediaFile.duration - elapsed;

    return {
      currentEntry,
      progress: elapsed,
      remaining: Math.max(0, remaining),
    };
  }

  getAllChannels(): string[] {
    return Array.from(this.schedules.keys());
  }

  getVideoPath(entry: ScheduleEntry): string {
    return entry.mediaFile.path;
  }

  // Calculate the byte range for video streaming based on current time
  getSeekPosition(entry: ScheduleEntry, currentTime?: Date): number {
    const devTime = this.devTimeOverrides.get(entry.channelId);
    const now = currentTime || devTime || new Date();
    const elapsed = (now.getTime() - entry.startTime.getTime()) / 1000;
    
    // Return elapsed seconds for seeking
    return Math.max(0, Math.floor(elapsed));
  }

  // Dev mode: Set a custom time for a channel
  setDevTime(channelId: string, time: Date): void {
    this.devTimeOverrides.set(channelId, time);
    console.log(`[DEV MODE] Set time for ${channelId} to ${time.toISOString()}`);
  }

  // Dev mode: Clear custom time for a channel
  clearDevTime(channelId: string): void {
    this.devTimeOverrides.delete(channelId);
    console.log(`[DEV MODE] Cleared time override for ${channelId}`);
  }
}
