# Dopamine Hero Development and Deployment Workflows

## Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# Required tools installation
# Node.js 18+ with npm
node --version  # should be 18.x or higher
npm --version   # should be 9.x or higher

# Git for version control
git --version

# Docker for local development environment
docker --version
docker-compose --version

# PostgreSQL client (optional, for direct database access)
psql --version
```

#### Initial Setup
```bash
# 1. Clone the repository
git clone https://github.com/your-org/dopamine-hero.git
cd dopamine-hero

# 2. Install dependencies for all packages
npm install

# 3. Copy environment templates
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# 4. Start local development environment
docker-compose up -d postgres redis

# 5. Run database migrations
npm run db:migrate

# 6. Seed database with initial data
npm run db:seed

# 7. Start development servers
npm run dev
```

#### Development Commands
```bash
# Start all services (frontend, backend, shared packages)
npm run dev

# Start frontend only
npm run dev:web

# Start backend only
npm run dev:api

# Start mobile app (when available)
npm run dev:mobile

# Run tests
npm run test                    # Run all tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:e2e               # End-to-end tests
npm run test:coverage          # Test coverage report

# Build for production
npm run build                  # Build all packages
npm run build:web             # Build frontend only
npm run build:api             # Build backend only

# Database operations
npm run db:migrate             # Run database migrations
npm run db:seed                # Seed database with test data
npm run db:reset               # Reset database
npm run db:studio              # Open database GUI (if using Prisma)

# Code quality
npm run lint                   # Run ESLint on all packages
npm run lint:fix              # Auto-fix linting issues
npm run format                # Format code with Prettier
npm run type-check            # TypeScript type checking
```

### Environment Configuration

#### Required Environment Variables
```bash
# Frontend (.env.local)
REACT_APP_API_BASE_URL=http://localhost:3001/v1
REACT_APP_WS_URL=ws://localhost:3001
REACT_APP_ENVIRONMENT=development
REACT_APP_SENTRY_DSN=your_sentry_dsn_here
REACT_APP_GOOGLE_ANALYTICS_ID=your_ga_id_here

# Backend (.env)
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/dopamine_hero_dev
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# External Services
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=dopamine-hero-uploads

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=debug

# Email (optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Deployment Architecture

### Deployment Strategy

#### Frontend Deployment
**Platform:** Vercel
**Build Command:** `npm run build:web`
**Output Directory:** `apps/web/dist`
**CDN/Edge:** Vercel Edge Network with global distribution

**Configuration:**
```javascript
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.dopaminehero.com/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### Backend Deployment
**Platform:** AWS ECS with Fargate
**Build Command:** `npm run build:api`
**Deployment Method:** Docker containers with blue-green deployment

**Dockerfile:**
```dockerfile
# apps/api/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/ ./packages/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

# Build the application
RUN npm run build:api

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/ ./packages/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### CI/CD Pipeline

#### GitHub Actions Configuration
```yaml
# .github/workflows/ci-cd.yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: dopamine_hero_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

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

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dopamine_hero_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dopamine_hero_test
          REDIS_URL: redis://localhost:6379

      - name: Build applications
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CYPRESS_baseUrl: http://localhost:3000

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

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

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      - name: Deploy to AWS ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: .aws/task-definition.json
          service: dopamine-hero-api
          cluster: dopamine-hero
          wait-for-service-stability: true

      - name: Deploy frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  mobile-build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Expo
        uses: expo/expo-github-action@v9
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Build mobile app
        run: |
          cd apps/mobile
          expo install
          eas build --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Submit to app stores (if configured)
        run: |
          cd apps/mobile
          eas submit --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|-------------|-------------|---------|
| Development | http://localhost:3000 | http://localhost:3001 | Local development with hot reload |
| Staging | https://staging.dopaminehero.com | https://staging-api.dopaminehero.com | Pre-production testing with production-like data |
| Production | https://dopaminehero.com | https://api.dopaminehero.com | Live environment for end users |

#### Environment-Specific Configurations

**Staging Environment:**
```bash
# Staging configuration
NODE_ENV=staging
API_BASE_URL=https://staging-api.dopaminehero.com/v1
DATABASE_URL=postgresql://user:pass@staging-db.rds.amazonaws.com:5432/dopamine_hero_staging
REDIS_URL=redis://staging-redis.cache.amazonaws.com:6379
LOG_LEVEL=info
SENTRY_DSN=staging_sentry_dsn
```

**Production Environment:**
```bash
# Production configuration
NODE_ENV=production
API_BASE_URL=https://api.dopaminehero.com/v1
DATABASE_URL=postgresql://user:pass@prod-db.rds.amazonaws.com:5432/dopamine_hero_prod
REDIS_URL=redis://prod-redis.cache.amazonaws.com:6379
LOG_LEVEL=error
SENTRY_DSN=production_sentry_dsn
```

## Infrastructure as Code

### Terraform Configuration

```hcl
# infrastructure/terraform/main.tf
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "dopamine-hero-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "dopamine-hero"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "dopamine-hero-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false
}

