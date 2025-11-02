import express, { Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { PlayerService } from './services/playerService';
import { Config } from './types';

export class RetroTVServer {
  private app: express.Application;
  private playerService: PlayerService;
  private config: Config;

  constructor(config: Config, playerService: PlayerService) {
    this.app = express();
    this.config = config;
    this.playerService = playerService;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private setupRoutes(): void {
    // Get all channels
    this.app.get('/api/channels', (req: Request, res: Response) => {
      res.json(this.config.channels);
    });

    // Get current playing content for a channel
    this.app.get('/api/channel/:channelId/current', (req: Request, res: Response) => {
      const { channelId } = req.params;
      const streamInfo = this.playerService.getStreamInfo(channelId);

      if (!streamInfo) {
        res.status(404).json({ error: 'No content currently playing' });
        return;
      }

      res.json(streamInfo);
    });

    // Get upcoming schedule for a channel
    this.app.get('/api/channel/:channelId/upcoming', (req: Request, res: Response) => {
      const { channelId } = req.params;
      const count = parseInt(req.query.count as string) || 5;
      const upcoming = this.playerService.getUpcomingEntries(channelId, count);

      res.json(upcoming);
    });

    // Get full day schedule
    this.app.get('/api/channel/:channelId/schedule', (req: Request, res: Response) => {
      const { channelId } = req.params;
      const dateStr = req.query.date as string;
      
      const date = dateStr ? new Date(dateStr) : new Date();
      const schedule = this.playerService.getDaySchedule(channelId, date);

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json(schedule);
    });

    // Stream video with proper seeking
    this.app.get('/api/channel/:channelId/stream', (req: Request, res: Response) => {
      const { channelId } = req.params;
      const streamInfo = this.playerService.getStreamInfo(channelId);

      if (!streamInfo || !streamInfo.currentEntry) {
        res.status(404).json({ error: 'No content currently playing' });
        return;
      }

      const videoPath = streamInfo.currentEntry.mediaFile.path;
      
      if (!fs.existsSync(videoPath)) {
        res.status(404).json({ error: 'Video file not found' });
        return;
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        let start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        // Validate range
        if (start >= fileSize) {
          res.status(416).send('Requested range not satisfiable');
          return;
        }
        
        // Ensure end doesn't exceed file size
        if (end >= fileSize) {
          end = fileSize - 1;
        }
        
        // Ensure start is not greater than end
        if (start > end) {
          start = end;
        }
        
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };

        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    });

    // Get stream metadata (for sync)
    this.app.get('/api/channel/:channelId/sync', (req: Request, res: Response) => {
      const { channelId } = req.params;
      const currentEntry = this.playerService.getCurrentEntry(channelId);

      if (!currentEntry) {
        res.status(404).json({ error: 'No content currently playing' });
        return;
      }

      const seekPosition = this.playerService.getSeekPosition(currentEntry);

      res.json({
        entry: {
          id: currentEntry.id,
          title: currentEntry.mediaFile.title || currentEntry.mediaFile.filename,
          startTime: currentEntry.startTime,
          endTime: currentEntry.endTime,
          isCommercial: currentEntry.isCommercial,
        },
        seekPosition,
        serverTime: new Date().toISOString(),
      });
    });

    // Dev mode: Set server time for testing
    this.app.post('/api/dev/set-time', (req: Request, res: Response) => {
      const { channelId, time } = req.body;
      
      if (!channelId || !time) {
        res.status(400).json({ error: 'channelId and time are required' });
        return;
      }
      
      // Only allow in dev mode (localhost)
      const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
      if (!isLocalhost) {
        res.status(403).json({ error: 'Dev mode only available on localhost' });
        return;
      }
      
      this.playerService.setDevTime(channelId, new Date(time));
      res.json({ success: true, time: new Date(time).toISOString() });
    });
    
    // Dev mode: Clear time override
    this.app.post('/api/dev/clear-time', (req: Request, res: Response) => {
      const { channelId } = req.body;
      
      const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
      if (!isLocalhost) {
        res.status(403).json({ error: 'Dev mode only available on localhost' });
        return;
      }
      
      this.playerService.clearDevTime(channelId);
      res.json({ success: true });
    });

    // Health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', channels: this.playerService.getAllChannels() });
    });
  }

  start(): void {
    const port = this.config.port;
    this.app.listen(port, () => {
      console.log(`RetroTV Server running on http://localhost:${port}`);
      console.log(`Default channel: ${this.config.defaultChannel}`);
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
