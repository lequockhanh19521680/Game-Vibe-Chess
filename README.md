# Game-Vibe-Chess ♔

A fully-featured chess game built with pure HTML, CSS, and JavaScript. Play against a friend or challenge the AI!

![Chess Game](https://img.shields.io/badge/Game-Chess-blue)
![Tech](https://img.shields.io/badge/Tech-HTML%2FCSS%2FJS-green)

## 🎮 Features

### Game Modes
- **Multiplayer**: Play against a friend on the same device
- **AI Mode**: Challenge the computer with three difficulty levels
  - Easy: Beginner-friendly AI
  - Medium: Balanced difficulty
  - Hard: Challenging opponent

### Chess Functionality
- ✅ All standard piece movements
- ✅ Special moves:
  - Castling (Kingside & Queenside)
  - En Passant
  - Pawn Promotion
- ✅ Check and Checkmate detection
- ✅ Stalemate detection
- ✅ Move validation
- ✅ Legal move highlighting

### UI Features
- 🎨 Modern, responsive design
- 📱 Mobile-friendly interface
- ♟️ Drag and click to move pieces
- 🔄 Board flip option
- ↩️ Undo move functionality
- 📜 Move history in algebraic notation
- 💀 Captured pieces display
- ✨ Move animations and highlights

## 🚀 How to Play

1. Open `index.html` in your web browser
2. Select your preferred game mode:
   - **Multiplayer (2 Players)**: Take turns with a friend
   - **AI - Easy/Medium/Hard**: Play against the computer
3. Click on a piece to see valid moves
4. Click on a highlighted square to move
5. Use the controls to:
   - Start a new game
   - Undo moves
   - Flip the board

## 📁 Project Structure

```
Game-Vibe-Chess/
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── js/
│   ├── chess-pieces.js # Piece definitions and board setup
│   ├── chess-logic.js  # Game rules and move validation
│   ├── chess-ai.js     # AI implementation (Minimax algorithm)
│   ├── chess-ui.js     # UI rendering and interactions
│   └── main.js         # Application initialization
└── README.md           # This file
```

## 🎯 AI Algorithm

The AI uses the **Minimax algorithm** with **Alpha-Beta pruning** for optimal move selection:
- Evaluates board positions based on piece values
- Uses position bonus tables for strategic evaluation
- Adjustable search depth based on difficulty level

## 🛠️ Technologies

- **HTML5**: Structure and markup
- **CSS3**: Styling with modern features (Grid, Flexbox, CSS Variables)
- **JavaScript (ES6+)**: Game logic and interactivity

## 📝 License

This project is open source and available for educational purposes.

## 🎮 Enjoy the Game!

Challenge yourself and have fun playing chess!