# RDS PostgreSQL Database
resource "aws_db_instance" "main" {
  identifier = "dopamine-hero-db"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = "dopamine_hero"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = true

  tags = {
    Name = "dopamine-hero-db"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "dopamine-hero-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "dopamine-hero-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
}

# S3 Bucket for file storage
resource "aws_s3_bucket" "uploads" {
  bucket = "dopamine-hero-uploads-${random_string.bucket_suffix.result}"

  tags = {
    Name = "dopamine-hero-uploads"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}
```

### Cost Optimization Strategies

#### Multi-Level Cost Optimization

**Phase 1: MVP Stage (0-1K users) - $70/month**
- Vercel Pro: $20/month
- AWS ECS (t3.micro): $15/month
- AWS RDS (t3.micro): $15/month (Free tier eligible)
- AWS ElastiCache (t3.micro): $12/month
- S3 Storage: $3/month
- Data Transfer: $5/month

**Phase 2: Growth Stage (1K-10K users) - $280/month**
- AWS ECS (t3.small x2): $40/month
- AWS RDS (t3.small): $50/month
- AWS ElastiCache (t3.small): $35/month
- Enhanced Monitoring: $20/month
- Load Balancer: $25/month

**Phase 3: Scale Stage (10K-50K users) - $1000/month**
- AWS ECS (t3.medium x4): $160/month
- AWS RDS (t3.medium): $150/month
- AWS ElastiCache (t3.medium): $100/month
- CDN & Data Transfer: $150/month
- Advanced Monitoring: $100/month

#### Resource Optimization Implementation

```typescript
// infrastructure/cost/optimization.ts
export class CostOptimizer {
  // Auto-scaling configuration
  getAutoScalingConfig() {
    return {
      minCapacity: 1,
      maxCapacity: 10,
      targetCPUUtilization: 70,
      targetMemoryUtilization: 80,
      scaleInCooldown: 300,
      scaleOutCooldown: 60
    };
  }

  // Instance rightsizing recommendations
  getInstanceRecommendations(metrics: InstanceMetrics) {
    const recommendations = [];

    if (metrics.avgCPU < 20 && metrics.avgMemory < 50) {
      recommendations.push({
        action: 'downsize',
        currentInstance: 't3.small',
        recommendedInstance: 't3.micro',
        estimatedSavings: '40%'
      });
    }

    if (metrics.avgCPU > 80 || metrics.avgMemory > 85) {
      recommendations.push({
        action: 'upscale',
        currentInstance: 't3.small',
        recommendedInstance: 't3.medium',
        reason: 'High resource utilization'
      });
    }

    return recommendations;
  }

  // Cost monitoring and alerts
  setupCostMonitoring() {
    return {
      budgetAlerts: {
        monthlyBudget: 500,
        alertThresholds: [50, 80, 100], // percentage
        notificationChannels: ['email', 'slack']
      },

      resourceOptimization: {
        reviewInterval: 'daily',
        autoOptimization: false,
        recommendationsRequired: true
      }
    };
  }
}
```

### Monitoring and Observability

#### Production Monitoring Setup

```typescript
// infrastructure/monitoring/monitoringSetup.ts
export class ProductionMonitoring {
  setupApplicationMonitoring() {
    return {
      // Error tracking
      errorTracking: {
        sentry: {
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV,
          tracesSampleRate: 0.1,
          release: process.env.APP_VERSION
        }
      },

      // Performance monitoring
      performance: {
        customMetrics: {
          focusSessionDuration: 'gauge',
          taskCompletionRate: 'counter',
          moduleAssemblyTime: 'histogram',
          energyGenerationRate: 'gauge'
        },

        alerts: {
          slowAPI: { threshold: 1000, window: '5m' },
          highErrorRate: { threshold: 0.05, window: '5m' },
          lowEnergyGeneration: { threshold: 10, window: '1h' }
        }
      },

      // Infrastructure monitoring
      infrastructure: {
        cpu: { threshold: 80, alert: true },
        memory: { threshold: 85, alert: true },
        disk: { threshold: 90, alert: true },
        databaseConnections: { threshold: 80, alert: true }
      }
    };
  }

  setupLogging() {
    return {
      level: process.env.LOG_LEVEL || 'info',

      transports: [
        {
          type: 'console',
          format: 'json'
        },
        {
          type: 'file',
          filename: 'logs/app.log',
          maxSize: '10m',
          maxFiles: 5
        },
        {
          type: 'cloudwatch',
          logGroupName: 'dopamine-hero',
          logStreamName: 'api'
        }
      ],

      // Structured logging format
      format: {
        timestamp: true,
        requestId: true,
        userId: true,
        metadata: true
      }
    };
  }
}
```

This comprehensive deployment and development workflow provides:

1. **Complete Development Setup**: Local environment with all dependencies and tools
2. **Production-Ready CI/CD**: Automated testing, building, and deployment pipelines
3. **Infrastructure as Code**: Reproducible infrastructure with Terraform
4. **Cost Optimization**: Phase-by-phase scaling with cost monitoring
5. **Multi-Environment Support**: Development, staging, and production configurations
6. **Monitoring Setup**: Comprehensive logging, error tracking, and performance monitoring

The architecture is designed to support Dopamine Hero's growth from MVP to enterprise scale while maintaining cost-effectiveness and operational excellence.