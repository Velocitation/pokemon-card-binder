import type { PokemonCard, CardFilters } from "../types/Card";

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
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        pageSize: "20",
      });

      const response = await fetch(`${this.baseUrl}/cards?${params}`, {
        headers: this.apiKey
          ? {
              "X-Api-Key": this.apiKey,
            }
          : {},
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();

      return {
        data: result.data || [],
        totalCount: result.totalCount || 0,
      };
    } catch (error) {
      console.error("Failed to search cards:", error);
      return { data: [], totalCount: 0 };
    }
  }

  static async getCard(cardId: string): Promise<PokemonCard | null> {
    try {
      const response = await fetch(`${this.baseUrl}/cards/${cardId}`, {
        headers: this.apiKey
          ? {
              "X-Api-Key": this.apiKey,
            }
          : {},
      });

      if (!response.ok) return null;

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Failed to get card:", error);
      return null;
    }
  }
}
