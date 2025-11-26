# AWS Infrastructure for Game Vibe Chess

This document outlines the AWS infrastructure design following AWS Solutions Architect Associate (SAA) and Developer Associate (DVA) best practices with comprehensive security measures.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                    USERS                                          │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          Amazon CloudFront (CDN)                                  │
│   - HTTPS only, TLS 1.2+                                                         │
│   - Origin Access Control (OAC)                                                  │
│   - AWS WAF Integration                                                          │
│   - Custom error responses                                                       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
           ┌─────────────────────────────┴─────────────────────────────┐
           │                                                           │
           ▼                                                           ▼
┌─────────────────────────────────┐                    ┌─────────────────────────────────┐
│     Amazon S3 (Static Assets)    │                    │     AWS API Gateway (WebSocket) │
│   - Static website hosting       │                    │   - Real-time game communication│
│   - Bucket versioning           │                    │   - Authorization via Cognito   │
│   - Server-side encryption      │                    │   - Request throttling          │
│   - Lifecycle policies          │                    │   - API keys and usage plans    │
└─────────────────────────────────┘                    └────────────────┬────────────────┘
                                                                        │
                                                                        ▼
                                    ┌─────────────────────────────────────────────────────┐
                                    │              AWS Lambda Functions                    │
                                    │   - matchmaking-handler                             │
                                    │   - game-state-handler                              │
                                    │   - move-validation-handler                         │
                                    │   - connection-manager                              │
                                    └─────────────────────────────────────────────────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────────────────────────┐
                    │                                    │                                │
                    ▼                                    ▼                                ▼
       ┌────────────────────────┐          ┌────────────────────────┐      ┌────────────────────────┐
       │  Amazon DynamoDB       │          │  Amazon ElastiCache    │      │  Amazon SQS            │
       │  - Game sessions       │          │  (Redis)               │      │  - Matchmaking queue   │
       │  - Player data         │          │  - Session caching     │      │  - Game events         │
       │  - Move history        │          │  - Matchmaking pool    │      │  - Dead letter queue   │
       │  - Leaderboards        │          │  - Rate limiting       │      │                        │
       └────────────────────────┘          └────────────────────────┘      └────────────────────────┘
```

## Security Best Practices (SAA-C03 & DVA-C02)

### 1. Identity and Access Management (IAM)

```yaml
# IAM Policies following least privilege principle
Policies:
  - LambdaExecutionRole:
      - Effect: Allow
        Action:
          - dynamodb:GetItem
          - dynamodb:PutItem
          - dynamodb:UpdateItem
          - dynamodb:Query
        Resource: !Sub "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/ChessGame*"
      
      - Effect: Allow
        Action:
          - logs:CreateLogGroup
          - logs:CreateLogStream
          - logs:PutLogEvents
        Resource: !Sub "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*"
        
      - Effect: Allow
        Action:
          - execute-api:ManageConnections
        Resource: !Sub "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*"
```

### 2. Amazon Cognito User Authentication

```yaml
CognitoUserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: ChessGameUserPool
    AutoVerifiedAttributes:
      - email
    MfaConfiguration: OPTIONAL
    Policies:
      PasswordPolicy:
        MinimumLength: 12
        RequireUppercase: true
        RequireLowercase: true
        RequireNumbers: true
        RequireSymbols: true
        TemporaryPasswordValidityDays: 1
    UserPoolAddOns:
      AdvancedSecurityMode: ENFORCED
    AccountRecoverySetting:
      RecoveryMechanisms:
        - Name: verified_email
          Priority: 1
```

### 3. Network Security

```yaml
VPCConfiguration:
  VPC:
    CIDRBlock: 10.0.0.0/16
    EnableDnsHostnames: true
    EnableDnsSupport: true
    
  Subnets:
    Private:
      - CIDR: 10.0.1.0/24
        AZ: us-east-1a
      - CIDR: 10.0.2.0/24
        AZ: us-east-1b
    Public:
      - CIDR: 10.0.101.0/24
        AZ: us-east-1a
      - CIDR: 10.0.102.0/24
        AZ: us-east-1b

  SecurityGroups:
    LambdaSecurityGroup:
      Ingress: []  # No inbound - Lambda initiates connections
      Egress:
        - Protocol: TCP
          Port: 443
          Destination: 0.0.0.0/0
        - Protocol: TCP
          Port: 6379
          Destination: ElastiCacheSecurityGroup
          
    ElastiCacheSecurityGroup:
      Ingress:
        - Protocol: TCP
          Port: 6379
          Source: LambdaSecurityGroup
      Egress: []
```

### 4. Data Encryption

```yaml
EncryptionConfiguration:
  # DynamoDB encryption
  DynamoDBEncryption:
    SSEType: KMS
    KMSMasterKeyId: alias/chess-game-key
    
  # S3 encryption
  S3Encryption:
    ServerSideEncryption: aws:kms
    BucketKeyEnabled: true
    
  # ElastiCache encryption
  ElastiCacheEncryption:
    AtRestEncryptionEnabled: true
    TransitEncryptionEnabled: true
    AuthToken: !Ref ElastiCacheAuthToken
    
  # API Gateway encryption
  APIGatewayEncryption:
    TLSVersion: TLS_1_2
    SecurityPolicy: TLS_1_2_2021_06
