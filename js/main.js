/**
 * Main Application
 * Initializes game and handles user interactions
 */

// Game instances
let game;
let ui;
let ai;
let gameMode = 'local'; // 'local', 'multiplayer', 'ai'
let aiColor = COLORS.BLACK;
let aiDifficulty = 'medium';
let isAIThinking = false;

// UI Elements
let modeSelectionScreen;
let gameScreen;
let matchmakingModal;

/**
 * Initialize the application
 */
function init() {
    game = new ChessGame();
    ai = new ChessAI('medium');
    
    // Get screen elements
    modeSelectionScreen = document.getElementById('mode-selection-screen');
    gameScreen = document.getElementById('game-screen');
    matchmakingModal = document.getElementById('matchmaking-modal');
    
    setupModeSelectionListeners();
}

/**
 * Setup mode selection event listeners
 */
function setupModeSelectionListeners() {
    // Multiplayer button
    document.getElementById('select-multiplayer-btn').addEventListener('click', () => {
        startMatchmaking();
    });
    
    // Local play button
    document.getElementById('select-local-btn').addEventListener('click', () => {
        gameMode = 'local';
        startGame('Local Play');
    });
    
    // AI difficulty buttons
    document.querySelectorAll('.btn-ai-difficulty').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-ai-difficulty').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            aiDifficulty = e.target.dataset.difficulty;
        });
    });
    
    // AI play button
    document.getElementById('select-ai-btn').addEventListener('click', () => {
        gameMode = 'ai';
        ai.setDifficulty(aiDifficulty);
        startGame(`AI - ${aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)}`);
    });
    
    // Cancel matchmaking button
    document.getElementById('cancel-matchmaking-btn').addEventListener('click', () => {
        cancelMatchmaking();
    });
}

/**
 * Start matchmaking for multiplayer
 */
function startMatchmaking() {
    matchmakingModal.classList.add('active');
    
    const statusEl = document.getElementById('matchmaking-status');
    const messages = [
        'Searching for players...',
        'Finding a worthy opponent...',
        'Connecting to game servers...',
        'Almost there...'
    ];
    
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        statusEl.textContent = messages[messageIndex];
    }, 2000);
    
    // Simulate matchmaking (in real implementation, this would connect to AWS backend)
    // For now, we'll show the waiting message and then start a local game
    setTimeout(() => {
        clearInterval(messageInterval);
        statusEl.textContent = 'Opponent found! Starting game...';
        
        setTimeout(() => {
            matchmakingModal.classList.remove('active');
            gameMode = 'multiplayer';
            startGame('Multiplayer');
        }, 1000);
    }, 5000);
}

/**
 * Cancel matchmaking
 */
function cancelMatchmaking() {
    matchmakingModal.classList.remove('active');
}

/**
 * Start the game with selected mode
 */
function startGame(modeDisplayName) {
    // Hide mode selection, show game
    modeSelectionScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    
    // Update mode display
    document.getElementById('current-mode-display').textContent = modeDisplayName;
    
    // Initialize game and UI
    game.reset();
    
    // Create UI if not exists, otherwise reset
    if (!ui) {
        ui = new ChessUI(game);
        ui.onMoveComplete = handleMoveComplete;
        ui.onPromotionComplete = handlePromotionComplete;
        ui.canInteract = canPlayerInteract;
        setupGameEventListeners();
    } else {
        ui.reset();
    }
    
    isAIThinking = false;
    updateUndoButton();
}

/**
 * Go back to mode selection
 */
function backToModeSelection() {
    gameScreen.style.display = 'none';
    modeSelectionScreen.style.display = 'flex';
    
    // Reset game state
    if (game) {
        game.reset();
    }
    if (ui) {
        ui.reset();
    }
    isAIThinking = false;
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
 * Setup game event listeners
 */
function setupGameEventListeners() {
    // Back to menu button
    document.getElementById('back-to-menu-btn').addEventListener('click', backToModeSelection);
    
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
