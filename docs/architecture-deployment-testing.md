# Dopamine Hero Deployment and Testing Architecture

## Deployment Architecture

Based on the hybrid Vercel + AWS platform choice, the deployment strategy prioritizes performance, reliability, and cost-effectiveness for solo/agent development teams.

### Deployment Strategy

#### Frontend Deployment
- **Platform:** Vercel Edge Network
- **Build Command:** `npm run build` (from apps/web)
- **Output Directory:** `dist/`
- **CDN/Edge:** Global Vercel Edge Network with automatic static asset optimization
- **Environment:** Production, Staging, Preview (per PR)

#### Backend Deployment
- **Platform:** AWS ECS Fargate with Application Load Balancer
- **Build Command:** `npm run build` (from apps/api)
- **Deployment Method:** Container-based deployment with blue-green strategy
- **Scaling:** Auto-scaling from 1 to 10 containers based on CPU/memory usage
- **Health Checks:** HTTP health check endpoint with automated recovery

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  AWS_REGION: 'us-east-1'

jobs:
  test:
    name: Test and Quality Checks
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Type checking
        run: npm run type-check

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    name: Build Applications
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build applications
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ vars.API_BASE_URL }}
          NODE_ENV: production

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            apps/web/dist/
            apps/api/dist/

  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: apps/web/dist/

      - name: Deploy to Vercel (Production)
        if: github.ref == 'refs/heads/main'
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: apps/web

      - name: Deploy to Vercel (Staging)
        if: github.ref == 'refs/heads/develop'
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/web

  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: apps/api/dist/

      - name: Build Docker image
        run: |
          docker build -f infrastructure/docker/Dockerfile.backend \
            -t ${{ secrets.AWS_ECR_REPOSITORY }}/dopamine-hero-api:${{ github.sha }} \
            -t ${{ secrets.AWS_ECR_REPOSITORY }}/dopamine-hero-api:latest \
            .

      - name: Push to ECR
        run: |
          aws ecr get-login-password --region ${{ env.AWS_REGION }} | docker login --username AWS --password-stdin ${{ secrets.AWS_ECR_REPOSITORY }}
          docker push ${{ secrets.AWS_ECR_REPOSITORY }}/dopamine-hero-api:${{ github.sha }}
          docker push ${{ secrets.AWS_ECR_REPOSITORY }}/dopamine-hero-api:latest

      - name: Deploy to ECS (Production)
        if: github.ref == 'refs/heads/main'
        run: |
          aws ecs update-service --cluster dopamine-hero-production \
            --service api-service --force-new-deployment

      - name: Deploy to ECS (Staging)
        if: github.ref == 'refs/heads/develop'
        run: |
          aws ecs update-service --cluster dopamine-hero-staging \
            --service api-service --force-new-deployment
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose | Database |
|-------------|--------------|-------------|---------|----------|
| Development | http://localhost:5173 | http://localhost:3001/v1 | Local development | Local PostgreSQL + Redis |
| Staging | https://staging.dopamine-hero.com | https://staging-api.dopamine-hero.com/v1 | Pre-production testing | AWS RDS Staging |
| Production | https://dopamine-hero.com | https://api.dopamine-hero.com/v1 | Live environment | AWS RDS Production |

### Infrastructure as Code (AWS CDK)