```

### 5. AWS WAF (Web Application Firewall)

```yaml
WAFRules:
  WebACL:
    Name: ChessGameWebACL
    Rules:
      - Name: RateLimitRule
        Priority: 1
        Statement:
          RateBasedStatement:
            Limit: 1000
            AggregateKeyType: IP
        Action:
          Block: {}
          
      - Name: AWSManagedRulesCommonRuleSet
        Priority: 2
        OverrideAction:
          None: {}
        Statement:
          ManagedRuleGroupStatement:
            VendorName: AWS
            Name: AWSManagedRulesCommonRuleSet
            
      - Name: AWSManagedRulesKnownBadInputsRuleSet
        Priority: 3
        OverrideAction:
          None: {}
        Statement:
          ManagedRuleGroupStatement:
            VendorName: AWS
            Name: AWSManagedRulesKnownBadInputsRuleSet
            
      - Name: SQLiRule
        Priority: 4
        Statement:
          SqliMatchStatement:
            FieldToMatch:
              Body: {}
            TextTransformations:
              - Priority: 0
                Type: URL_DECODE
```

### 6. CloudWatch Monitoring & Alarms

```yaml
MonitoringConfiguration:
  Dashboards:
    - GameMetricsDashboard:
        Widgets:
          - ActiveConnections
          - MatchmakingQueueDepth
          - GameSessionsCount
          - APILatency
          - ErrorRates
          
  Alarms:
    - HighErrorRate:
        Metric: 5XXError
        Threshold: 5
        Period: 300
        EvaluationPeriods: 2
        ComparisonOperator: GreaterThanThreshold
        AlarmActions:
          - !Ref SNSAlertTopic
          
    - HighLatency:
        Metric: Latency
        Threshold: 1000
        Period: 60
        Statistic: p99
        
    - DDoSDetection:
        Metric: DDoSDetected
        Threshold: 1
        TreatMissingData: notBreaching
```

### 7. AWS Secrets Manager

```yaml
SecretsManager:
  GameSecrets:
    Name: /chessgame/production/secrets
    SecretString:
      DatabaseCredentials: !Ref DBCredentials
      APIKeys: !Ref APIKeySecrets
      JWTSecret: !Ref JWTSecret
    RotationSchedule:
      AutomaticallyAfterDays: 30
    ReplicaRegions:
      - Region: us-west-2
```

## Infrastructure as Code (CloudFormation/SAM)

### SAM Template Structure

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Game Vibe Chess - Serverless Backend

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 256
    Tracing: Active
    Environment:
      Variables:
        STAGE: !Ref Environment
        TABLE_NAME: !Ref GameTable
        
Parameters:
  Environment:
    Type: String
    AllowedValues:
      - development
      - staging
      - production
    Default: development

Resources:
  # WebSocket API
  WebSocketApi:
    Type: AWS::ApiGatewayV2::Api
    Properties:
      Name: ChessGameWebSocket
      ProtocolType: WEBSOCKET
      RouteSelectionExpression: "$request.body.action"

  # Lambda Functions
  ConnectFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/handlers/
      Handler: connect.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable

  # DynamoDB Tables
  GameTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub ${Environment}-chess-games
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: gameId
          AttributeType: S
        - AttributeName: status
          AttributeType: S
      KeySchema:
        - AttributeName: gameId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: status-index
          KeySchema:
            - AttributeName: status
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        SSEEnabled: true
        SSEType: KMS
```

## Deployment Pipeline (CI/CD)

```yaml
# AWS CodePipeline configuration
Pipeline:
  Stages:
    - Source:
        Provider: GitHub
        Configuration:
          Owner: !Ref GitHubOwner
          Repo: Game-Vibe-Chess
          Branch: main
          OAuthToken: !Ref GitHubToken
          
    - Build:
        Provider: CodeBuild
        Configuration:
          ProjectName: !Ref BuildProject
          EnvironmentVariables:
            - Name: STAGE
              Value: !Ref Environment
              
    - Test:
        Provider: CodeBuild
        Configuration:
          ProjectName: !Ref TestProject
          
    - Deploy:
        Provider: CloudFormation
        Configuration:
          ActionMode: CHANGE_SET_REPLACE
          StackName: !Sub chess-game-${Environment}
          TemplatePath: BuildArtifact::packaged-template.yaml
```

## Cost Optimization (SAA Best Practice)

1. **Use Serverless**: Lambda + API Gateway + DynamoDB = pay per use
2. **S3 Intelligent Tiering**: For game replay storage
3. **Reserved Capacity**: For predictable DynamoDB workloads
4. **CloudFront Caching**: Reduce origin requests
5. **Right-sizing**: Monitor and adjust Lambda memory

## High Availability & Disaster Recovery

```yaml
MultiAZConfiguration:
  DynamoDB:
    - Global Tables for multi-region
    - Point-in-time recovery enabled
    
  ElastiCache:
    - Multi-AZ with automatic failover
    - Read replicas in each AZ
    
  S3:
    - Cross-region replication
    - Versioning enabled
    
  Lambda:
    - Multi-AZ by default
    - Provisioned concurrency for critical functions
```

## Compliance & Auditing

1. **AWS CloudTrail**: All API calls logged
2. **AWS Config**: Configuration compliance rules
3. **VPC Flow Logs**: Network traffic analysis
4. **Access Analyzer**: IAM policy validation
5. **Security Hub**: Centralized security findings

## Getting Started

1. Install AWS SAM CLI
2. Configure AWS credentials
3. Deploy infrastructure:

```bash
# Build the application
sam build

# Deploy to AWS
sam deploy --guided --stack-name chess-game-prod \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment=production
```

## Security Checklist

- [x] HTTPS everywhere (TLS 1.2+)
- [x] IAM least privilege
- [x] Encryption at rest (KMS)
- [x] Encryption in transit
- [x] VPC isolation for sensitive resources
- [x] WAF rules enabled
- [x] DDoS protection via Shield Standard
- [x] Secrets in Secrets Manager
- [x] MFA for user accounts
- [x] CloudTrail enabled
- [x] Automated security scanning
- [x] Regular key rotation
