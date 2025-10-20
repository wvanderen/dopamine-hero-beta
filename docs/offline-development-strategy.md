# Offline Development Strategy

## Overview

This document outlines the comprehensive offline development strategy for Dopamine Hero, enabling developers to work effectively when external services are unavailable. This strategy ensures development continuity while maintaining the integrity of the dual-currency productivity-gaming system.

## Offline Development Scenarios

### Scenario 1: Complete Offline Development
**When**: No internet connection available
**Capabilities**: Full local development with mocked external services
**Duration**: Extended periods (days/weeks)

### Scenario 2: Partial Offline Development
**When**: Limited or intermittent internet connection
**Capabilities**: Local development with periodic external service synchronization
**Duration**: Short periods (hours/days)

### Scenario 3: Service-Specific Offline Development
**When**: Specific external services unavailable (Firebase, AWS, etc.)
**Capabilities**: Targeted development with service mocking
**Duration**: Variable based on service availability

## Local Development Environment Setup

### Prerequisites Installation

**Core Requirements** (installable offline):
```bash
# Node.js development environment
node --version  # >= 18.0.0
npm --version   # >= 9.0.0

# Local database setup
docker --version
docker-compose --version

# Git for version control
git --version

# Development tools
code --version  # VS Code or preferred editor
```

**Pre-download Required**:
- Node.js binary installer
- Docker Desktop installer
- Git installer
- Development tools and extensions

### Local Service Mocking Strategy

**Mock Service Architecture**:
```
Local Development Environment
├── Mock Firebase Auth Service
├── Mock Email Service
├── Mock Analytics Service
├── Local PostgreSQL (Docker)
├── Local Redis (Docker)
└── Mock External APIs
```

### Database Setup for Offline Development

**Docker Compose Configuration**:
```yaml
# docker-compose.offline.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: dopamine_hero_db_offline
    environment:
      POSTGRES_DB: dopamine_hero_offline
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: offlinepassword
    ports:
      - "5433:5432"
    volumes:
      - postgres_data_offline:/var/lib/postgresql/data
      - ./infrastructure/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - offline_network

  redis:
    image: redis:7-alpine
    container_name: dopamine_hero_redis_offline
    ports:
      - "6380:6379"
    volumes:
      - redis_data_offline:/data
    networks:
      - offline_network

  mailhog:
    image: mailhog/mailhog
    container_name: dopamine_hero_mail_offline
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - offline_network

volumes:
  postgres_data_offline:
  redis_data_offline:

networks:
  offline_network:
    driver: bridge
```

**Offline Database Initialization**:
```bash
# Start offline services
docker-compose -f docker-compose.offline.yml up -d

# Run database migrations
npm run db:migrate -- --env=offline

# Seed database with test data
npm run db:seed -- --env=offline

# Verify setup
npm run db:status -- --env=offline
```

## Service Mocking Implementation

### Firebase Auth Mock Service

**Mock Implementation**:
```typescript
// apps/api/src/services/mock/MockFirebaseService.ts
export class MockFirebaseService {
  private users = new Map<string, MockUser>();
  private tokens = new Map<string, MockToken>();

  async createMockUser(userData: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<MockUser> {
    const user: MockUser = {
      uid: this.generateMockUID(),
      email: userData.email,
      displayName: userData.displayName,
      createdAt: new Date(),
      isEmailVerified: true
    };

    this.users.set(user.uid, user);
    return user;
  }

  async authenticateUser(email: string, password: string): Promise<MockAuthResult> {
    const user = Array.from(this.users.values()).find(u => u.email === email);

    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = this.generateMockToken(user.uid, 'access');
    const refreshToken = this.generateMockToken(user.uid, 'refresh');

    this.tokens.set(accessToken, { userId: user.uid, type: 'access' });
    this.tokens.set(refreshToken, { userId: user.uid, type: 'refresh' });

    return {
      user,
      tokens: { accessToken, refreshToken, expiresIn: 3600 }
    };
  }

  async verifyToken(token: string): Promise<MockDecodedToken> {
    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      throw new Error('Invalid token');
    }

    const user = this.users.get(tokenData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      uid: user.uid,
      email: user.email,
      email_verified: user.isEmailVerified
    };
  }

  private generateMockUID(): string {
    return `mock_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMockToken(userId: string, type: string): string {
    return `mock_${type}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Email Service Mock

**MailHog Integration**:
```typescript
// apps/api/src/services/mock/MockEmailService.ts
import nodemailer from 'nodemailer';

export class MockEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure to use local MailHog instance
    this.transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: {
        user: '',
        pass: ''
      }
    });
  }

  async sendWelcomeEmail(email: string, displayName: string): Promise<void> {
    await this.transporter.sendMail({
      from: 'noreply@dopamine-hero.localhost',
      to: email,
      subject: 'Welcome to Dopamine Hero (Development)',
      html: `
        <h1>Welcome ${displayName}!</h1>
        <p>This is a development email from Dopamine Hero.</p>
        <p>You can view this email at <a href="http://localhost:8025">http://localhost:8025</a></p>
      `
    });
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    await this.transporter.sendMail({
      from: 'noreply@dopamine-hero.localhost',
      to: email,
      subject: 'Password Reset (Development)',
      html: `
        <h1>Password Reset Request</h1>
        <p>Use this token to reset your password: <strong>${resetToken}</strong></p>
        <p>This is a development environment email.</p>
      `
    });
  }
}
```

### Analytics Service Mock

**Mock Analytics Implementation**:
```typescript
// apps/api/src/services/mock/MockAnalyticsService.ts
export class MockAnalyticsService {
  private events: MockAnalyticsEvent[] = [];

