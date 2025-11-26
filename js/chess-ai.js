/**
 * Chess AI Module
 * Implements minimax algorithm with alpha-beta pruning
 */

class ChessAI {
    constructor(difficulty = 'medium') {
        this.setDifficulty(difficulty);
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        switch (difficulty) {
            case 'easy':
                this.maxDepth = 2;
                this.randomFactor = 0.3; // 30% chance of random move
                break;
            case 'medium':
                this.maxDepth = 3;
                this.randomFactor = 0.1; // 10% chance of suboptimal move
                break;
            case 'hard':
                this.maxDepth = 4;
                this.randomFactor = 0; // Always optimal move
                break;
            default:
                this.maxDepth = 3;
                this.randomFactor = 0.1;
        }
    }

    /**
     * Get the best move for the AI
     */
    getBestMove(game) {
        const color = game.currentTurn;
        const moves = game.getAllValidMoves(color);
        
        if (moves.length === 0) return null;
        
        // Easy mode: sometimes make random moves
        if (this.randomFactor > 0 && Math.random() < this.randomFactor) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        
        let bestMove = null;
        let bestScore = -Infinity;
        const alpha = -Infinity;
        const beta = Infinity;
        
        // Sort moves for better alpha-beta pruning
        const sortedMoves = this.sortMoves(moves, game);
        
        for (const move of sortedMoves) {
            // Save game state
            const originalBoard = copyBoard(game.board);
            const originalEnPassant = game.enPassantTarget;
            const originalTurn = game.currentTurn;
            
            // Make the move
            game.board = copyBoard(game.board);
            this.makeSimulatedMove(game, move);
            game.currentTurn = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            
            // Evaluate using minimax
            const score = this.minimax(game, this.maxDepth - 1, alpha, beta, false, color);
            
            // Restore game state
            game.board = originalBoard;
            game.enPassantTarget = originalEnPassant;
            game.currentTurn = originalTurn;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    /**
     * Minimax algorithm with alpha-beta pruning
     */
    minimax(game, depth, alpha, beta, isMaximizing, aiColor) {
        // Check for terminal state or depth limit
        if (depth === 0) {
            return this.evaluateBoard(game, aiColor);
        }
        
        const currentColor = game.currentTurn;
        const moves = this.getAllValidMovesForMinimax(game, currentColor);
        
        if (moves.length === 0) {
            // Check for checkmate or stalemate
            const isCheck = this.isKingInCheck(game, currentColor);
            if (isCheck) {
                // Checkmate - very bad for the player in check
                return isMaximizing ? -100000 + (this.maxDepth - depth) : 100000 - (this.maxDepth - depth);
            } else {
                // Stalemate
                return 0;
            }
        }
        
        if (isMaximizing) {
            let maxScore = -Infinity;
            
            for (const move of moves) {
                const originalBoard = copyBoard(game.board);
                const originalEnPassant = game.enPassantTarget;
                
                this.makeSimulatedMove(game, move);
                game.currentTurn = currentColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                
                const score = this.minimax(game, depth - 1, alpha, beta, false, aiColor);
                
                game.board = originalBoard;
                game.enPassantTarget = originalEnPassant;
                game.currentTurn = currentColor;
                
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                
                if (beta <= alpha) break; // Beta cutoff
            }
            
            return maxScore;
        } else {
            let minScore = Infinity;
            
            for (const move of moves) {
                const originalBoard = copyBoard(game.board);
                const originalEnPassant = game.enPassantTarget;
                
                this.makeSimulatedMove(game, move);
                game.currentTurn = currentColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                
                const score = this.minimax(game, depth - 1, alpha, beta, true, aiColor);
                
                game.board = originalBoard;
                game.enPassantTarget = originalEnPassant;
                game.currentTurn = currentColor;
                
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                
                if (beta <= alpha) break; // Alpha cutoff
            }
            
            return minScore;
        }
    }

    /**
     * Sort moves for better alpha-beta pruning
     */
    sortMoves(moves, game) {
        return moves.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            
            // Prioritize captures - use move's capture flag and get piece value from board
            if (a.to.capture) {
                const capturedPieceA = game.getPiece(a.to.row, a.to.col);
                scoreA += 10 + (capturedPieceA ? PIECE_VALUES[capturedPieceA.type] / 100 : 0);
            }
            if (b.to.capture) {
                const capturedPieceB = game.getPiece(b.to.row, b.to.col);
                scoreB += 10 + (capturedPieceB ? PIECE_VALUES[capturedPieceB.type] / 100 : 0);
            }
            
            // Prioritize center control
            const centerDist = (row, col) => Math.abs(row - 3.5) + Math.abs(col - 3.5);
            scoreA -= centerDist(a.to.row, a.to.col);
            scoreB -= centerDist(b.to.row, b.to.col);
            
            return scoreB - scoreA;
        });
    }

