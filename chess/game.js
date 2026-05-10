/**
 * Chester Chess Game Engine
 * - Uses chess.js for move validation and game rules
 * - Implements minimax AI with alpha-beta pruning
 * - Handles user interaction and game state
 */

// Game states
export const GameState = {
  START_SCREEN: 'START_SCREEN',
  PLAYING: 'PLAYING',
  COMPUTER_THINKING: 'COMPUTER_THINKING',
  GAME_OVER: 'GAME_OVER',
  PROMOTION_SELECT: 'PROMOTION_SELECT'
};

// Piece values for AI evaluation
const PIECE_VALUES = {
  p: 100,   // pawn
  n: 320,   // knight
  b: 330,   // bishop
  r: 500,   // rook
  q: 900,   // queen
  k: 20000  // king
};

// Piece-square tables for positional evaluation
const PST = {
  p: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

export class ChessGame {
  constructor() {
    this.chess = null;
    this.state = GameState.START_SCREEN;
    this.playerColor = 'w'; // Player plays white by default
    this.selectedSquare = null;
    this.validMoves = [];
    this.moveHistory = [];
    this.aiDepth = 3; // Search depth for AI
    this.pendingPromotion = null;

    // Callbacks
    this.onStateChange = null;
    this.onBoardUpdate = null;
    this.onMoveComplete = null;
  }

  async init() {
    // Load chess.js from CDN
    const { Chess } = await import('https://esm.sh/chess.js@1.0.0-beta.8');
    this.Chess = Chess;
    this.chess = new Chess();
  }

  setState(newState, data = {}) {
    const oldState = this.state;
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState, oldState, data);
    }
  }

  async start(playerColor = 'w') {
    if (!this.Chess) {
      await this.init();
    }

    this.chess = new this.Chess();
    this.playerColor = playerColor;
    this.selectedSquare = null;
    this.validMoves = [];
    this.moveHistory = [];
    this.pendingPromotion = null;

    this.setState(GameState.PLAYING);

    if (this.onBoardUpdate) {
      this.onBoardUpdate(this.getBoardState());
    }

    // If player chose black, computer moves first
    if (this.playerColor === 'b') {
      await this.makeComputerMove();
    }
  }

  restart() {
    this.start(this.playerColor);
  }

  getBoardState() {
    const board = this.chess.board();
    return {
      board,
      turn: this.chess.turn(),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
      selectedSquare: this.selectedSquare,
      validMoves: this.validMoves,
      moveHistory: this.moveHistory,
      lastMove: this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null
    };
  }

  squareToCoords(square) {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, ...
    const rank = 8 - parseInt(square[1]);   // 8=0, 7=1, ...
    return { file, rank };
  }

  coordsToSquare(file, rank) {
    return String.fromCharCode(97 + file) + (8 - rank);
  }

  handleSquareClick(file, rank) {
    if (this.state !== GameState.PLAYING) return;
    if (this.chess.turn() !== this.playerColor) return;

    const square = this.coordsToSquare(file, rank);
    const piece = this.chess.get(square);

    // If a square is already selected
    if (this.selectedSquare) {
      // Check if clicking on a valid move destination
      const moveObj = this.validMoves.find(m => m.to === square);

      if (moveObj) {
        // Check for pawn promotion
        if (moveObj.promotion) {
          this.pendingPromotion = { from: this.selectedSquare, to: square };
          this.setState(GameState.PROMOTION_SELECT);
          return;
        }

        this.makePlayerMove(this.selectedSquare, square);
        return;
      }

      // Clicking on own piece - select it instead
      if (piece && piece.color === this.playerColor) {
        this.selectSquare(square);
        return;
      }

      // Clicking elsewhere - deselect
      this.deselectSquare();
      return;
    }

    // No square selected - try to select this one
    if (piece && piece.color === this.playerColor) {
      this.selectSquare(square);
    }
  }

  selectSquare(square) {
    this.selectedSquare = square;
    this.validMoves = this.chess.moves({ square, verbose: true });

    if (this.onBoardUpdate) {
      this.onBoardUpdate(this.getBoardState());
    }
  }

  deselectSquare() {
    this.selectedSquare = null;
    this.validMoves = [];

    if (this.onBoardUpdate) {
      this.onBoardUpdate(this.getBoardState());
    }
  }

  selectPromotion(pieceType) {
    if (this.state !== GameState.PROMOTION_SELECT || !this.pendingPromotion) return;

    const { from, to } = this.pendingPromotion;
    this.pendingPromotion = null;
    this.makePlayerMove(from, to, pieceType);
  }

  cancelPromotion() {
    this.pendingPromotion = null;
    this.deselectSquare();
    this.setState(GameState.PLAYING);
  }

  makePlayerMove(from, to, promotion = null) {
    const moveConfig = { from, to };
    if (promotion) {
      moveConfig.promotion = promotion;
    }

    const move = this.chess.move(moveConfig);

    if (move) {
      this.moveHistory.push(move);
      this.selectedSquare = null;
      this.validMoves = [];

      if (this.onMoveComplete) {
        this.onMoveComplete(move, 'player');
      }

      if (this.onBoardUpdate) {
        this.onBoardUpdate(this.getBoardState());
      }

      // Check if game is over
      if (this.chess.isGameOver()) {
        this.handleGameOver();
        return;
      }

      // Computer's turn
      this.makeComputerMove();
    }
  }

  async makeComputerMove() {
    this.setState(GameState.COMPUTER_THINKING);

    // Small delay to show thinking state
    await new Promise(resolve => setTimeout(resolve, 300));

    const move = this.findBestMove();

    if (move) {
      this.chess.move(move);
      this.moveHistory.push(move);

      if (this.onMoveComplete) {
        this.onMoveComplete(move, 'computer');
      }

      if (this.onBoardUpdate) {
        this.onBoardUpdate(this.getBoardState());
      }

      // Check if game is over
      if (this.chess.isGameOver()) {
        this.handleGameOver();
        return;
      }
    }

    this.setState(GameState.PLAYING);
  }

  handleGameOver() {
    let result;

    if (this.chess.isCheckmate()) {
      // Whoever's turn it is, lost (they are in checkmate)
      result = this.chess.turn() === this.playerColor ? 'loss' : 'win';
    } else if (this.chess.isDraw() || this.chess.isStalemate()) {
      result = 'draw';
    } else {
      result = 'draw'; // Default to draw for other game over conditions
    }

    this.setState(GameState.GAME_OVER, {
      result,
      moves: Math.ceil(this.moveHistory.length / 2)
    });
  }

  // AI Implementation using Minimax with Alpha-Beta Pruning
  evaluateBoard() {
    if (this.chess.isCheckmate()) {
      return this.chess.turn() === 'w' ? -Infinity : Infinity;
    }

    if (this.chess.isDraw() || this.chess.isStalemate()) {
      return 0;
    }

    let score = 0;
    const board = this.chess.board();

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const pieceValue = PIECE_VALUES[piece.type];
          const pst = PST[piece.type];

          // Get positional value (flip for black pieces)
          let posValue = 0;
          if (pst) {
            if (piece.color === 'w') {
              posValue = pst[rank][file];
            } else {
              posValue = pst[7 - rank][file];
            }
          }

          const totalValue = pieceValue + posValue;

          if (piece.color === 'w') {
            score += totalValue;
          } else {
            score -= totalValue;
          }
        }
      }
    }

    return score;
  }

  minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0 || this.chess.isGameOver()) {
      return this.evaluateBoard();
    }

    const moves = this.chess.moves({ verbose: true });

    // Move ordering: captures first, then checks
    moves.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      if (a.captured) scoreA += PIECE_VALUES[a.captured];
      if (b.captured) scoreB += PIECE_VALUES[b.captured];
      if (a.san.includes('+')) scoreA += 50;
      if (b.san.includes('+')) scoreB += 50;
      return scoreB - scoreA;
    });

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        this.chess.move(move);
        const evaluation = this.minimax(depth - 1, alpha, beta, false);
        this.chess.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        this.chess.move(move);
        const evaluation = this.minimax(depth - 1, alpha, beta, true);
        this.chess.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  findBestMove() {
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    const isMaximizing = this.chess.turn() === 'w';
    let bestMove = null;
    let bestValue = isMaximizing ? -Infinity : Infinity;

    // Shuffle moves for variety when equal
    for (let i = moves.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [moves[i], moves[j]] = [moves[j], moves[i]];
    }

    for (const move of moves) {
      this.chess.move(move);
      const value = this.minimax(this.aiDepth - 1, -Infinity, Infinity, !isMaximizing);
      this.chess.undo();

      if (isMaximizing) {
        if (value > bestValue) {
          bestValue = value;
          bestMove = move;
        }
      } else {
        if (value < bestValue) {
          bestValue = value;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  // Utility methods
  getMoveCount() {
    return Math.ceil(this.moveHistory.length / 2);
  }

  getPlayerColorName() {
    return this.playerColor === 'w' ? 'white' : 'black';
  }

  getFen() {
    return this.chess.fen();
  }

  getPgn() {
    return this.chess.pgn();
  }
}
