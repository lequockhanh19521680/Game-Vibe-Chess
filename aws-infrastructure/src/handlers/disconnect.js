/**
 * WebSocket Disconnect Handler
 * Handles WebSocket disconnections
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    
    try {
        // Remove from connections table
        await docClient.send(new DeleteCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId }
        }));
        
        // Remove from matchmaking queue if present
        await docClient.send(new DeleteCommand({
            TableName: process.env.MATCHMAKING_TABLE,
            Key: { visitorId: connectionId }
        }));
        
        console.log(`Connection closed: ${connectionId}`);
        
        return {
            statusCode: 200,
            body: 'Disconnected'
        };
    } catch (error) {
        console.error('Error disconnecting:', error);
        return {
            statusCode: 500,
            body: 'Failed to disconnect'
        };
    }
};
