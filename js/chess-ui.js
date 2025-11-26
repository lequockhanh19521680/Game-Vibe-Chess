/**
 * Chess UI Module
 * Handles all UI rendering and interactions
 */

class ChessUI {
    constructor(game) {
        this.game = game;
        this.boardElement = document.getElementById('chessboard');
        this.turnDisplay = document.getElementById('turn-display');
        this.gameStatus = document.getElementById('game-status');
        this.moveList = document.getElementById('move-list');
        this.capturedByWhite = document.getElementById('captured-by-white');
        this.capturedByBlack = document.getElementById('captured-by-black');
        this.promotionModal = document.getElementById('promotion-modal');
        this.promotionPieces = document.getElementById('promotion-pieces');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.gameOverTitle = document.getElementById('game-over-title');
        this.gameOverMessage = document.getElementById('game-over-message');
        
        this.selectedSquare = null;
        this.flipped = false;
        this.pendingPromotion = null;
        
        // Callbacks for integration with main app (AI mode, etc.)
        this.onMoveComplete = null;
        this.onPromotionComplete = null;
        this.canInteract = null;
        
        this.initBoard();
    }

    /**
     * Initialize the chess board
     */
    initBoard() {
        this.boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const displayRow = this.flipped ? 7 - row : row;
                const displayCol = this.flipped ? 7 - col : col;
                
                square.className = 'square';
                square.classList.add((displayRow + displayCol) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = displayRow;
                square.dataset.col = displayCol;
                
                // Add coordinate labels
                if (col === 7) {
                    square.classList.add('rank-label');
                    square.dataset.rank = 8 - displayRow;
                }
                if (row === 7) {
                    square.classList.add('file-label');
                    square.dataset.file = String.fromCharCode(97 + displayCol);
                }
                
                square.addEventListener('click', () => this.handleSquareClick(displayRow, displayCol));
                this.boardElement.appendChild(square);
            }
        }
        
