export type GameStatus = "pending" | "active" | "completed" | "aborted";

export interface Player {
  id: number;
  handle: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: number;
  white_player_id: number | null;
  black_player_id: number | null;
  status: GameStatus;
  current_fen: string;
  result: string | null;
  white_secret: string | null;
  black_secret: string | null;
  draw_offer_by: number | null;
  winner_player_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface MoveRecord {
  id: number;
  game_id: number;
  ply_number: number;
  player_id: number;
  san: string;
  from_square: string;
  to_square: string;
  fen_before: string;
  fen_after: string;
  created_at: string;
}