    /**
     * Make a simulated move (for AI evaluation)
     */
    makeSimulatedMove(game, move) {
        const piece = game.getPiece(move.from.row, move.from.col);
        if (!piece) return;
        
        // Handle en passant
        if (move.to.enPassant) {
            const capturedRow = piece.color === COLORS.WHITE ? move.to.row + 1 : move.to.row - 1;
            game.setPiece(capturedRow, move.to.col, null);
        }
        
        // Handle castling
        if (move.to.castling) {
            if (move.to.castling === 'kingside') {
                const rook = game.getPiece(move.from.row, 7);
                game.setPiece(move.from.row, 7, null);
                game.setPiece(move.from.row, 5, rook);
            } else {
                const rook = game.getPiece(move.from.row, 0);
                game.setPiece(move.from.row, 0, null);
                game.setPiece(move.from.row, 3, rook);
            }
        }
        
        // Move piece
        game.setPiece(move.to.row, move.to.col, piece);
        game.setPiece(move.from.row, move.from.col, null);
        
        // Handle promotion (always promote to queen for AI)
        if (move.to.promotion) {
            const promotedPiece = createPiece(PIECES.QUEEN, piece.color);
            game.setPiece(move.to.row, move.to.col, promotedPiece);
        }
        
        // Update en passant target
        if (move.to.twoStep) {
            game.enPassantTarget = {
                row: piece.color === COLORS.WHITE ? move.to.row + 1 : move.to.row - 1,
                col: move.to.col
            };
        } else {
            game.enPassantTarget = null;
        }
    }

