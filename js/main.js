/**
 * Main Application
 * Initializes game and handles user interactions
 */

// Game instances
let game;
let ui;
let ai;
let gameMode = 'multiplayer';
let aiColor = COLORS.BLACK;
let isAIThinking = false;

/**
 * Initialize the application
 */
function init() {
    game = new ChessGame();
    ui = new ChessUI(game);
    ai = new ChessAI('medium');
    
    setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Game mode selector
    document.getElementById('game-mode').addEventListener('change', (e) => {
        gameMode = e.target.value;
        
        if (gameMode.startsWith('ai-')) {
            const difficulty = gameMode.split('-')[1];
            ai.setDifficulty(difficulty);
            gameMode = 'ai';
        }
        
        // Reset game when mode changes
        newGame();
    });
    
    // New game button
    document.getElementById('new-game-btn').addEventListener('click', newGame);
    
    // Undo button
    document.getElementById('undo-btn').addEventListener('click', undoMove);
    
    // Flip board button
    document.getElementById('flip-board-btn').addEventListener('click', () => {
        ui.flipBoard();
    });
    
    // Play again button
    document.getElementById('play-again-btn').addEventListener('click', newGame);
}

/**
 * Start a new game
 */
function newGame() {
    game.reset();
    ui.reset();
    isAIThinking = false;
    updateUndoButton();
}

/**
 * Undo the last move
 */
function undoMove() {
    if (isAIThinking) return;
    
    // In AI mode, undo two moves (AI's move and player's move)
    if (gameMode === 'ai' && game.moveHistory.length >= 2) {
        game.undoMove();
        game.undoMove();
    } else {
        game.undoMove();
    }
    
    ui.deselect();
    ui.render();
    updateUndoButton();
}

/**
 * Update undo button state
 */
function updateUndoButton() {
    const undoBtn = document.getElementById('undo-btn');
    undoBtn.disabled = game.moveHistory.length === 0 || isAIThinking;
}

/**
 * Make AI move
 */
async function makeAIMove() {
    if (game.gameOver || isAIThinking) return;
    if (game.currentTurn !== aiColor) return;
    
    isAIThinking = true;
    updateUndoButton();
    
    // Add slight delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get AI move
    const move = ai.getBestMove(game);
    
    if (move) {
        // Select the piece first (for visual feedback)
        ui.selectPiece(move.from.row, move.from.col);
        ui.render();
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Determine promotion piece if needed
        let promotionPiece = null;
        if (move.to.promotion) {
            promotionPiece = PIECES.QUEEN; // AI always promotes to queen
        }
        
        // Make the move
        game.makeMove(move.from.row, move.from.col, move.to.row, move.to.col, promotionPiece);
        
        ui.selectedSquare = null;
        game.validMoves = [];
        ui.render();
        
        if (game.gameOver) {
            ui.showGameOverModal();
        }
    }
    
    isAIThinking = false;
    updateUndoButton();
}

// Override UI's handleSquareClick for AI integration
const originalHandleSquareClick = ChessUI.prototype.handleSquareClick;
ChessUI.prototype.handleSquareClick = function(row, col) {
    // Don't allow moves during AI's turn
    if (gameMode === 'ai' && game.currentTurn === aiColor) {
        return;
    }
    
    if (isAIThinking) return;
    
    originalHandleSquareClick.call(this, row, col);
    
    // Trigger AI move after player's move
    if (gameMode === 'ai' && game.currentTurn === aiColor && !game.gameOver) {
        setTimeout(() => makeAIMove(), 100);
    }
    
    updateUndoButton();
};

// Override UI's handlePromotion for AI integration
const originalHandlePromotion = ChessUI.prototype.handlePromotion;
ChessUI.prototype.handlePromotion = function(pieceType) {
    originalHandlePromotion.call(this, pieceType);
    
    // Trigger AI move after player's promotion
    if (gameMode === 'ai' && game.currentTurn === aiColor && !game.gameOver) {
        setTimeout(() => makeAIMove(), 100);
    }
    
    updateUndoButton();
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
