/**
 * Game Move Handler
 * Handles chess moves in multiplayer games
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const getApiClient = (event) => {
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;
    return new ApiGatewayManagementApiClient({
        endpoint: `https://${domain}/${stage}`
    });
};

const sendMessage = async (apiClient, connectionId, message) => {
    try {
        await apiClient.send(new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify(message)
        }));
    } catch (error) {
        if (error.statusCode === 410) {
            // Connection is stale, remove it
            await docClient.send(new DeleteCommand({
                TableName: process.env.CONNECTIONS_TABLE,
                Key: { connectionId }
            }));
        }
        throw error;
    }
};

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const body = JSON.parse(event.body || '{}');
    const { gameId, move } = body;
    const apiClient = getApiClient(event);
    
    if (!gameId || !move) {
        return {
            statusCode: 400,
            body: 'Missing gameId or move'
        };
    }
    
    try {
        // Get the game
        const gameResult = await docClient.send(new GetCommand({
            TableName: process.env.GAMES_TABLE,
            Key: { gameId }
        }));
        
        const game = gameResult.Item;
        
        if (!game) {
            return {
                statusCode: 404,
                body: 'Game not found'
            };
        }
        
        if (game.status !== 'active') {
            return {
                statusCode: 400,
                body: 'Game is not active'
            };
        }
        
        // Validate that it's the player's turn
        const playerColor = game.players.white === connectionId ? 'white' : 
                           game.players.black === connectionId ? 'black' : null;
        
        if (!playerColor) {
            return {
                statusCode: 403,
                body: 'You are not a player in this game'
            };
        }
        
        if (game.currentTurn !== playerColor) {
            return {
                statusCode: 400,
                body: 'Not your turn'
            };
        }
        
        // Update game state
        const newMoves = [...(game.moves || []), {
            ...move,
            player: playerColor,
            timestamp: new Date().toISOString()
        }];
        
        const nextTurn = playerColor === 'white' ? 'black' : 'white';
        
        await docClient.send(new UpdateCommand({
            TableName: process.env.GAMES_TABLE,
            Key: { gameId },
            UpdateExpression: 'SET moves = :moves, currentTurn = :turn, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':moves': newMoves,
                ':turn': nextTurn,
                ':updatedAt': new Date().toISOString()
            }
        }));
        
        // Notify the opponent
        const opponentId = playerColor === 'white' ? game.players.black : game.players.white;
        
        const moveMessage = {
            type: 'opponent_move',
            gameId,
            move,
            currentTurn: nextTurn
        };
        
        try {
            await sendMessage(apiClient, opponentId, moveMessage);
        } catch (error) {
            console.error('Failed to notify opponent:', error);
        }
        
        // Confirm move to the player
        await sendMessage(apiClient, connectionId, {
            type: 'move_confirmed',
            gameId,
            move,
            currentTurn: nextTurn
        });
        
        return { statusCode: 200, body: 'OK' };
    } catch (error) {
        console.error('Game move error:', error);
        return {
            statusCode: 500,
            body: 'Internal server error'
        };
    }
};
