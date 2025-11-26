# Game-Vibe-Chess ♔

A fully-featured chess game built with pure HTML, CSS, and JavaScript. Play against a friend locally, online, or challenge the AI!

![Chess Game](https://img.shields.io/badge/Game-Chess-blue)
![Tech](https://img.shields.io/badge/Tech-HTML%2FCSS%2FJS-green)
![AWS](https://img.shields.io/badge/AWS-Serverless-orange)

## 🎮 Features

### Game Modes
- **Online Multiplayer**: Play against other players online with real-time matchmaking
- **Local Play**: Play against a friend on the same device
- **AI Mode**: Challenge the computer with three difficulty levels
  - Easy: Beginner-friendly AI
  - Medium: Balanced difficulty
  - Hard: Challenging opponent

### Mode Selection Screen
- Beautiful card-based mode selection interface
- Easy-to-use difficulty selector for AI mode
- Real-time matchmaking with waiting notification for online play

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
- ⬛ Darker black pieces for better visibility

## 🚀 How to Play

1. Open `index.html` in your web browser
2. Choose your game mode from the mode selection screen:
   - **Multiplayer**: Wait for matchmaking to find an opponent
   - **Local Play**: Play against a friend on the same device
   - **vs AI**: Select difficulty and play against the computer
3. Click on a piece to see valid moves
4. Click on a highlighted square to move
5. Use the controls to:
   - Start a new game
   - Undo moves
   - Flip the board
   - Return to mode selection

## 📁 Project Structure

```
Game-Vibe-Chess/
├── index.html              # Main HTML file
├── styles.css              # All CSS styles
├── js/
│   ├── chess-pieces.js     # Piece definitions and board setup
│   ├── chess-logic.js      # Game rules and move validation
│   ├── chess-ai.js         # AI implementation (Minimax algorithm)
│   ├── chess-ui.js         # UI rendering and interactions
│   └── main.js             # Application initialization
├── aws-infrastructure/     # AWS backend infrastructure
│   ├── README.md           # AWS architecture documentation
│   ├── template.yaml       # SAM/CloudFormation template
│   └── src/handlers/       # Lambda function handlers
└── README.md               # This file
```

## ☁️ AWS Infrastructure

The multiplayer backend is built on AWS following SAA & DVA best practices:

- **API Gateway WebSocket**: Real-time game communication
- **Lambda Functions**: Serverless game logic
- **DynamoDB**: Game state and player data storage
- **ElastiCache Redis**: Session caching and matchmaking
- **CloudFront + S3**: Static asset delivery
- **Cognito**: User authentication
- **WAF**: Web application firewall protection

See [aws-infrastructure/README.md](aws-infrastructure/README.md) for detailed architecture documentation.

## 🎯 AI Algorithm

The AI uses the **Minimax algorithm** with **Alpha-Beta pruning** for optimal move selection:
- Evaluates board positions based on piece values
- Uses position bonus tables for strategic evaluation
- Adjustable search depth based on difficulty level

## 🛠️ Technologies

### Frontend
- **HTML5**: Structure and markup
- **CSS3**: Styling with modern features (Grid, Flexbox, CSS Variables)
- **JavaScript (ES6+)**: Game logic and interactivity

### Backend (AWS)
- **AWS Lambda**: Serverless compute
- **API Gateway WebSocket**: Real-time communication
- **DynamoDB**: NoSQL database
- **ElastiCache**: Redis caching
- **CloudFront**: CDN
- **Cognito**: Authentication
- **WAF**: Security

## 🔒 Security Features

- HTTPS everywhere (TLS 1.2+)
- IAM least privilege access
- Encryption at rest (KMS)
- Encryption in transit
- VPC isolation
- WAF protection
- DDoS protection via AWS Shield

## 📝 License

This project is open source and available for educational purposes.

## 🎮 Enjoy the Game!

Challenge yourself and have fun playing chess!