```typescript
// infrastructure/aws/lib/backend-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for backend services
    const vpc = new ec2.Vpc(this, 'BackendVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'BackendCluster', {
      vpc,
      clusterName: 'dopamine-hero-backend',
      enableFargateCapacityProviders: true,
    });

    // Application Load Balancer
    const loadBalancer = new ec2.ApplicationLoadBalancer(this, 'BackendALB', {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // RDS PostgreSQL Database
    const database = new rds.DatabaseInstance(this, 'BackendDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      databaseName: 'dopamine_hero',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      deletionProtection: false,
      securityGroups: [new ec2.SecurityGroup(this, 'DatabaseSG', { vpc })],
    });

    // ElastiCache Redis
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const redis = new elasticache.CfnCacheCluster(this, 'BackendRedis', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [new ec2.SecurityGroup(this, 'RedisSG', { vpc }).securityGroupId],
    });

    // ECS Task Definition
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole,
    });

    // Add container to task definition
    const container = taskDefinition.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromRegistry(`${process.env.AWS_ECR_REPOSITORY}/dopamine-hero-api:latest`),
      portMappings: [{ containerPort: 3001 }],
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL: `postgresql://${dbSecret.secretValueFromJson('username').toString()}:${dbSecret.secretValueFromJson('password').toString()}@${dbSecret.secretValueFromJson('host').toString()}:${dbSecret.secretValueFromJson('port').toString()}/${dbSecret.secretValueFromJson('dbname').toString()}`,
        REDIS_URL: `redis://${redis.attr.redisEndpoint.address}:${redis.attr.redisEndpoint.port}`,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSsmParameter('/dopamine-hero/database-url'),
        FIREBASE_PRIVATE_KEY: ecs.Secret.fromSsmParameter('/dopamine-hero/firebase-private-key'),
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'backend',
        logGroup: new cdk.aws_logs.LogGroup(this, 'BackendLogGroup', {
          retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
        }),
      }),
    });

    // Auto Scaling Group
    const scalingTarget = cluster.addCapacity('BackendAutoScaling', {
      minCapacity: 1,
      maxCapacity: 10,
      instanceType: new ec2.InstanceType('t3.micro'),
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry(`${process.env.AWS_ECR_REPOSITORY}/dopamine-hero-api:latest`),
        containerPort: 3001,
        environment: {
          NODE_ENV: 'production',
        },
        logDriver: ecs.LogDriver.awsLogs({
          streamPrefix: 'backend',
        }),
      },
    });

    // Auto Scaling Policies
    const cpuScaling = scalingTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleOutCooldown: cdk.Duration.seconds(60),
      scaleInCooldown: cdk.Duration.seconds(60),
    });

    const memoryScaling = scalingTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleOutCooldown: cdk.Duration.seconds(60),
      scaleInCooldown: cdk.Duration.seconds(60),
    });

    // Output values
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: loadBalancer.loadBalancerDnsName,
      exportName: 'BackendLoadBalancerDNS',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      exportName: 'BackendDatabaseEndpoint',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redis.attr.redisEndpoint.address,
      exportName: 'BackendRedisEndpoint',
    });
  }
}
```

## Testing Strategy

### Testing Pyramid

```
    E2E Tests (Playwright)
        /        \
Integration Tests (API + Database)
    /                    \
Frontend Unit (Vitest)   Backend Unit (Jest)
```

### Test Organization

#### Frontend Tests

```
apps/web/tests/
├── __mocks__/                  # Mock implementations
│   ├── apiClient.ts
│   ├── localStorage.ts
│   └── firebase.ts
├── components/                 # Component tests
│   ├── focus/
│   │   ├── FocusTimer.test.tsx
│   │   └── CurrencyDisplay.test.tsx
│   ├── tasks/
│   │   ├── TaskList.test.tsx
│   │   └── TaskForm.test.tsx
│   └── modules/
│       ├── ModuleCatalog.test.tsx
│       └── AssemblyGrid.test.tsx
├── hooks/                      # Hook tests
│   ├── useAuth.test.ts
│   ├── useFocusTimer.test.ts
│   └── useCurrency.test.ts
├── services/                   # Service tests
│   ├── authService.test.ts
│   ├── taskService.test.ts
│   └── currencyService.test.ts
├── utils/                      # Utility tests
│   ├── validation.test.ts
│   └── formatting.test.ts
├── e2e/                        # End-to-end tests
│   ├── auth.spec.ts
│   ├── focus.spec.ts
│   ├── tasks.spec.ts
│   └── modules.spec.ts
└── setup.ts                    # Test setup
```

#### Backend Tests

```
apps/api/tests/
├── unit/                       # Unit tests
│   ├── services/
│   │   ├── auth/
│   │   │   └── AuthService.test.ts
│   │   ├── focus/
│   │   │   └── FocusSessionService.test.ts
│   │   └── currency/
│   │       └── CurrencyService.test.ts
│   ├── models/
│   │   ├── User.test.ts
│   │   └── Task.test.ts
│   └── utils/
│       ├── validation.test.ts
│       └── calculation.test.ts
├── integration/                # Integration tests
│   ├── routes/
│   │   ├── auth.test.ts
│   │   ├── tasks.test.ts
│   │   └── focus-sessions.test.ts
│   └── middleware/
│       ├── auth.test.ts
│       └── validation.test.ts
├── fixtures/                   # Test data
│   ├── users.json
│   ├── tasks.json
│   └── modules.json
└── setup.ts                    # Test setup
```

### Test Examples

#### Frontend Component Test

```typescript
// apps/web/tests/components/focus/FocusTimer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FocusTimer } from '@/components/features/focus/FocusTimer';
import { useFocusTimer } from '@/hooks/useFocusTimer';
import { useCurrencyStore } from '@/stores/currencyStore';

// Mock hooks
vi.mock('@/hooks/useFocusTimer');
vi.mock('@/stores/currencyStore');

const mockUseFocusTimer = vi.mocked(useFocusTimer);
const mockUseCurrencyStore = vi.mocked(useCurrencyStore);

