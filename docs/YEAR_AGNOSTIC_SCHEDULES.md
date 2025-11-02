# Year-Agnostic Schedules

RetroTV uses a year-agnostic scheduling system that allows schedules to automatically repeat every year without needing to regenerate them.

## Problem Solved

**Without Year-Agnostic Scheduling:**
- Schedules generated for 2025 won't work in 2026
- Must regenerate schedules every year
- Dates are hardcoded to specific years

**With Year-Agnostic Scheduling:**
- Generate once, use forever
- Schedules automatically adapt to current year
- Seasonal content aligns with current calendar

## How It Works

### Schedule Generation

When you run `npm run generate-schedule`, the system creates schedules with:

**Stored in JSON:**
```json
{
  "startTime": "10-01 14:30:00",  // Month-Day Time (no year)
  "endTime": "10-01 15:00:00",
  "dayOfYear": 274,                // Day 274 of 365
  "monthDay": "10-01",             // October 1st
  "timeOfDay": "14:30:00"          // 2:30 PM
}
```

**Not stored:**
- Full ISO timestamps with years (e.g., `2025-10-01T14:30:00Z`)
- Year-specific dates

### Schedule Loading

When the server starts, it:

1. Reads the year-agnostic schedule files
2. Gets the current year (e.g., 2026)
3. Reconstructs full dates using the current year:
   - `10-01 14:30:00` → `2026-10-01 14:30:00`
4. Loads the schedule into memory

### Benefits

**For Users:**
- Set it and forget it
- No annual maintenance
- Works indefinitely

**For System:**
- Smaller schedule files
- Easier to understand
- More portable across years

## Seasonal Content

Seasonal content automatically adjusts to the current year:

```javascript
// Halloween content plays October 1-31
// Regardless of what year it is
if (currentDate >= Oct 1 && currentDate <= Oct 31) {
  prioritize('halloween');
}
```

### Example

**Year 2025:**
- Halloween: October 1-31, 2025
- Christmas: December 1-25, 2025

**Year 2026:**
- Halloween: October 1-31, 2026
- Christmas: December 1-25, 2026

Same schedule file, different years!

## Technical Details

### Storage Format

Schedules are stored in JSON with these fields:

```json
{
  "channelId": "80s-tv",
  "date": "2025-10-01",  // Reference date (not used in playback)
  "entries": [
    {
      "id": "...",
      "startTime": "10-01 14:30:00",  // MM-DD HH:mm:ss
      "endTime": "10-01 15:00:00",
      "dayOfYear": 274,
      "monthDay": "10-01",
      "timeOfDay": "14:30:00",
      "mediaFile": { /* ... */ },
      "isCommercial": false
    }
  ]
}
```

### Loading Algorithm

```typescript
// Pseudo-code
function loadSchedule(scheduleFile) {
  const currentYear = new Date().getFullYear();
  
  for (const entry of scheduleFile.entries) {
    // Parse: "10-01 14:30:00"
    const [monthDay, time] = entry.startTime.split(' ');
    
    // Reconstruct: "2026-10-01 14:30:00"
    const fullDate = `${currentYear}-${monthDay} ${time}`;
    
    entry.startTime = new Date(fullDate);
  }
}
```

### Midnight Crossover

Shows that span midnight are handled correctly:

```json
{
  "startTime": "12-25 23:30:00",  // Dec 25, 11:30 PM
  "endTime": "12-26 01:00:00"     // Dec 26, 1:00 AM
}
```

The system detects that end time is "earlier" than start time and adds 24 hours.

## Migration

### Existing Schedules

If you have old schedules with full ISO timestamps:

1. Delete old schedule files: `rm schedules/*.json`
2. Re-generate: `npm run generate-schedule`
3. New schedules will be year-agnostic

### Compatibility

The system can load both:
- **New format**: `"10-01 14:30:00"` (year-agnostic)
- **Old format**: `"2025-10-01T14:30:00Z"` (with fallback handling)

## Leap Years

### February 29th Handling

Schedules account for leap years:

- **Leap year (2024, 2028)**: Day 60 = February 29th
- **Regular year (2025, 2026)**: Day 60 = March 1st

The system uses `dayOfYear` to ensure proper alignment.

### Solution

For February 29th content:
- In leap years: plays on Feb 29th
- In regular years: plays on Feb 28th or March 1st

This is handled automatically by the `dayOfYear` field.

## Performance

### Benefits

1. **Faster Loading**: No year conversion during generation
2. **Smaller Files**: No redundant year data in every entry
3. **Portable**: Share schedules between systems easily

### Considerations

- Initial load reconstructs dates (milliseconds)
- Cached in memory after first load
- No performance impact during playback

## Debugging

### Check Current Year

The server logs the loaded year on startup:

```
Loaded 365 days of schedule for 80s-tv (year: 2026)
```

### Verify Date Reconstruction

Check the player service logs to see reconstructed dates:

```javascript
console.log(`startTime: ${entry.startTime}`);
// Output: startTime: 2026-10-01T14:30:00.000Z
```

### Test Future Years

To test a future year, temporarily modify system clock or add test code:

```typescript
// For testing only
const testYear = 2030;
const currentYear = testYear;
```

## Best Practices

### Do:
- Generate schedules once per content library
- Keep schedule files backed up
- Update schedules when adding new content

### Don't:
- Delete schedules unnecessarily
- Hardcode years in custom code
- Manually edit schedule JSON files

## Troubleshooting

### "Schedule not found"

The system looks for schedules based on current date:
- Check that `SCHEDULE_PATH` is correct
- Verify schedule files exist for the channel
- Ensure dayOfYear fields are present

### Shows Playing at Wrong Times

Possible causes:
- System clock is wrong
- Timezone issues
- Schedule corruption

**Solution**:
1. Check system time: `date`
2. Regenerate schedules: `npm run generate-schedule`
3. Restart server: `npm start`

### Seasonal Content Not Showing

Verify:
1. Files have seasonal tags in filenames
2. Current date is within seasonal period
3. Seasonal content exists in media library

## Future Enhancements

Planned improvements:
- Daylight saving time handling
- Timezone-aware scheduling
- Multi-year schedule variations
- Manual schedule overrides

## Conclusion

Year-agnostic scheduling makes RetroTV a truly set-it-and-forget-it system. Generate your schedules once, and they'll work year after year, automatically adapting to the current calendar and seasonal periods.
