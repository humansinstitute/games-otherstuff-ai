/**
 * Chester error codes and custom error class
 */

// Player errors
export const PLAYER_EXISTS = "PLAYER_EXISTS";
export const PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND";
export const INVALID_PUBKEY = "INVALID_PUBKEY";

// Game errors
export const GAME_NOT_FOUND = "GAME_NOT_FOUND";
export const GAME_NOT_OPEN = "GAME_NOT_OPEN";
export const GAME_NOT_ACTIVE = "GAME_NOT_ACTIVE";
export const INVALID_COLOR_PREFERENCE = "INVALID_COLOR_PREFERENCE";

// Request errors
export const REQUEST_NOT_FOUND = "REQUEST_NOT_FOUND";
export const ALREADY_REQUESTED = "ALREADY_REQUESTED";
export const CANNOT_JOIN_OWN_GAME = "CANNOT_JOIN_OWN_GAME";

// Authorization errors
export const NOT_HOST = "NOT_HOST";
export const NOT_IN_GAME = "NOT_IN_GAME";
export const NOT_YOUR_TURN = "NOT_YOUR_TURN";
export const UNAUTHORIZED = "UNAUTHORIZED";

// Move errors
export const INVALID_MOVE = "INVALID_MOVE";

// Draw errors
export const DRAW_ALREADY_OFFERED = "DRAW_ALREADY_OFFERED";
export const NO_DRAW_OFFER = "NO_DRAW_OFFER";
export const CANNOT_RESPOND_OWN_OFFER = "CANNOT_RESPOND_OWN_OFFER";

/**
 * Custom error class for Chester with error code support
 */
export class ChesterError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ChesterError";
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
    };
  }
}

/**
 * Helper to create error response payload
 */
export function errorResponse(code: string, message: string) {
  return {
    success: false,
    error: code,
    message,
  };
}