  async trackEvent(eventName: string, properties: Record<string, any>): Promise<void> {
    const event: MockAnalyticsEvent = {
      id: this.generateEventId(),
      name: eventName,
      properties,
      timestamp: new Date(),
      userId: properties.userId || 'anonymous'
    };

    this.events.push(event);

    // Log to console for development visibility
    console.log(`📊 Analytics Event: ${eventName}`, properties);
  }

  async getUserStats(userId: string): Promise<MockUserStats> {
    const userEvents = this.events.filter(e => e.userId === userId);

    return {
      totalEvents: userEvents.length,
      focusSessionsStarted: userEvents.filter(e => e.name === 'focus_session_started').length,
      focusSessionsCompleted: userEvents.filter(e => e.name === 'focus_session_completed').length,
      totalFocusTime: this.calculateTotalFocusTime(userEvents),
      lastActivity: userEvents.length > 0 ? userEvents[userEvents.length - 1].timestamp : null
    };
  }

  getEvents(): MockAnalyticsEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateTotalFocusTime(events: MockAnalyticsEvent[]): number {
    return events
      .filter(e => e.name === 'focus_session_completed')
      .reduce((total, event) => total + (event.properties.duration || 0), 0);
  }
}
```

## Offline Development Workflow

### Development Mode Selection

**Environment Detection**:
```typescript
// apps/api/src/config/environment.ts
export const getDevelopmentMode = (): 'online' | 'offline' | 'hybrid' => {
  const env = process.env.NODE_ENV;
  const offlineMode = process.env.OFFLINE_MODE === 'true';
  const hasInternet = process.env.HAS_INTERNET === 'true';

  if (offlineMode || !hasInternet) {
    return 'offline';
  }

  if (env === 'development' && !hasInternet) {
    return 'hybrid';
  }

  return 'online';
};
```

**Service Selection Logic**:
```typescript
// apps/api/src/services/serviceFactory.ts
export class ServiceFactory {
  static createAuthService(): AuthService {
    const mode = getDevelopmentMode();

    switch (mode) {
      case 'offline':
        return new MockFirebaseService();
      case 'hybrid':
        return new HybridAuthService();
      case 'online':
      default:
        return new FirebaseService();
    }
  }

  static createEmailService(): EmailService {
    const mode = getDevelopmentMode();

    return mode === 'offline'
      ? new MockEmailService()
      : new EmailService();
  }

  static createAnalyticsService(): AnalyticsService {
    const mode = getDevelopmentMode();

    return mode === 'offline'
      ? new MockAnalyticsService()
      : new AnalyticsService();
  }
}
```

### Configuration Management

**Offline Configuration**:
```typescript
// config/offline.json
{
  "database": {
    "host": "localhost",
    "port": 5433,
    "database": "dopamine_hero_offline",
    "username": "postgres",
    "password": "offlinepassword"
  },
  "redis": {
    "host": "localhost",
    "port": 6380
  },
  "firebase": {
    "enabled": false,
    "mockService": true
  },
  "email": {
    "enabled": false,
    "mockService": true,
    "smtpHost": "localhost",
    "smtpPort": 1025
  },
  "analytics": {
    "enabled": false,
    "mockService": true
  },
  "features": {
    "socialLogin": false,
    "emailVerification": false,
    "realTimeSync": false,
    "externalAnalytics": false
  }
}
```

### Development Commands

**Offline Development Scripts**:
```json
// package.json scripts
{
  "scripts": {
    "dev:offline": "OFFLINE_MODE=true npm run dev",
    "dev:hybrid": "HAS_INTERNET=false npm run dev",
    "test:offline": "OFFLINE_MODE=true npm run test",
    "db:offline:up": "docker-compose -f docker-compose.offline.yml up -d",
    "db:offline:down": "docker-compose -f docker-compose.offline.yml down",
    "db:offline:reset": "npm run db:offline:down && npm run db:offline:up && npm run db:migrate -- --env=offline && npm run db:seed -- --env=offline",
    "mail:offline": "open http://localhost:8025",
    "offline:setup": "npm run db:offline:up && npm run db:migrate -- --env=offline && npm run db:seed -- --env=offline",
    "offline:status": "docker-compose -f docker-compose.offline.yml ps && npm run db:status -- --env=offline"
  }
}
```

## Data Synchronization Strategy

### Hybrid Mode Operation

**Sync Queue Implementation**:
```typescript
// apps/api/src/services/sync/SyncQueue.ts
export class SyncQueue {
  private queue: SyncOperation[] = [];
  private isOnline = false;