describe('FocusTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCurrencyStore.mockReturnValue({
      energy: 25.5,
      dopamine: 12.3,
    } as any);

    mockUseFocusTimer.mockReturnValue({
      timeLeft: 1500, // 25 minutes
      isActive: false,
      status: 'planned',
      start: vi.fn(),
      pause: vi.fn(),
      reset: vi.fn(),
      complete: vi.fn(),
    } as any);
  });

  it('displays initial timer state', () => {
    render(<FocusTimer />);

    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('⚡ 25.5')).toBeInTheDocument();
    expect(screen.getByText('🧪 12.3')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('handles start button click', () => {
    const mockStart = vi.fn();
    mockUseFocusTimer.mockReturnValue({
      ...mockUseFocusTimer(),
      isActive: false,
      start: mockStart,
    } as any);

    render(<FocusTimer />);

    fireEvent.click(screen.getByText('Start'));
    expect(mockStart).toHaveBeenCalled();
  });
});
```

#### Backend Service Test

```typescript
// apps/api/tests/unit/services/focus/FocusSessionService.test.ts
import { FocusSessionService } from '@/services/focus/FocusSessionService';
import { DatabaseService } from '@/utils/database';
import { RedisService } from '@/utils/redis';
import { CurrencyService } from '@/services/currency/CurrencyService';
import { v4 as uuidv4 } from 'uuid';

describe('FocusSessionService', () => {
  let focusSessionService: FocusSessionService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      focusSessions: {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
      },
      tasks: {
        findById: vi.fn(),
        update: vi.fn(),
      },
      modulePresets: {
        findById: vi.fn(),
      },
      userModules: {
        findByUserId: vi.fn(),
      },
    };

    mockRedis = {
      setex: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      del: vi.fn(),
    };

    focusSessionService = new FocusSessionService(
      mockDatabaseService,
      mockRedisService,
      mockCurrencyService,
      mockModuleCalculation
    );
  });

  describe('createSession', () => {
    it('creates a focus session successfully', async () => {
      const userId = uuidv4();
      const sessionId = uuidv4();
      const sessionData = {
        userId,
        plannedDuration: 25,
        taskId: uuidv4(),
        moduleConfigurationId: uuidv4(),
      };

      const expectedSession = {
        id: sessionId,
        userId,
        plannedDuration: 25,
        status: 'planned',
        startTime: new Date(),
      };

      mockDb.tasks.findById.mockResolvedValue({ id: sessionData.taskId, userId });
      mockDb.focusSessions.create.mockResolvedValue(expectedSession);

      const result = await focusSessionService.createSession(sessionData);

      expect(result).toEqual(expectedSession);
      expect(mockDb.focusSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sessionData.userId,
          plannedDuration: 25,
          status: 'planned',
        })
      );
    });
  });
});
```

#### E2E Test

```typescript
// apps/web/tests/e2e/focus.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Focus Session Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'testpassword123');
    await page.click('[data-testid=login-button]');
    await page.waitForURL('/');
  });

  test('complete focus session workflow', async ({ page }) => {
    // Create a task first
    await page.click('[data-testid=create-task-button]');
    await page.fill('[data-testid=task-title]', 'Test task for focus session');
    await page.selectOption('[data-testid=task-category]', 'analytical');
    await page.click('[data-testid=save-task-button]');

    // Navigate to focus mode
    await page.click('[data-testid=focus-mode-tab]');

    // Select the task
    await page.click('[data-testid=task-select]');
    await page.click('text=Test task for focus session');

    // Start focus session
    await page.click('[data-testid=start-session-button]');

    // Verify timer is running
    await expect(page.locator('[data-testid=timer-display]')).toBeVisible();
    await expect(page.locator('[data-testid=session-status]')).toHaveText('Active');

    // Fast-forward time (in test, we'd mock this)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mock-timer-complete', {
        detail: { duration: 25 }
      }));
    });

    // Complete session
    await page.click('[data-testid=complete-session-button]');

    // Verify completion screen
    await expect(page.locator('[data-testid=completion-modal]')).toBeVisible();
    await expect(page.locator('[data-testid=energy-earned]')).toBeVisible();
    await expect(page.locator('[data-testid=dopamine-earned]')).toBeVisible();

    // Verify task was marked as completed
    await page.click('[data-testid=view-tasks]');
    await expect(page.locator('[data-testid=task-status]')).toHaveText('Completed');
  });
});
```

### Testing Configuration

#### Vitest Configuration

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,tsx}'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Jest Configuration

```javascript
// apps/api/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/**/__mocks__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000,
};
```

### Testing Strategy Rationale

1. **Comprehensive Coverage:** Multiple testing levels ensure reliability of the complex dual-currency system
2. **AI Agent Compatibility:** Clear test structure enables AI agents to understand and extend test coverage
3. **Performance Focus:** Tests include performance validation for ADHD user requirements
4. **Integration Testing:** API integration tests catch issues that unit tests might miss
5. **User Journey Validation:** E2E tests verify complete user workflows including the focus-to-game loop
6. **Mock Strategy:** Strategic mocking enables fast unit tests while maintaining integration test accuracy
7. **Coverage Thresholds:** 80% coverage ensures quality without being overly burdensome for solo development