/**
 * Chess Logic Module
 * Handles all chess rules and game state
 */

class ChessGame {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = getInitialBoard();
        this.currentTurn = COLORS.WHITE;
        this.selectedPiece = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.enPassantTarget = null;
        this.gameOver = false;
        this.winner = null;
        this.isCheck = false;
        this.lastMove = null;
    }

    /**
     * Get piece at position
     */
    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    /**
     * Set piece at position
     */
    setPiece(row, col, piece) {
        if (row >= 0 && row <= 7 && col >= 0 && col <= 7) {
            this.board[row][col] = piece;
        }
    }

    /**
     * Find king position for a given color
     */
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.type === PIECES.KING && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * Check if a position is under attack by the opponent
     */
    isSquareAttacked(row, col, byColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPiece(r, c);
                if (piece && piece.color === byColor) {
                    const moves = this.getRawMoves(r, c, piece, true);
                    if (moves.some(m => m.row === row && m.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Check if the current player's king is in check
     */
    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        return this.isSquareAttacked(kingPos.row, kingPos.col, opponentColor);
    }

    /**
     * Get raw moves for a piece (without checking for check)
     */
    getRawMoves(row, col, piece, attackOnly = false) {
        const moves = [];
        
        switch (piece.type) {
            case PIECES.PAWN:
                this.getPawnMoves(row, col, piece, moves, attackOnly);
                break;
            case PIECES.ROOK:
                this.getSlidingMoves(row, col, piece, moves, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
                break;
            case PIECES.KNIGHT:
                this.getKnightMoves(row, col, piece, moves);
                break;
            case PIECES.BISHOP:
                this.getSlidingMoves(row, col, piece, moves, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
                break;
            case PIECES.QUEEN:
                this.getSlidingMoves(row, col, piece, moves, [
                    [0, 1], [0, -1], [1, 0], [-1, 0],
                    [1, 1], [1, -1], [-1, 1], [-1, -1]
                ]);
                break;
            case PIECES.KING:
                this.getKingMoves(row, col, piece, moves, attackOnly);
                break;
        }
        
        return moves;
    }

    /**
     * Get pawn moves
     */
    getPawnMoves(row, col, piece, moves, attackOnly) {
        const direction = piece.color === COLORS.WHITE ? -1 : 1;
        const startRow = piece.color === COLORS.WHITE ? 6 : 1;
        const promotionRow = piece.color === COLORS.WHITE ? 0 : 7;

        // Forward move (not for attack checking)
        if (!attackOnly) {
            const oneStep = row + direction;
            if (oneStep >= 0 && oneStep <= 7 && !this.getPiece(oneStep, col)) {
                moves.push({ row: oneStep, col, promotion: oneStep === promotionRow });
                
                // Two step from starting position
                if (row === startRow) {
                    const twoStep = row + 2 * direction;
                    if (!this.getPiece(twoStep, col)) {
                        moves.push({ row: twoStep, col, twoStep: true });
                    }
                }
            }
        }

        // Capture moves (diagonal)
        for (const dc of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
                const target = this.getPiece(newRow, newCol);
                
                if (attackOnly) {
                    // For attack checking, pawns attack diagonally
                    moves.push({ row: newRow, col: newCol });
                } else if (target && target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol, capture: true, promotion: newRow === promotionRow });
                }
                
                // En passant
                if (!attackOnly && this.enPassantTarget && 
                    this.enPassantTarget.row === newRow && 
                    this.enPassantTarget.col === newCol) {
                    moves.push({ row: newRow, col: newCol, enPassant: true, capture: true });
                }
            }
        }
    }

    /**
     * Get sliding piece moves (rook, bishop, queen)
     */
    getSlidingMoves(row, col, piece, moves, directions) {
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const target = this.getPiece(r, c);
                
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

    /**
     * Get knight moves
     */
    getKnightMoves(row, col, piece, moves) {
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const r = row + dr;
            const c = col + dc;
            
            if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const target = this.getPiece(r, c);
                if (!target || target.color !== piece.color) {
                    moves.push({ row: r, col: c, capture: !!target });
                }
            }
        }
    }

    /**
     * Get king moves
     */
    getKingMoves(row, col, piece, moves, attackOnly) {
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],          [0, 1],
            [1, -1],  [1, 0], [1, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const r = row + dr;
            const c = col + dc;
            
            if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const target = this.getPiece(r, c);
                if (!target || target.color !== piece.color) {
                    moves.push({ row: r, col: c, capture: !!target });
                }
            }
        }
        
        // Castling (not for attack checking)
        if (!attackOnly && !piece.hasMoved && !this.isInCheck(piece.color)) {
            this.getCastlingMoves(row, col, piece, moves);
        }
    }

    /**
     * Get castling moves
     */
    getCastlingMoves(row, col, piece, moves) {
        const opponentColor = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        
        // Kingside castling
        const kingsideRook = this.getPiece(row, 7);
        if (kingsideRook && kingsideRook.type === PIECES.ROOK && !kingsideRook.hasMoved) {
            if (!this.getPiece(row, 5) && !this.getPiece(row, 6)) {
                if (!this.isSquareAttacked(row, 5, opponentColor) && 
                    !this.isSquareAttacked(row, 6, opponentColor)) {
                    moves.push({ row, col: 6, castling: 'kingside' });
                }
            }
        }
        
        // Queenside castling
        const queensideRook = this.getPiece(row, 0);
        if (queensideRook && queensideRook.type === PIECES.ROOK && !queensideRook.hasMoved) {
            if (!this.getPiece(row, 1) && !this.getPiece(row, 2) && !this.getPiece(row, 3)) {
                if (!this.isSquareAttacked(row, 2, opponentColor) && 
                    !this.isSquareAttacked(row, 3, opponentColor)) {
                    moves.push({ row, col: 2, castling: 'queenside' });
                }
            }
        }
    }

    /**
     * Get valid moves for a piece (checking for check)
     */
    getValidMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece || piece.color !== this.currentTurn) return [];
        
        const rawMoves = this.getRawMoves(row, col, piece);
        const validMoves = [];
        
        for (const move of rawMoves) {
            // Simulate the move
            const originalBoard = copyBoard(this.board);
            const originalEnPassant = this.enPassantTarget;
            
            this.simulateMove(row, col, move.row, move.col, move);
            
            // Check if king is in check after the move
            if (!this.isInCheck(piece.color)) {
                validMoves.push(move);
            }
            
            // Restore the board
            this.board = originalBoard;
            this.enPassantTarget = originalEnPassant;
        }
        
        return validMoves;
    }

    /**
     * Simulate a move (for validation)
     */
    simulateMove(fromRow, fromCol, toRow, toCol, moveInfo) {
        const piece = this.getPiece(fromRow, fromCol);
        
        // Handle en passant capture
        if (moveInfo && moveInfo.enPassant) {
            const capturedRow = piece.color === COLORS.WHITE ? toRow + 1 : toRow - 1;
            this.setPiece(capturedRow, toCol, null);
        }
        
        // Handle castling
        if (moveInfo && moveInfo.castling) {
            if (moveInfo.castling === 'kingside') {
                const rook = this.getPiece(fromRow, 7);
                this.setPiece(fromRow, 7, null);
                this.setPiece(fromRow, 5, rook);
            } else {
                const rook = this.getPiece(fromRow, 0);
                this.setPiece(fromRow, 0, null);
                this.setPiece(fromRow, 3, rook);
            }
        }
        
        this.setPiece(toRow, toCol, piece);
        this.setPiece(fromRow, fromCol, null);
    }

    /**
     * Make a move
     */
    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
        const piece = this.getPiece(fromRow, fromCol);
        if (!piece) return false;
        
        const moveInfo = this.validMoves.find(m => m.row === toRow && m.col === toCol);
        if (!moveInfo) return false;
        
        // Store move for history
        const move = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: { ...piece },
            captured: null,
            castling: moveInfo.castling,
            enPassant: moveInfo.enPassant,
            promotion: moveInfo.promotion,
            promotionPiece: promotionPiece,
            previousEnPassant: this.enPassantTarget
        };
        
        // Handle capture
        let capturedPiece = this.getPiece(toRow, toCol);
        
        // Handle en passant capture
        if (moveInfo.enPassant) {
            const capturedRow = piece.color === COLORS.WHITE ? toRow + 1 : toRow - 1;
            capturedPiece = this.getPiece(capturedRow, toCol);
            this.setPiece(capturedRow, toCol, null);
        }
        
        if (capturedPiece) {
            move.captured = { ...capturedPiece };
            this.capturedPieces[piece.color].push(capturedPiece);
        }
        
        // Handle castling
        if (moveInfo.castling) {
            if (moveInfo.castling === 'kingside') {
                const rook = this.getPiece(fromRow, 7);
                rook.hasMoved = true;
                this.setPiece(fromRow, 7, null);
                this.setPiece(fromRow, 5, rook);
            } else {
                const rook = this.getPiece(fromRow, 0);
                rook.hasMoved = true;
                this.setPiece(fromRow, 0, null);
                this.setPiece(fromRow, 3, rook);
            }
        }
        
        // Move the piece
        piece.hasMoved = true;
        this.setPiece(toRow, toCol, piece);
        this.setPiece(fromRow, fromCol, null);
        
        // Handle pawn promotion
        if (moveInfo.promotion && promotionPiece) {
            const promotedPiece = createPiece(promotionPiece, piece.color);
            promotedPiece.hasMoved = true;
            this.setPiece(toRow, toCol, promotedPiece);
        }
        
        // Set en passant target
        if (moveInfo.twoStep) {
            this.enPassantTarget = {
                row: piece.color === COLORS.WHITE ? toRow + 1 : toRow - 1,
                col: toCol
            };
        } else {
            this.enPassantTarget = null;
        }
        
        // Store last move for highlighting
        this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
        
        // Add to history
        this.moveHistory.push(move);
        
        // Switch turn
        this.currentTurn = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        
        // Check game state
        this.checkGameState();
        
        return true;
    }

    /**
     * Check for checkmate, stalemate
     */
    checkGameState() {
        this.isCheck = this.isInCheck(this.currentTurn);
        
        // Check if current player has any valid moves
        let hasValidMoves = false;
        
        outerLoop:
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.color === this.currentTurn) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) {
                        hasValidMoves = true;
                        break outerLoop;
                    }
                }
            }
        }
        
        if (!hasValidMoves) {
            this.gameOver = true;
            if (this.isCheck) {
                // Checkmate
                this.winner = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            } else {
                // Stalemate
                this.winner = 'draw';
            }
        }
    }

    /**
     * Undo the last move
     */
    undoMove() {
        if (this.moveHistory.length === 0) return false;
        
        const move = this.moveHistory.pop();
        
        // Restore the piece to original position
        const piece = move.promotion && move.promotionPiece 
            ? createPiece(PIECES.PAWN, move.piece.color)
            : { ...move.piece };
        
        // Restore hasMoved flag
        piece.hasMoved = move.piece.hasMoved;
        
        this.setPiece(move.from.row, move.from.col, piece);
        this.setPiece(move.to.row, move.to.col, null);
        
        // Restore captured piece
        if (move.captured) {
            if (move.enPassant) {
                const capturedRow = piece.color === COLORS.WHITE ? move.to.row + 1 : move.to.row - 1;
                this.setPiece(capturedRow, move.to.col, move.captured);
            } else {
                this.setPiece(move.to.row, move.to.col, move.captured);
            }
            
            // Remove from captured pieces
            const capturedList = this.capturedPieces[piece.color];
            capturedList.pop();
        }
        
        // Restore castling
        if (move.castling) {
            if (move.castling === 'kingside') {
                const rook = this.getPiece(move.from.row, 5);
                rook.hasMoved = false;
                this.setPiece(move.from.row, 5, null);
                this.setPiece(move.from.row, 7, rook);
            } else {
                const rook = this.getPiece(move.from.row, 3);
                rook.hasMoved = false;
                this.setPiece(move.from.row, 3, null);
                this.setPiece(move.from.row, 0, rook);
            }
        }
        
        // Restore en passant target
        this.enPassantTarget = move.previousEnPassant;
        
        // Switch turn back
        this.currentTurn = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        
        // Reset game state
        this.gameOver = false;
        this.winner = null;
        this.isCheck = this.isInCheck(this.currentTurn);
        
        // Update last move
        if (this.moveHistory.length > 0) {
            const lastHistoryMove = this.moveHistory[this.moveHistory.length - 1];
            this.lastMove = { from: lastHistoryMove.from, to: lastHistoryMove.to };
        } else {
            this.lastMove = null;
        }
        
        return true;
    }

    /**
     * Get all valid moves for a color
     */
    getAllValidMoves(color) {
        const allMoves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col);
                    for (const move of moves) {
                        allMoves.push({
                            from: { row, col },
                            to: move,
                            piece
                        });
                    }
                }
            }
        }
        
        return allMoves;
    }

    /**
     * Convert move to algebraic notation
     */
    getMoveNotation(move) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        
        const piece = move.piece;
        const from = move.from;
        const to = move.to;
        
        let notation = '';
        
        // Castling
        if (move.castling === 'kingside') return 'O-O';
        if (move.castling === 'queenside') return 'O-O-O';
        
        // Piece letter (except pawn)
        if (piece.type !== PIECES.PAWN) {
            const pieceLetters = {
                [PIECES.KING]: 'K',
                [PIECES.QUEEN]: 'Q',
                [PIECES.ROOK]: 'R',
                [PIECES.BISHOP]: 'B',
                [PIECES.KNIGHT]: 'N'
            };
            notation += pieceLetters[piece.type];
        }
        
        // Capture notation
        if (move.captured) {
            if (piece.type === PIECES.PAWN) {
                notation += files[from.col];
            }
            notation += 'x';
        }
        
        // Destination square
        notation += files[to.col] + ranks[to.row];
        
        // Promotion
        if (move.promotion && move.promotionPiece) {
            const promotionLetters = {
                [PIECES.QUEEN]: 'Q',
                [PIECES.ROOK]: 'R',
                [PIECES.BISHOP]: 'B',
                [PIECES.KNIGHT]: 'N'
            };
            notation += '=' + promotionLetters[move.promotionPiece];
        }
        
        return notation;
    }
}
