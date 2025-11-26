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
    
    // Set up AI integration callbacks
    ui.onMoveComplete = handleMoveComplete;
    ui.onPromotionComplete = handlePromotionComplete;
    ui.canInteract = canPlayerInteract;
    
    setupEventListeners();
}

/**
 * Check if player can interact with the board
 */
function canPlayerInteract() {
    if (isAIThinking) return false;
    if (gameMode === 'ai' && game.currentTurn === aiColor) return false;
    return true;
}

/**
 * Handle move completion - trigger AI if needed
 */
function handleMoveComplete() {
    updateUndoButton();
    if (gameMode === 'ai' && game.currentTurn === aiColor && !game.gameOver) {
        setTimeout(() => makeAIMove(), 100);
    }
}

/**
 * Handle promotion completion - trigger AI if needed
 */
function handlePromotionComplete() {
    updateUndoButton();
    if (gameMode === 'ai' && game.currentTurn === aiColor && !game.gameOver) {
        setTimeout(() => makeAIMove(), 100);
    }
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