    /**
     * Get all valid moves for minimax (simplified version)
     */
    getAllValidMovesForMinimax(game, color) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.getPiece(row, col);
                if (piece && piece.color === color) {
                    const pieceMoves = this.getValidMovesForMinimax(game, row, col, piece);
                    for (const m of pieceMoves) {
                        moves.push({
                            from: { row, col },
                            to: m,
                            piece
                        });
                    }
                }
            }
        }
        
        return moves;
    }

    /**
     * Get valid moves for a piece in minimax context
     */
    getValidMovesForMinimax(game, row, col, piece) {
        const rawMoves = this.getRawMovesForMinimax(game, row, col, piece);
        const validMoves = [];
        
        for (const move of rawMoves) {
            const originalBoard = copyBoard(game.board);
            
            // Simulate move
            game.board = copyBoard(game.board);
            
            // Handle en passant
            if (move.enPassant) {
                const capturedRow = piece.color === COLORS.WHITE ? move.row + 1 : move.row - 1;
                game.setPiece(capturedRow, move.col, null);
            }
            
            // Handle castling
            if (move.castling) {
                if (move.castling === 'kingside') {
                    const rook = game.getPiece(row, 7);
                    game.setPiece(row, 7, null);
                    game.setPiece(row, 5, rook);
                } else {
                    const rook = game.getPiece(row, 0);
                    game.setPiece(row, 0, null);
                    game.setPiece(row, 3, rook);
                }
            }
            
            game.setPiece(move.row, move.col, piece);
            game.setPiece(row, col, null);
            
            // Check if move leaves king in check
            if (!this.isKingInCheck(game, piece.color)) {
                validMoves.push(move);
            }
            
            game.board = originalBoard;
        }
        
        return validMoves;
    }

    /**
     * Get raw moves for AI (simplified)
     */
    getRawMovesForMinimax(game, row, col, piece) {
        const moves = [];
        
        switch (piece.type) {
            case PIECES.PAWN:
                this.getPawnMovesForMinimax(game, row, col, piece, moves);
                break;
            case PIECES.ROOK:
                this.getSlidingMovesForMinimax(game, row, col, piece, moves, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
                break;
            case PIECES.KNIGHT:
                this.getKnightMovesForMinimax(game, row, col, piece, moves);
                break;
            case PIECES.BISHOP:
                this.getSlidingMovesForMinimax(game, row, col, piece, moves, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
                break;
            case PIECES.QUEEN:
                this.getSlidingMovesForMinimax(game, row, col, piece, moves, [
                    [0, 1], [0, -1], [1, 0], [-1, 0],
                    [1, 1], [1, -1], [-1, 1], [-1, -1]
                ]);
                break;
            case PIECES.KING:
                this.getKingMovesForMinimax(game, row, col, piece, moves);
                break;
        }
        
        return moves;
    }

    getPawnMovesForMinimax(game, row, col, piece, moves) {
        const direction = piece.color === COLORS.WHITE ? -1 : 1;
        const startRow = piece.color === COLORS.WHITE ? 6 : 1;
        const promotionRow = piece.color === COLORS.WHITE ? 0 : 7;

        // Forward move
        const oneStep = row + direction;
        if (oneStep >= 0 && oneStep <= 7 && !game.getPiece(oneStep, col)) {
            moves.push({ row: oneStep, col, promotion: oneStep === promotionRow });
            
            if (row === startRow) {
                const twoStep = row + 2 * direction;
                if (!game.getPiece(twoStep, col)) {
                    moves.push({ row: twoStep, col, twoStep: true });
                }
            }
        }

        // Captures
        for (const dc of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
                const target = game.getPiece(newRow, newCol);
                
                if (target && target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol, capture: true, promotion: newRow === promotionRow });
                }
                
                if (game.enPassantTarget && 
                    game.enPassantTarget.row === newRow && 
                    game.enPassantTarget.col === newCol) {
                    moves.push({ row: newRow, col: newCol, enPassant: true, capture: true });
                }
            }
        }
    }

    getSlidingMovesForMinimax(game, row, col, piece, moves, directions) {
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const target = game.getPiece(r, c);
                
                if (!target) {
                    moves.push({ row: r, col: c });
                } else {
                    if (target.color !== piece.color) {
                        moves.push({ row: r, col: c, capture: true });
                    }
                    break;
                }
                
                r += dr;
                c += dc;
            }
        }
    }

    getKnightMovesForMinimax(game, row, col, piece, moves) {
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const r = row + dr;
            const c = col + dc;
            
            if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const target = game.getPiece(r, c);
                if (!target || target.color !== piece.color) {
                    moves.push({ row: r, col: c, capture: !!target });
                }
            }
        }
    }

    getKingMovesForMinimax(game, row, col, piece, moves) {
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],          [0, 1],
            [1, -1],  [1, 0], [1, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const r = row + dr;
            const c = col + dc;
            
            if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const target = game.getPiece(r, c);
                if (!target || target.color !== piece.color) {
                    moves.push({ row: r, col: c, capture: !!target });
                }
            }
        }
        
        // Castling
        if (!piece.hasMoved && !this.isKingInCheck(game, piece.color)) {
            const opponentColor = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            
            // Kingside
            const kingsideRook = game.getPiece(row, 7);
            if (kingsideRook && kingsideRook.type === PIECES.ROOK && !kingsideRook.hasMoved) {
                if (!game.getPiece(row, 5) && !game.getPiece(row, 6)) {
                    if (!this.isSquareAttackedForMinimax(game, row, 5, opponentColor) && 
                        !this.isSquareAttackedForMinimax(game, row, 6, opponentColor)) {
                        moves.push({ row, col: 6, castling: 'kingside' });
                    }
                }
            }
            
            // Queenside
            const queensideRook = game.getPiece(row, 0);
            if (queensideRook && queensideRook.type === PIECES.ROOK && !queensideRook.hasMoved) {
                if (!game.getPiece(row, 1) && !game.getPiece(row, 2) && !game.getPiece(row, 3)) {
                    if (!this.isSquareAttackedForMinimax(game, row, 2, opponentColor) && 
                        !this.isSquareAttackedForMinimax(game, row, 3, opponentColor)) {
                        moves.push({ row, col: 2, castling: 'queenside' });
                    }
                }
            }
        }
    }

    /**
     * Check if king is in check
     */
    isKingInCheck(game, color) {
        // Find king
        let kingRow = -1, kingCol = -1;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = game.getPiece(r, c);
                if (p && p.type === PIECES.KING && p.color === color) {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
            if (kingRow !== -1) break;
        }
        
        if (kingRow === -1) return false;
        
        const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        return this.isSquareAttackedForMinimax(game, kingRow, kingCol, opponentColor);
    }

    /**
     * Check if square is attacked
     */
    isSquareAttackedForMinimax(game, row, col, byColor) {
        // Check pawn attacks
        const pawnDir = byColor === COLORS.WHITE ? 1 : -1;
        for (const dc of [-1, 1]) {
            const pr = row + pawnDir;
            const pc = col + dc;
            if (pr >= 0 && pr <= 7 && pc >= 0 && pc <= 7) {
                const p = game.getPiece(pr, pc);
                if (p && p.type === PIECES.PAWN && p.color === byColor) return true;
            }
        }
        
        // Check knight attacks
        const knightOffsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of knightOffsets) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const p = game.getPiece(nr, nc);
                if (p && p.type === PIECES.KNIGHT && p.color === byColor) return true;
            }
        }
        
        // Check king attacks
        const kingOffsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],          [0, 1],
            [1, -1],  [1, 0], [1, 1]
        ];
        for (const [dr, dc] of kingOffsets) {
            const kr = row + dr;
            const kc = col + dc;
            if (kr >= 0 && kr <= 7 && kc >= 0 && kc <= 7) {
                const p = game.getPiece(kr, kc);
                if (p && p.type === PIECES.KING && p.color === byColor) return true;
            }
        }
        
        // Check sliding piece attacks (rook, bishop, queen)
        const directions = [
            { dirs: [[0, 1], [0, -1], [1, 0], [-1, 0]], types: [PIECES.ROOK, PIECES.QUEEN] },
            { dirs: [[1, 1], [1, -1], [-1, 1], [-1, -1]], types: [PIECES.BISHOP, PIECES.QUEEN] }
        ];
        
        for (const { dirs, types } of directions) {
            for (const [dr, dc] of dirs) {
                let r = row + dr;
                let c = col + dc;
                
                while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                    const p = game.getPiece(r, c);
                    if (p) {
                        if (p.color === byColor && types.includes(p.type)) return true;
                        break;
                    }
                    r += dr;
                    c += dc;
                }
            }
        }
        
        return false;
    }

    /**
     * Evaluate the board position
     */
    evaluateBoard(game, aiColor) {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.getPiece(row, col);
                if (!piece) continue;
                
                // Material value
                let pieceValue = PIECE_VALUES[piece.type];
                
                // Position bonus
                const positionBonus = POSITION_BONUS[piece.type]?.[piece.color]?.[row]?.[col] || 0;
                pieceValue += positionBonus;
                
                // Add or subtract based on piece color relative to AI
                if (piece.color === aiColor) {
                    score += pieceValue;
                } else {
                    score -= pieceValue;
                }
            }
        }
        
        // Bonus for controlling center
        const centerSquares = [[3, 3], [3, 4], [4, 3], [4, 4]];
        for (const [r, c] of centerSquares) {
            const piece = game.getPiece(r, c);
            if (piece) {
                if (piece.color === aiColor) score += 10;
                else score -= 10;
            }
        }
        
        // Check/checkmate evaluation
        const opponentColor = aiColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        if (this.isKingInCheck(game, opponentColor)) {
            score += 50;
        }
        if (this.isKingInCheck(game, aiColor)) {
            score -= 50;
        }
        
        return score;
    }
}
