export interface CardPosition {
  cardId: string | null;
  row: number;
  col: number;
  rotation?: number;
  isEmpty?: boolean;
}

export interface BinderLayout {
  id: string;
  name: string;
  description?: string;
  dimensions: {
    rows: number;
    cols: number;
  };
  cardPositions: CardPosition[];
  template: string;
  maxPage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BinderTemplate {
  id: string;
  name: string;
  dimensions: { rows: number; cols: number };
  description: string;
  isDefault: boolean;
  maxPage: number;
}
