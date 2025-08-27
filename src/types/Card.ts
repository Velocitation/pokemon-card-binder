export interface PokemonCard {
  id: string;
  name: string;
  set: {
    id: string;
    name: string;
    series: string;
  };
  number: string;
  rarity: string;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    prices?: {
      holofoil?: { market: number };
      normal?: { market: number };
    };
  };
}

export interface CardFilters {
  set?: string;
  rarity?: string;
  type?: string;
}
