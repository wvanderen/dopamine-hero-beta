# Dopamine Hero Technology Stack

## Tech Stack Overview

This is the DEFINITIVE technology selection for the entire project. This table is the single source of truth - all development must use these exact versions and tools, optimized for both web and React Native compatibility.

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.0+ | Type safety and code quality | Essential for shared codebase between web and native, reduces bugs in complex game logic |
| Frontend Framework | React | 18.2+ | UI component framework | Latest stable with concurrent features, perfect for both web and native |
| UI Component Library | Custom React + Tailwind CSS | 3.4+ | Unique synth aesthetic and design system | Custom design needed for synth theme, Tailwind for rapid development |
| State Management | Zustand | 4.4+ | Cross-platform state management | Simpler than Redux, works seamlessly across web and native |
| Backend Language | TypeScript | 5.0+ | Type-safe backend development | Shared types with frontend, better developer experience |
| Backend Framework | Express.js | 4.18+ | Node.js web framework | Mature ecosystem, excellent for AI agent integration |
| API Style | RESTful API | OpenAPI 3.0 | Standardized API design | Simple, well-documented, works perfectly across platforms |
| Database | PostgreSQL | 15+ | Primary relational database | Strong consistency, complex queries for analytics, JSON support |
| Cache | Redis | 7.0+ | Session management and caching | Essential for real-time features and performance |
| File Storage | AWS S3 | - | User data and media files | Scalable, cost-effective, reliable storage |
| Authentication | Firebase Auth | - | User authentication and social login | Social login support, secure token management |
| Frontend Testing | Vitest + React Testing Library | 0.34+ / 13.4+ | Unit and integration testing | Fast, modern testing framework with React Native support |
| Backend Testing | Jest + Supertest | 29.7+ / 6.3+ | API testing and unit tests | Comprehensive backend testing suite |
| E2E Testing | Playwright | 1.40+ | End-to-end web testing | Modern, fast, multi-browser E2E testing |
| Mobile E2E Testing | Detox | 20.10+ | Future React Native E2E testing | Industry standard for React Native testing |
| Build Tool | Vite | 5.0+ | Fast frontend build tool | Blazing fast HMR, optimized for both web and mobile |
| Bundler | Metro (RN) + Rollup | 0.76+ / 4.0+ | Code bundling for platforms | Metro for React Native, Rollup for shared packages |
| IaC Tool | Terraform | 1.6+ | Infrastructure as Code | AWS infrastructure management, consistent deployments |
| CI/CD | GitHub Actions | - | Automated testing and deployment | Native GitHub integration, parallel web/mobile workflows |
| Monitoring | Sentry | 7.80+ | Error tracking and performance | Cross-platform error monitoring, performance insights |
| Logging | Winston | 3.11+ | Structured backend logging | Professional logging with multiple transports |
| CSS Framework | Tailwind CSS | 3.4+ | Utility-first CSS framework | Rapid development, consistent design system |
| Animation | Framer Motion | 10.16+ | Web animations | 30-45 FPS target, smooth synth interactions |
| Mobile Animation | React Native Reanimated | 3.6+ | Native animations | 60 FPS native animations for mobile game mechanics |
| Package Management | npm + Workspaces | 10.0+ | Monorepo package management | Simple, built-in workspaces, no additional tools needed |

## Unified Project Structure (Updated for React Native Compatibility)

### Repository Structure

```plaintext
dopamine-hero/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml
│       ├── deploy-web.yaml
│       └── deploy-mobile.yaml
├── apps/                       # Application packages
│   ├── web/                    # React web application
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/          # Page components/routes
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API client services
│   │   │   ├── stores/         # State management
│   │   │   ├── styles/         # Global styles/themes
│   │   │   └── utils/          # Frontend utilities
│   │   ├── public/             # Static assets
│   │   ├── tests/              # Frontend tests
│   │   └── package.json
│   └── mobile/                 # Future React Native application
│       ├── src/
│       │   ├── components/     # Native-specific UI components
│       │   ├── screens/        # Screen components/navigation
│       │   ├── hooks/          # Native-specific React hooks
│       │   ├── services/       # API client services (shared)
│       │   └── styles/         # Native styles/themes
│       ├── android/            # Android-specific files
│       ├── ios/                # iOS-specific files
│       ├── tests/              # Mobile tests
│       └── package.json
├── packages/                   # Shared packages
│   ├── shared/                 # Shared business logic (70%+ reusable)
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── hooks/          # Cross-platform React hooks
│   │   │   ├── stores/         # Zustand state management
│   │   │   ├── constants/      # Shared constants
│   │   │   ├── utils/          # Business logic utilities
│   │   │   └── validation/     # Form validation schemas
│   │   └── package.json
│   ├── ui/                     # Shared UI design system
│   │   ├── src/
│   │   │   ├── primitives/     # Basic component logic
│   │   │   ├── themes/         # Design tokens (colors, spacing)
│   │   │   ├── animations/     # Shared animation definitions
│   │   │   └── icons/          # Icon components
│   │   └── package.json
│   └── config/                 # Shared configuration
│       ├── eslint/
│       ├── typescript/
│       └── jest/
├── infrastructure/             # IaC definitions
│   ├── terraform/              # AWS infrastructure
│   └── vercel/                 # Vercel configuration
├── scripts/                    # Build/deploy scripts
│   ├── build.sh
│   ├── deploy-web.sh
│   └── deploy-mobile.sh
├── docs/                       # Documentation
│   ├── prd.md
│   ├── fullstack-architecture.md
│   └── mobile-strategy.md
├── .env.example                # Environment template
├── package.json                # Root package.json with workspaces
├── lerna.json                  # Lerna configuration for cross-package ops
└── README.md
```

