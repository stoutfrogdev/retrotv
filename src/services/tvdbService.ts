import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface TVDBSeriesSearchResult {
  id: number;
  name: string;
  slug: string;
  overview: string;
  year: string;
}

interface TVDBEpisode {
  id: number;
  name: string;
  overview: string;
  aired: string;
  seasonNumber: number;
  number: number;
}

interface TVDBMetadata {
  seriesName: string;
  episodeTitle: string;
  overview: string;
  airDate: string;
  tvdbId: number;
}

export class TVDBService {
  private apiKey: string;
  private baseUrl = 'https://api4.thetvdb.com/v4';
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private cache: Map<string, TVDBMetadata> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TVDB_API_KEY || '';
  }

  isEnabled(): boolean {
    return this.apiKey.length > 0;
  }

  private async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token as string;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/login`, {
        apikey: this.apiKey,
      });

      this.token = response.data.data.token;
      // Token is valid for 30 days, refresh after 29 days
      this.tokenExpiry = Date.now() + (29 * 24 * 60 * 60 * 1000);
      
      return this.token as string;
    } catch (error) {
      console.error('Failed to authenticate with TVDB:', error);
      throw new Error('TVDB authentication failed');
    }
  }

  private async request(endpoint: string): Promise<any> {
    const token = await this.getToken();
    
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, try refreshing
        this.token = null;
        const newToken = await this.getToken();
        
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        
        return response.data;
      }
      
      throw error;
    }
  }

  async searchSeries(seriesName: string): Promise<number | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const data = await this.request(`/search?query=${encodeURIComponent(seriesName)}&type=series`);
      
      if (data.data && data.data.length > 0) {
        // Return the first match
        return data.data[0].tvdb_id;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to search TVDB for "${seriesName}":`, error);
      return null;
    }
  }

  async getEpisode(seriesId: number, season: number, episode: number): Promise<TVDBEpisode | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const data = await this.request(`/series/${seriesId}/episodes/default?season=${season}&episodeNumber=${episode}`);
      
      if (data.data && data.data.episodes && data.data.episodes.length > 0) {
        const ep = data.data.episodes[0];
        return {
          id: ep.id,
          name: ep.name,
          overview: ep.overview,
          aired: ep.aired,
          seasonNumber: ep.seasonNumber,
          number: ep.number,
        };
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get episode S${season}E${episode} for series ${seriesId}:`, error);
      return null;
    }
  }

  async getSeriesName(seriesId: number): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const data = await this.request(`/series/${seriesId}`);
      return data.data?.name || null;
    } catch (error) {
      console.warn(`Failed to get series name for ${seriesId}:`, error);
      return null;
    }
  }

  async getMetadata(seriesName: string, season: number, episode: number): Promise<TVDBMetadata | null> {
    if (!this.isEnabled()) {
      return null;
    }

    // Check cache
    const cacheKey = `${seriesName}-S${season}E${episode}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Search for series
      const seriesId = await this.searchSeries(seriesName);
      if (!seriesId) {
        console.log(`No TVDB match found for: ${seriesName}`);
        return null;
      }

      // Get series details
      const seriesNameFromTVDB = await this.getSeriesName(seriesId);
      
      // Get episode details
      const episodeData = await this.getEpisode(seriesId, season, episode);
      
      if (!episodeData) {
        console.log(`No episode data found for: ${seriesName} S${season}E${episode}`);
        return null;
      }

      const metadata: TVDBMetadata = {
        seriesName: seriesNameFromTVDB || seriesName,
        episodeTitle: episodeData.name,
        overview: episodeData.overview,
        airDate: episodeData.aired,
        tvdbId: seriesId,
      };

      // Cache the result
      this.cache.set(cacheKey, metadata);
      
      return metadata;
    } catch (error) {
      console.error(`Error fetching TVDB metadata for ${seriesName} S${season}E${episode}:`, error);
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
