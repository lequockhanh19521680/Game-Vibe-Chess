/**
 * WebSocket Connect Handler
 * Handles new WebSocket connections
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const timestamp = new Date().toISOString();
    
    // TTL: 24 hours from now
    const ttl = Math.floor(Date.now() / 1000) + 86400;
    
    try {
        await docClient.send(new PutCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Item: {
                connectionId,
                connectedAt: timestamp,
                ttl
            }
        }));
        
        console.log(`Connection established: ${connectionId}`);
        
        return {
            statusCode: 200,
            body: 'Connected'
        };
    } catch (error) {
        console.error('Error connecting:', error);
        return {
            statusCode: 500,
            body: 'Failed to connect'
        };
    }
};
