import type { PokemonCard } from "../types/Card";

interface CacheEntry {
  data: PokemonCard[];
  totalCount: number;
  timestamp: number;
  expires: number;
}

export class PokemonTCGService {
  private static baseUrl = "https://api.pokemontcg.io/v2";
  private static apiKey = import.meta.env.VITE_POKEMON_TCG_API_KEY;

  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // Reduced to 5 minutes
  private static pendingRequests = new Map<string, Promise<any>>();

  // Main search - back to simple but cached approach
  static async searchCards(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    data: PokemonCard[];
    totalCount: number;
  }> {
    const cacheKey = `search:${query}:${page}:${pageSize}`;

    // Return cached result immediately
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for: ${query}`);
      return cached;
    }

    // Deduplicate simultaneous requests
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for pending request: ${query}`);
      return await this.pendingRequests.get(cacheKey)!;
    }

    console.log(`🔍 Making API request for: ${query}`);

    // Simple, reliable query
    const searchQuery = `name:${query}*`;
    const url = `${this.baseUrl}/cards?q=${encodeURIComponent(
      searchQuery
    )}&page=${page}&pageSize=${pageSize}&orderBy=-set.releaseDate,name`;

    console.log(`🌐 URL: ${url}`);

    const requestPromise = this.makeRequest(url, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      console.log(`✅ Found ${result.data.length} cards for: ${query}`);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Popular sets - fallback to simple approach with better sets
  static async searchCardsByPopularity(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    data: PokemonCard[];
    totalCount: number;
  }> {
    const cacheKey = `popular:${query}:${page}:${pageSize}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`🔥 Popular search for: ${query}`);

    // Try a few recent sets, but with simpler individual queries
    const recentSets = ["sv4pt5", "sv4", "sv3pt5", "sv3", "sv2"];

    for (const setId of recentSets) {
      try {
        const searchQuery = `name:${query}* set.id:${setId}`;
        const url = `${this.baseUrl}/cards?q=${encodeURIComponent(
          searchQuery
        )}&pageSize=${pageSize}&orderBy=name`;

        console.log(`🎯 Trying set ${setId} for ${query}`);

        const result = await this.makeRequest(url, `${cacheKey}:${setId}`);

        if (result.data.length > 0) {
          console.log(`✅ Found ${result.data.length} cards in set ${setId}`);
          this.cacheResult(cacheKey, result);
          return result;
        }
      } catch (error) {
        console.log(`❌ Set ${setId} failed, trying next...`);
        continue;
      }
    }

    console.log(
      `⚠️ No cards found in recent sets, falling back to general search`
    );
    // Fallback to regular search
    return this.searchCards(query, page, pageSize);
  }

  // Rare cards - simplified approach
  static async searchCardsByRarity(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    data: PokemonCard[];
    totalCount: number;
  }> {
    const cacheKey = `rare:${query}:${page}:${pageSize}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`⭐ Rare search for: ${query}`);

    // Try high-value rarities one by one
    const rarities = [
      "Secret Rare",
      "Ultra Rare",
      "Rare Holo GX",
      "Rare Holo V",
      "Rare Holo",
    ];

    for (const rarity of rarities) {
      try {
        const searchQuery = `name:${query}* rarity:"${rarity}"`;
        const url = `${this.baseUrl}/cards?q=${encodeURIComponent(
          searchQuery
        )}&pageSize=${pageSize}&orderBy=-set.releaseDate,name`;

        console.log(`🎯 Trying rarity "${rarity}" for ${query}`);

        const result = await this.makeRequest(url, `${cacheKey}:${rarity}`);

        if (result.data.length > 0) {
          console.log(`✅ Found ${result.data.length} ${rarity} cards`);
          this.cacheResult(cacheKey, result);
          return result;
        }
      } catch (error) {
        console.log(`❌ Rarity "${rarity}" failed, trying next...`);
        continue;
      }
    }

    console.log(`⚠️ No rare cards found, falling back to general search`);
    return this.searchCards(query, page, pageSize);
  }

  // Quick/exact search - most reliable
  static async quickSearch(
    query: string,
    pageSize: number = 16
  ): Promise<PokemonCard[]> {
    const cacheKey = `exact:${query}:${pageSize}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached.data;

    console.log(`🎯 Exact search for: ${query}`);

    try {
      // Exact name match
      const searchQuery = `name:"${query}"`;
      const url = `${this.baseUrl}/cards?q=${encodeURIComponent(
        searchQuery
      )}&pageSize=${pageSize}&orderBy=-set.releaseDate,name`;

      const result = await this.makeRequest(url, cacheKey);
      console.log(`✅ Exact search found ${result.data.length} cards`);

      return result.data;
    } catch (error) {
      console.error(`❌ Exact search failed:`, error);
      return [];
    }
  }

  // Core request method with better error handling
  private static async makeRequest(
    url: string,
    cacheKey: string
  ): Promise<{
    data: PokemonCard[];
    totalCount: number;
  }> {
    try {
      const headers: Record<string, string> = {};

      if (this.apiKey) {
        headers["X-Api-Key"] = this.apiKey;
        console.log(`🔑 Using API key`);
      } else {
        console.log(`⚠️ No API key - using rate limited requests`);
      }

      console.log(`📤 Making request to: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Request timeout for: ${url}`);
        controller.abort();
      }, 60000); // 1 minute timeout

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📥 Response status: ${response.status} for ${url}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`📊 API returned ${result.data?.length || 0} cards`);

      const data = {
        data: result.data || [],
        totalCount: result.totalCount || 0,
      };

      // Cache successful results
      this.cacheResult(cacheKey, data);

      return data;
    } catch (error) {
      console.error(`💥 Request failed for ${cacheKey}:`, error);

      // Return empty result instead of throwing
      return {
        data: [],
        totalCount: 0,
      };
    }
  }

  // Simple cache methods
  private static getFromCache(
    cacheKey: string
  ): { data: PokemonCard[]; totalCount: number } | null {
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expires) {
      return {
        data: cached.data,
        totalCount: cached.totalCount,
      };
    }

    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private static cacheResult(
    cacheKey: string,
    data: { data: PokemonCard[]; totalCount: number }
  ): void {
    const now = Date.now();

    this.cache.set(cacheKey, {
      data: data.data,
      totalCount: data.totalCount,
      timestamp: now,
      expires: now + this.CACHE_DURATION,
    });
  }

  // Utility methods
  static async getCard(cardId: string): Promise<PokemonCard | null> {
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers["X-Api-Key"] = this.apiKey;
      }

      const response = await fetch(`${this.baseUrl}/cards/${cardId}`, {
        headers,
      });

      if (!response.ok) return null;

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Get card failed:", error);
      return null;
    }
  }

  // Debug methods
  static clearCache(): void {
    this.cache.clear();
    console.log("🗑️ Pokemon API cache cleared");
  }

  static getCacheStats(): { size: number; entries: string[] } {
    console.log(`📊 Cache contains ${this.cache.size} entries`);
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  // Test method to verify API connectivity
  static async testConnection(): Promise<boolean> {
    try {
      console.log("🔧 Testing API connection...");
      const result = await this.searchCards("pikachu", 1, 5);
      const success = result.data.length > 0;
      console.log(
        `🔧 API test ${success ? "PASSED" : "FAILED"}: found ${
          result.data.length
        } cards`
      );
      return success;
    } catch (error) {
      console.error("🔧 API test FAILED:", error);
      return false;
    }
  }
}