        this.render();
    }

    /**
     * Render the current board state
     */
    render() {
        const squares = this.boardElement.querySelectorAll('.square');
        
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.game.getPiece(row, col);
            
            // Clear previous classes
            square.classList.remove('selected', 'valid-move', 'valid-capture', 'check', 'last-move');
            
            // Render piece
            if (piece) {
                const pieceClass = piece.color === COLORS.BLACK ? 'piece black-piece' : 'piece';
                square.innerHTML = `<span class="${pieceClass}">${piece.symbol}</span>`;
            } else {
                square.innerHTML = '';
            }
            
            // Highlight selected square
            if (this.selectedSquare && 
                this.selectedSquare.row === row && 
                this.selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            // Highlight valid moves
            if (this.game.validMoves.some(m => m.row === row && m.col === col)) {
                if (this.game.getPiece(row, col) || 
                    this.game.validMoves.find(m => m.row === row && m.col === col)?.enPassant) {
                    square.classList.add('valid-capture');
                } else {
                    square.classList.add('valid-move');
                }
            }
            
            // Highlight king in check
            if (this.game.isCheck) {
                const kingPos = this.game.findKing(this.game.currentTurn);
                if (kingPos && kingPos.row === row && kingPos.col === col) {
                    square.classList.add('check');
                }
            }
            
            // Highlight last move
            if (this.game.lastMove) {
                if ((this.game.lastMove.from.row === row && this.game.lastMove.from.col === col) ||
                    (this.game.lastMove.to.row === row && this.game.lastMove.to.col === col)) {
                    square.classList.add('last-move');
                }
            }
        });
        
        this.updateTurnDisplay();
        this.updateCapturedPieces();
        this.updateMoveHistory();
    }

    /**
     * Handle square click
     */
    handleSquareClick(row, col) {
        if (this.game.gameOver) return;
        
        // Check if interaction is allowed (e.g., not AI's turn)
        if (this.canInteract && !this.canInteract()) {
            return;
        }
        
        const piece = this.game.getPiece(row, col);
        
        // If a piece is already selected
        if (this.selectedSquare) {
            const fromRow = this.selectedSquare.row;
            const fromCol = this.selectedSquare.col;
            
            // Check if clicking on a valid move
            const move = this.game.validMoves.find(m => m.row === row && m.col === col);
            
            if (move) {
                // Check for promotion
                if (move.promotion) {
                    this.showPromotionModal(fromRow, fromCol, row, col);
                    return;
                }
                
                // Make the move
                this.game.makeMove(fromRow, fromCol, row, col);
                this.selectedSquare = null;
                this.game.validMoves = [];
                this.render();
                
                // Check for game over
                if (this.game.gameOver) {
                    this.showGameOverModal();
                }
                
                // Notify move complete
                if (this.onMoveComplete) {
                    this.onMoveComplete();
                }
                
                return;
            }
            
            // Clicking on another own piece
            if (piece && piece.color === this.game.currentTurn) {
                this.selectPiece(row, col);
                return;
            }
            
            // Clicking elsewhere - deselect
            this.selectedSquare = null;
            this.game.validMoves = [];
            this.render();
            return;
        }
        
        // Select a piece
        if (piece && piece.color === this.game.currentTurn) {
            this.selectPiece(row, col);
        }
    }

    /**
     * Select a piece
     */
    selectPiece(row, col) {
        this.selectedSquare = { row, col };
        this.game.validMoves = this.game.getValidMoves(row, col);
        this.render();
    }

    /**
     * Show promotion modal
     */
    showPromotionModal(fromRow, fromCol, toRow, toCol) {
        this.pendingPromotion = { fromRow, fromCol, toRow, toCol };
        
        const color = this.game.currentTurn;
        const pieces = [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT];
        
        this.promotionPieces.innerHTML = '';
        
        pieces.forEach(pieceType => {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = 'promotion-piece';
            pieceDiv.textContent = PIECE_SYMBOLS[color][pieceType];
            pieceDiv.addEventListener('click', () => this.handlePromotion(pieceType));
            this.promotionPieces.appendChild(pieceDiv);
        });
        
        this.promotionModal.classList.add('active');
    }

    /**
     * Handle promotion selection
     */
    handlePromotion(pieceType) {
        if (!this.pendingPromotion) return;
        
        const { fromRow, fromCol, toRow, toCol } = this.pendingPromotion;
        
        this.game.makeMove(fromRow, fromCol, toRow, toCol, pieceType);
        
        this.pendingPromotion = null;
        this.selectedSquare = null;
        this.game.validMoves = [];
        this.promotionModal.classList.remove('active');
        
        this.render();
        
        if (this.game.gameOver) {
            this.showGameOverModal();
        }
        
        // Notify promotion complete
        if (this.onPromotionComplete) {
            this.onPromotionComplete();
        }
    }

    /**
     * Show game over modal
     */
    showGameOverModal() {
        if (this.game.winner === 'draw') {
            this.gameOverTitle.textContent = 'Draw!';
            this.gameOverMessage.textContent = 'The game ended in a stalemate.';
        } else {
            const winnerName = this.game.winner === COLORS.WHITE ? 'White' : 'Black';
            this.gameOverTitle.textContent = 'Checkmate!';
            this.gameOverMessage.textContent = `${winnerName} wins the game!`;
        }
        
        this.gameOverModal.classList.add('active');
    }

    /**
     * Hide game over modal
     */
    hideGameOverModal() {
        this.gameOverModal.classList.remove('active');
    }

    /**
     * Update turn display
     */
    updateTurnDisplay() {
        const turnText = this.game.currentTurn === COLORS.WHITE ? "White's Turn" : "Black's Turn";
        this.turnDisplay.textContent = turnText;
        
        if (this.game.isCheck) {
            this.gameStatus.textContent = 'CHECK!';
        } else {
            this.gameStatus.textContent = '';
        }
    }

    /**
     * Update captured pieces display
     */
    updateCapturedPieces() {
        // Pieces captured by white (black pieces)
        this.capturedByWhite.innerHTML = this.game.capturedPieces.white
            .map(p => `<span>${p.symbol}</span>`)
            .join('');
        
        // Pieces captured by black (white pieces)
        this.capturedByBlack.innerHTML = this.game.capturedPieces.black
            .map(p => `<span>${p.symbol}</span>`)
            .join('');
    }

    /**
     * Update move history
     */
    updateMoveHistory() {
        this.moveList.innerHTML = '';
        
        for (let i = 0; i < this.game.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.game.getMoveNotation(this.game.moveHistory[i]);
            const blackMove = this.game.moveHistory[i + 1] 
                ? this.game.getMoveNotation(this.game.moveHistory[i + 1]) 
                : '';
            
            const entry = document.createElement('div');
            entry.className = 'move-entry';
            entry.innerHTML = `<span class="move-number">${moveNumber}.</span> ${whiteMove} ${blackMove}`;
            this.moveList.appendChild(entry);
        }
        
        // Scroll to bottom
        this.moveList.scrollTop = this.moveList.scrollHeight;
    }

    /**
     * Flip the board
     */
    flipBoard() {
        this.flipped = !this.flipped;
        this.initBoard();
    }

    /**
     * Reset the UI
     */
    reset() {
        this.selectedSquare = null;
        this.pendingPromotion = null;
        this.hideGameOverModal();
        this.initBoard();
    }

    /**
     * Deselect current selection
     */
    deselect() {
        this.selectedSquare = null;
        this.game.validMoves = [];
        this.render();
    }
}
