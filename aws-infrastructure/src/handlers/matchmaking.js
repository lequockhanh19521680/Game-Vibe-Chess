/**
 * Matchmaking Handler
 * Handles player matchmaking for multiplayer games
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { v4: uuidv4 } = require('uuid');

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
    const action = body.action;
    const apiClient = getApiClient(event);
    
    try {
        if (action === 'join_queue') {
            // Add player to matchmaking queue
            const timestamp = new Date().toISOString();
            const ttl = Math.floor(Date.now() / 1000) + 300; // 5 minute TTL
            
            await docClient.send(new PutCommand({
                TableName: process.env.MATCHMAKING_TABLE,
                Item: {
                    visitorId: connectionId,
                    status: 'waiting',
                    requestedAt: timestamp,
                    ttl
                }
            }));
            
            // Notify player they're in queue
            await sendMessage(apiClient, connectionId, {
                type: 'matchmaking_status',
                status: 'queued',
                message: 'You are now in the matchmaking queue'
            });
            
            // Try to find a match
            const waitingPlayers = await docClient.send(new QueryCommand({
                TableName: process.env.MATCHMAKING_TABLE,
                IndexName: 'status-requestedAt-index',
                KeyConditionExpression: '#status = :status',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: { ':status': 'waiting' },
                Limit: 2
            }));
            
            if (waitingPlayers.Items && waitingPlayers.Items.length >= 2) {
                const player1 = waitingPlayers.Items[0];
                const player2 = waitingPlayers.Items[1];
                
                // Create a new game
                const gameId = uuidv4();
                const gameTimestamp = new Date().toISOString();
                
                // Randomly assign colors
                const player1Color = Math.random() < 0.5 ? 'white' : 'black';
                const player2Color = player1Color === 'white' ? 'black' : 'white';
                
                await docClient.send(new PutCommand({
                    TableName: process.env.GAMES_TABLE,
                    Item: {
                        gameId,
                        status: 'active',
                        createdAt: gameTimestamp,
                        players: {
                            [player1Color]: player1.visitorId,
                            [player2Color]: player2.visitorId
                        },
                        currentTurn: 'white',
                        moves: [],
                        board: null // Initial board state will be managed by client
                    }
                }));
                
                // Remove players from matchmaking queue
                await Promise.all([
                    docClient.send(new DeleteCommand({
                        TableName: process.env.MATCHMAKING_TABLE,
                        Key: { visitorId: player1.visitorId }
                    })),
                    docClient.send(new DeleteCommand({
                        TableName: process.env.MATCHMAKING_TABLE,
                        Key: { visitorId: player2.visitorId }
                    }))
                ]);
                
                // Notify both players
                const matchFoundMessage = (color) => ({
                    type: 'match_found',
                    gameId,
                    color,
                    message: 'Match found! Game starting...'
                });
                
                await Promise.all([
                    sendMessage(apiClient, player1.visitorId, matchFoundMessage(player1Color)),
                    sendMessage(apiClient, player2.visitorId, matchFoundMessage(player2Color))
                ]);
            }
            
            return { statusCode: 200, body: 'OK' };
        }
        
        if (action === 'leave_queue') {
            await docClient.send(new DeleteCommand({
                TableName: process.env.MATCHMAKING_TABLE,
                Key: { visitorId: connectionId }
            }));
            
            await sendMessage(apiClient, connectionId, {
                type: 'matchmaking_status',
                status: 'left_queue',
                message: 'You have left the matchmaking queue'
            });
            
            return { statusCode: 200, body: 'OK' };
        }
        
        return {
            statusCode: 400,
            body: 'Invalid action'
        };
    } catch (error) {
        console.error('Matchmaking error:', error);
        return {
            statusCode: 500,
            body: 'Internal server error'
        };
    }
};