## React Native Compatibility Strategy

### Cross-Platform Code Sharing Optimizations

#### Enhanced Shared Package Structure
- **packages/shared/types**: TypeScript interfaces (fully shareable)
- **packages/shared/hooks**: Custom React hooks (shareable)
- **packages/shared/stores**: Zustand stores (shareable)
- **packages/shared/utils**: Business logic utilities (shareable)
- **packages/ui/primitives**: Basic UI components (partially shareable)
- **packages/ui/themes**: Design tokens (shareable)

#### Platform-Specific Component Layers
- **Web (apps/web)**: React DOM components with Tailwind CSS
- **Native (apps/mobile)**: React Native components with StyleSheet
- **Shared**: Business logic hooks and state management

### Migration Timeline Implications

- **Phase 1 (Web MVP)**: Current architecture with RN preparation
- **Phase 2 (Mobile App)**: Add React Native package sharing 70%+ of code
- **Phase 3 (Feature Parity)**: Mobile-specific features (notifications, offline)

## Technology Selection Rationale

### Core Technology Decisions

#### Frontend Framework: React 18+ with TypeScript
- **Type Safety**: Prevents runtime errors in complex game logic
- **Cross-Platform**: Single codebase for web and mobile
- **Ecosystem**: Rich ecosystem of libraries and tools
- **AI Agent Friendly**: Consistent patterns for code generation

#### State Management: Zustand
- **Simplicity**: Less boilerplate than Redux
- **TypeScript Support**: Excellent type safety
- **Performance**: Optimized for frequent updates
- **Cross-Platform**: Works seamlessly with React Native

#### Backend: Node.js + Express.js
- **JavaScript Ecosystem**: Full-stack TypeScript consistency
- **Performance**: Excellent for I/O-bound operations
- **Scalability**: Proven scalability to millions of users
- **AI Agent Integration**: Excellent tooling and debugging support

#### Database: PostgreSQL + Redis
- **ACID Compliance**: Critical for user data integrity
- **JSON Support**: Flexible storage for game configurations
- **Performance**: Redis for real-time features and caching
- **Scalability**: Proven scalability patterns

### Infrastructure Choices

#### Deployment: Vercel + AWS ECS
- **Performance**: Vercel's global CDN for frontend
- **Flexibility**: ECS for custom backend logic
- **Cost**: Optimal pricing for growing applications
- **Developer Experience**: Excellent tooling and workflows

#### Authentication: Firebase Auth
- **Social Login**: Built-in support for Google, GitHub
- **Security**: Enterprise-grade security features
- **Scalability**: Handles millions of users
- **Integration**: Easy integration with both web and mobile

## Development Tooling Strategy

### Package Management: npm Workspaces
- **Simplicity**: Built-in to npm, no additional tools
- **Monorepo Support**: Efficient dependency management
- **Cross-Package Dependencies**: Clean internal package linking
- **Build Performance**: Optimized for monorepo builds

### Testing Strategy
- **Frontend**: Vitest for speed, React Testing Library for components
- **Backend**: Jest for comprehensive testing
- **E2E**: Playwright for web, Detox for mobile
- **Performance**: Automated performance regression testing

### CI/CD: GitHub Actions
- **Native Integration**: Seamless GitHub integration
- **Parallel Workflows**: Efficient web and mobile builds
- **Deployment**: Automated deployment to staging and production
- **Quality Gates**: Automated testing and security scanning

## Performance Optimization Strategy

### Frontend Performance
- **Bundle Size**: Code splitting and lazy loading
- **Runtime Performance**: 30-45 FPS animations with Framer Motion
- **Network**: Optimized API calls and caching
- **Mobile**: 60 FPS native animations with Reanimated

### Backend Performance
- **Database**: Optimized queries and connection pooling
- **Caching**: Multi-level caching strategy
- **API**: Sub-200ms response times
- **Scalability**: Auto-scaling based on load

### Infrastructure Performance
- **CDN**: Global content distribution
- **Load Balancing**: Application load balancer with health checks
- **Monitoring**: Real-time performance monitoring
- **Cost Optimization**: Resource rightsizing and auto-scaling

This technology stack provides a solid foundation for building Dopamine Hero with excellent performance, scalability, and developer experience while maintaining flexibility for future growth and mobile expansion.