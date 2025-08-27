import type { PokemonCard } from "../types/Card";

export class PokemonTCGService {
  private static baseUrl = "https://api.pokemontcg.io/v2";
  private static apiKey = import.meta.env.VITE_POKEMON_TCG_API_KEY;

  static async searchCards(
    query: string,
    page: number = 1
  ): Promise<{
    data: PokemonCard[];
    totalCount: number;
  }> {
    // Simple query with newest sets first
    const searchQuery = `name:${query}*`;

    const url = `${this.baseUrl}/cards?q=${encodeURIComponent(
      searchQuery
    )}&page=${page}&pageSize=16&orderBy=-set.releaseDate,name`;

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }

    const response = await fetch(url, { headers });
    const result = await response.json();

    return {
      data: result.data || [],
      totalCount: result.totalCount || 0,
    };
  }

  // Alternative search with specific set filtering
  static async searchCardsByPopularity(
    query: string,
    page: number = 1
  ): Promise<{
    data: PokemonCard[];
    totalCount: number;
  }> {
    // Search recent/popular sets first
    const recentSets = [
      "sv4pt5", // Paldean Fates
      "sv4", // Paradox Rift
      "sv3pt5", // 151
      "sv3", // Obsidian Flames
      "sv2", // Paldea Evolved
      "sv1", // Scarlet & Violet Base
      "swsh12", // Silver Tempest
      "swsh11", // Lost Origin
      "swsh10", // Astral Radiance
      "swsh9", // Brilliant Stars
    ];

    // Try recent sets first, then fall back to all sets
    for (const setId of recentSets) {
      const searchQuery = `name:${query}* set.id:${setId}`;
      const url = `${this.baseUrl}/cards?q=${encodeURIComponent(
        searchQuery
      )}&page=1&pageSize=8&orderBy=name`;

      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers["X-Api-Key"] = this.apiKey;
      }

      const response = await fetch(url, { headers });
      const result = await response.json();

      if (result.data && result.data.length > 0) {
        return {
          data: result.data,
          totalCount: result.totalCount || result.data.length,
        };
      }
    }

    // Fallback to regular search if no recent sets found
    return this.searchCards(query, page);
  }

  // Search with rarity preference (rare cards first)
  static async searchCardsByRarity(
    query: string,
    page: number = 1
  ): Promise<{
    data: PokemonCard[];
    totalCount: number;
  }> {
    const rarityOrder = [
      "Amazing Rare",
      "Secret Rare",
      "Ultra Rare",
      "Rare ACE",
      "Rare BREAK",
      "Rare Holo GX",
      "Rare Holo EX",
      "Rare Holo V",
      "Rare Holo VMAX",
      "Rare Holo",
      "Rare",
    ];

    // Try each rarity tier
    for (const rarity of rarityOrder) {
      const searchQuery = `name:${query}* rarity:"${rarity}"`;
      const url = `${this.baseUrl}/cards?q=${encodeURIComponent(
        searchQuery
      )}&page=1&pageSize=6&orderBy=-set.releaseDate,name`;

      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers["X-Api-Key"] = this.apiKey;
      }

      const response = await fetch(url, { headers });
      const result = await response.json();

      if (result.data && result.data.length > 0) {
        return {
          data: result.data,
          totalCount: result.totalCount || result.data.length,
        };
      }
    }

    return this.searchCards(query, page);
  }

  // Quick search for exact matches in recent sets
  static async quickSearch(query: string): Promise<PokemonCard[]> {
    const searchQuery = `name:"${query}"`;
    const url = `${this.baseUrl}/cards?q=${encodeURIComponent(
      searchQuery
    )}&pageSize=12&orderBy=-set.releaseDate,name`;

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }

    const response = await fetch(url, { headers });
    const result = await response.json();

    return result.data || [];
  }

  static async getCard(cardId: string): Promise<PokemonCard | null> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}/cards/${cardId}`, {
      headers,
    });
    const result = await response.json();
    return result.data;
  }
}