  async addOperation(operation: SyncOperation): Promise<void> {
    this.queue.push(operation);

    if (this.isOnline) {
      await this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.isOnline) {
      const operation = this.queue.shift();

      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Sync operation failed:', error);
        // Re-add to queue for retry
        this.queue.unshift(operation);
        break;
      }
    }
  }

  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    if (isOnline) {
      this.processQueue();
    }
  }
}
```

### Conflict Resolution

**Data Merge Strategy**:
```typescript
// apps/api/src/services/sync/DataMerger.ts
export class DataMerger {
  async mergeUserData(localData: UserData, remoteData: UserData): Promise<UserData> {
    // Priority: most recent update wins
    const mergedData = {
      ...localData,
      ...remoteData,
      // Special handling for currency balances
      energyBalance: Math.max(localData.energyBalance, remoteData.energyBalance),
      dopamineBalance: Math.max(localData.dopamineBalance, remoteData.dopamineBalance),
      // Merge arrays without duplicates
      achievements: [...new Set([...localData.achievements, ...remoteData.achievements])]
    };

    return mergedData;
  }
}
```

## Testing Strategy for Offline Development

### Mock Service Testing

**Mock Service Validation**:
```typescript
// tests/offline/mockServiceTests.test.ts
describe('Mock Firebase Service', () => {
  let mockFirebase: MockFirebaseService;

  beforeEach(() => {
    mockFirebase = new MockFirebaseService();
  });

  it('should create mock users', async () => {
    const user = await mockFirebase.createMockUser({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User'
    });

    expect(user.email).toBe('test@example.com');
    expect(user.uid).toBeDefined();
  });

  it('should authenticate mock users', async () => {
    const user = await mockFirebase.createMockUser({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User'
    });

    const result = await mockFirebase.authenticateUser('test@example.com', 'password123');

    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBeDefined();
  });
});
```

### Integration Testing

**Offline-Online Integration Tests**:
```typescript
// tests/offline/offlineIntegration.test.ts
describe('Offline-Online Integration', () => {
  it('should sync data when coming online', async () => {
    // Test data synchronization logic
    const syncQueue = new SyncQueue();

    // Simulate offline operations
    await syncQueue.addOperation({
      type: 'user_update',
      data: { displayName: 'Updated Name' }
    });

    // Simulate coming online
    syncQueue.setOnlineStatus(true);

    // Verify queue processing
    expect(syncQueue.getQueueLength()).toBe(0);
  });
});
```

## Troubleshooting Guide

### Common Offline Development Issues

**Database Connection Issues**:
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Check database logs
docker logs dopamine_hero_db_offline

# Restart database service
docker-compose -f docker-compose.offline.yml restart postgres

# Reinitialize database
npm run db:offline:reset
```

**Mock Service Issues**:
```bash
# Check environment variables
echo $OFFLINE_MODE

# Verify service configuration
npm run config:check

# Restart development server
npm run dev:offline
```

**Data Sync Issues**:
```bash
# Check sync queue status
npm run sync:status

# Force sync processing
npm run sync:process

# Reset sync state
npm run sync:reset
```

### Performance Considerations

**Local Development Optimization**:
- Use SSD storage for Docker volumes
- Allocate sufficient memory to Docker Desktop
- Optimize database queries for local datasets
- Use connection pooling for local database

## Best Practices

### Development Workflow

1. **Start Offline**: Begin development in offline mode to establish core functionality
2. **Test Mock Services**: Verify all mock services work correctly before online integration
3. **Incremental Online Testing**: Gradually test with real services as they become available
4. **Data Validation**: Ensure data integrity during offline-online transitions
5. **Regular Backups**: Backup local development data regularly

### Code Organization

- Separate mock services from production services
- Use dependency injection for service selection
- Implement feature flags for online/offline capabilities
- Maintain consistent interfaces between mock and real services

### Documentation

- Document all mock service behaviors
- Maintain offline development setup instructions
- Keep troubleshooting guides up to date
- Document data synchronization rules

## Conclusion

This offline development strategy enables continuous development regardless of external service availability. The comprehensive mocking approach ensures that developers can build and test the complete Dopamine Hero experience locally, with seamless synchronization when connectivity is restored.

Key benefits:
- **Uninterrupted Development**: Work continues regardless of internet availability
- **Complete Local Testing**: Full application functionality available locally
- **Seamless Transitions**: Smooth switching between offline and online modes
- **Data Integrity**: Robust synchronization and conflict resolution
- **Developer Productivity**: Minimal setup overhead for offline development