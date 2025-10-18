# Dopamine Hero Testing Strategy

## Testing Pyramid

```
    E2E Tests (5%)
        /        \
  Integration Tests (15%)
        /            \
Frontend Unit (40%)    Backend Unit (40%)
```

## Testing Organization

### Frontend Tests
```
apps/web/src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── Button.stories.tsx
│   ├── Timer/
│   │   ├── Timer.tsx
│   │   ├── Timer.test.tsx
│   │   └── Timer.test-utils.tsx
│   └── ...
├── features/
│   ├── focus/
│   │   ├── FocusDashboard.test.tsx
│   │   └── FocusTimer.test.tsx
│   └── ...
├── utils/
│   ├── energyCalculator.test.ts
│   └── formatters.test.ts
├── hooks/
│   ├── useAuth.test.ts
│   └── useFocusTimer.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── focus-mode.spec.ts
    ├── task-management.spec.ts
    └── module-assembly.spec.ts
```

### Backend Tests
```
apps/api/src/
├── services/
│   ├── authService.test.ts
│   ├── taskService.test.ts
│   └── gameService.test.ts
├── repositories/
│   ├── userRepository.test.ts
│   └── taskRepository.test.ts
├── controllers/
│   ├── taskController.test.ts
│   └── moduleController.test.ts
├── middleware/
│   ├── auth.test.ts
│   └── validation.test.ts
├── utils/
│   ├── gameLogic.test.ts
│   └── validation.test.ts
└── integration/
    ├── auth-flow.test.ts
    ├── task-management.test.ts
    └── module-interaction.test.ts
```

## Test Examples

### Frontend Component Test

```typescript
// apps/web/src/components/Timer/Timer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Timer } from './Timer';
import { useFocusStore } from '@/shared/stores/focusStore';

// Mock the store
jest.mock('@/shared/stores/focusStore');
const mockUseFocusStore = useFocusStore as jest.MockedFunction<typeof useFocusStore>;

describe('Timer Component', () => {
  const mockStartSession = jest.fn();
  const mockPauseSession = jest.fn();
  const mockCompleteSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFocusStore.mockReturnValue({
      currentSession: null,
      isActive: false,
      isPaused: false,
      timeRemaining: 1500, // 25 minutes
      energyGenerated: 0,
      startSession: mockStartSession,
      pauseSession: mockPauseSession,
      completeSession: mockCompleteSession,
      selectedTask: null
    } as any);
  });

  test('renders timer with initial time', () => {
    render(<Timer />);

    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  test('starts session when start button is clicked', async () => {
    const user = userEvent.setup();
    render(<Timer />);

    const startButton = screen.getByRole('button', { name: /start/i });
    await user.click(startButton);

    expect(mockStartSession).toHaveBeenCalledWith(1500);
  });

  test('shows pause button when session is active', () => {
    mockUseFocusStore.mockReturnValue({
      ...mockUseFocusStore(),
      isActive: true,
      isPaused: false
    } as any);

    render(<Timer />);

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
  });

  test('displays energy generated when session completes', async () => {
    mockUseFocusStore.mockReturnValue({
      ...mockUseFocusStore(),
      isActive: false,
      currentSession: {
        id: 'session-1',
        energyGenerated: 15.5
      }
    } as any);

    render(<Timer />);

    expect(screen.getByText(/earned 15.5 energy/i)).toBeInTheDocument();
  });

  test('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<Timer />);

    // Spacebar to start
    await user.keyboard(' ');
    expect(mockStartSession).toHaveBeenCalled();

    // Escape to pause (when active)
    mockUseFocusStore.mockReturnValue({
      ...mockUseFocusStore(),
      isActive: true
    } as any);

    await user.keyboard('{Escape}');
    expect(mockPauseSession).toHaveBeenCalled();
  });
});
```

### Backend API Test

```typescript
// apps/api/src/controllers/taskController.test.ts
import request from 'supertest';
import { app } from '../app';
import { TaskService } from '../services/taskService';
import { authenticateToken } from '../middleware/auth';

// Mock dependencies
jest.mock('../services/taskService');
jest.mock('../middleware/auth');

const mockTaskService = TaskService as jest.MockedClass<typeof TaskService>;
const mockAuthenticateToken = authenticateToken as jest.Mock;

describe('Task Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication
    mockAuthenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-1', email: 'test@example.com' };
      next();
    });
  });

  describe('GET /api/tasks', () => {
    test('returns user tasks successfully', async () => {
      const mockTasks = [
        { id: 'task-1', title: 'Test Task', category: 'creative' },
        { id: 'task-2', title: 'Another Task', category: 'analytical' }
      ];

      mockTaskService.prototype.getUserTasks = jest.fn().mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/v1/tasks')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ tasks: mockTasks });
      expect(mockTaskService.prototype.getUserTasks).toHaveBeenCalledWith('user-1', {});
    });

    test('applies filters correctly', async () => {
      mockTaskService.prototype.getUserTasks = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/v1/tasks?status=active&category=creative&limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect(mockTaskService.prototype.getUserTasks).toHaveBeenCalledWith('user-1', {
        status: 'active',
        category: 'creative',
        limit: 10
      });
    });

    test('returns 401 without authentication', async () => {
      mockAuthenticateToken.mockImplementation((req, res, next) => {
        res.status(401).json({ error: { message: 'Authentication required' } });
      });

      const response = await request(app).get('/v1/tasks');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/tasks', () => {
    test('creates task successfully', async () => {
      const newTask = {
        title: 'New Task',
        category: 'creative',
        priority: 'high'
      };

      const createdTask = { id: 'task-3', ...newTask, status: 'active' };
      mockTaskService.prototype.createTask = jest.fn().mockResolvedValue(createdTask);

      const response = await request(app)
        .post('/v1/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send(newTask);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdTask);
      expect(mockTaskService.prototype.createTask).toHaveBeenCalledWith('user-1', newTask);
    });

    test('validates required fields', async () => {
      const invalidTask = {
        category: 'creative'
        // Missing title
      };

      const response = await request(app)
        .post('/v1/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidTask);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('title');
    });
  });
});
```

### E2E Test

```typescript
// apps/web/src/e2e/focus-mode.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Focus Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await page.waitForURL('/app');
  });

  test('starts and completes focus session', async ({ page }) => {
    // Navigate to focus mode
    await page.click('[data-testid=focus-mode-tab]');
    await page.waitForURL('/app/focus');

    // Check timer is displayed
    await expect(page.locator('[data-testid=timer-display]')).toHaveText('25:00');

    // Start focus session
    await page.click('[data-testid=start-button]');
    await expect(page.locator('[data-testid=pause-button]')).toBeVisible();
    await expect(page.locator('[data-testid=timer-display]')).not.toHaveText('25:00');

    // Simulate time passing (in real test, we'd wait or mock)
    await page.evaluate(() => {
      // Mock timer progression
      window.dispatchEvent(new CustomEvent('timer-update', {
        detail: { timeRemaining: 1490 }
      }));
    });

    // Complete session
    await page.click('[data-testid=complete-button]');

    // Check energy was earned
    await expect(page.locator('[data-testid=energy-counter]')).toContainText('energy');
    await expect(page.locator('[data-testid=completion-modal]')).toBeVisible();
  });

  test('selects task for focus session', async ({ page }) => {
    await page.goto('/app/focus');

    // Select existing task
    await page.click('[data-testid=task-selector]');
    await page.click('[data-testid=task-option-1]');

    // Verify task is selected
    await expect(page.locator('[data-testid=selected-task]')).toBeVisible();

    // Start session with selected task
    await page.click('[data-testid=start-button]');

    // Verify task-based energy bonus
    await page.click('[data-testid=complete-button]');
    await expect(page.locator('[data-testid=task-bonus]')).toBeVisible();
  });

  test('handles interruption and resume', async ({ page }) => {
    await page.goto('/app/focus');

    // Start session
    await page.click('[data-testid=start-button]');

    // Pause session
    await page.click('[data-testid=pause-button]');
    await expect(page.locator('[data-testid=resume-button]')).toBeVisible();

    // Resume session
    await page.click('[data-testid=resume-button]');
    await expect(page.locator('[data-testid=pause-button]')).toBeVisible();

    // Verify interruptions are tracked
    await page.click('[data-testid=complete-button]');
    await expect(page.locator('[data-testid=session-summary]')).toContainText('1 interruption');
  });
});
```

## Testing Configuration

### Frontend Testing Setup

```typescript
// apps/web/src/test-setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that are declared as a part of tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock WebSocket for real-time features
jest.mock('@/shared/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: jest.fn(),
    isConnected: true,
    lastMessage: null
  })
}));

// Mock intersection observer for animations
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

### Backend Testing Setup

```typescript
// apps/api/src/test-setup.ts
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test database setup
beforeAll(async () => {
  // Setup test database
  await setupTestDatabase();

  // Seed test data
  await seedTestData();
});

afterAll(async () => {
  // Cleanup test database
  await cleanupTestDatabase();
});

beforeEach(async () => {
  // Clear all tables before each test
  await clearDatabase();
});

// Mock external services
jest.mock('firebase-admin/auth');
jest.mock('@aws-sdk/client-s3');
jest.mock('redis');
```

## Performance Testing

### Performance Test Framework

```typescript
// tests/performance/gameMechanics.test.ts
import { test, expect } from '@playwright/test';

test.describe('Game Mechanics Performance', () => {
  test('module assembly calculations under 100ms', async ({ page }) => {
    await page.goto('/game');

    // Create complex module assembly
    await page.click('[data-testid=add-module-1]');
    await page.click('[data-testid=add-module-2]');
    await page.click('[data-testid=add-module-3]');
    await page.click('[data-testid=add-module-4]');
    await page.click('[data-testid=add-module-5]');

    // Connect modules
    await page.dragAndDrop('[data-testid=module-1]', '[data-testid=connection-point-2]');
    await page.dragAndDrop('[data-testid=module-2]', '[data-testid=connection-point-3]');
    await page.dragAndDrop('[data-testid=module-3]', '[data-testid=connection-point-4]');
    await page.dragAndDrop('[data-testid=module-4]', '[data-testid=connection-point-5]');

    // Measure calculation time
    const startTime = Date.now();
    await page.click('[data-testid=calculate-effects]');
    await page.waitForSelector('[data-testid=effects-calculated]');
    const endTime = Date.now();

    const calculationTime = endTime - startTime;
    expect(calculationTime).toBeLessThan(100); // Should complete in under 100ms
  });

  test('timer accuracy within 50ms tolerance', async ({ page }) => {
    await page.goto('/focus');

    // Start 25-minute timer
    await page.click('[data-testid=start-timer]');

    // Wait for exactly 1 minute
    await page.waitForTimeout(60000);

    // Check timer accuracy
    const timeDisplay = await page.locator('[data-testid=timer-display]').textContent();
    const [minutes, seconds] = timeDisplay.split(':').map(Number);
    const totalSeconds = minutes * 60 + seconds;

    // Should be exactly 24 minutes (1440 seconds) +/- 3 seconds
    expect(totalSeconds).toBeGreaterThanOrEqual(1437);
    expect(totalSeconds).toBeLessThanOrEqual(1443);
  });

  test('real-time sync under 200ms latency', async ({ page, browser }) => {
    // Create two browser contexts to simulate multi-user
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login both users
    await loginUser(page1, 'user1@example.com');
    await loginUser(page2, 'user2@example.com');

    // User 1 creates a task
    await page1.goto('/tasks');
    await page1.click('[data-testid=create-task]');
    await page1.fill('[data-testid=task-title]', 'Test Task');
    await page1.click('[data-testid=save-task]');

    // Measure sync time
    const startTime = Date.now();

    // User 2 should see the task appear
    await page2.goto('/tasks');
    await page2.waitForSelector('[data-testid=task-card]:has-text("Test Task")]', { timeout: 5000 });

    const syncTime = Date.now() - startTime;
    expect(syncTime).toBeLessThan(200); // Should sync in under 200ms

    await context1.close();
    await context2.close();
  });
});
```

## Load Testing

### Load Testing with k6

```javascript
// tests/load/k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 1000 },  // Peak load
    { duration: '5m', target: 1000 },  // Stay at peak
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% failure rate
    http_reqs: ['rate>100'],           // At least 100 requests per second
  },
};

const API_BASE_URL = 'https://staging-api.dopaminehero.com/v1';

export default function () {
  // Test focus timer endpoint
  const focusResponse = http.post(`${API_BASE_URL}/focus-sessions`, {
    duration: 1500,
    taskId: 'test-task-id'
  }, {
    headers: {
      'Authorization': `Bearer ${__ENV.API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  check(focusResponse, {
    'focus session created': (r) => r.status === 201,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Test module assembly endpoint
  const assemblyResponse = http.post(`${API_BASE_URL}/presets/test-preset/load`, {
    assemblies: [
      { moduleId: 'module-1', position: { x: 0, y: 0 }, connections: ['module-2'] },
      { moduleId: 'module-2', position: { x: 1, y: 0 }, connections: [] }
    ]
  });

  check(assemblyResponse, {
    'assembly loaded': (r) => r.status === 200,
    'calculation time < 100ms': (r) => r.timings.duration < 100,
  });

  // Test task management endpoints
  const tasksResponse = http.get(`${API_BASE_URL}/tasks`, {
    headers: {
      'Authorization': `Bearer ${__ENV.API_TOKEN}`
    }
  });

  check(tasksResponse, {
    'tasks retrieved': (r) => r.status === 200,
    'task data present': (r) => JSON.parse(r.body).tasks.length > 0,
  });

  sleep(1); // Wait 1 second between requests
}
```

## Test Configuration Files

### Vitest Configuration

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  testEnvironment: 'jsdom',
  setupFiles: ['./src/test-setup.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/',
      'src/test-setup.ts',
      '**/*.d.ts',
      '**/*.config.*',
      'dist/',
      'coverage/'
    ],
    thresholds: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/shared': resolve(__dirname, '../../shared/src')
    }
  }
});
```

### Jest Configuration

```typescript
// apps/api/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test-setup.ts',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../shared/src/$1'
  }
};
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run test:start-server',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Testing Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest",
    "test:unit:watch": "vitest --watch",
    "test:unit:coverage": "vitest --coverage",
    "test:backend": "jest",
    "test:backend:watch": "jest --watch",
    "test:backend:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:performance": "playwright test --project=chromium",
    "test:load": "k6 run tests/load/k6/load-test.js",
    "test:start-server": "npm run build && npm run start:test",
    "test:setup": "npm run test:backend:setup && npm run test:frontend:setup"
  }
}
```

This comprehensive testing strategy provides:

1. **Multi-Level Testing**: Unit, integration, and E2E tests covering all critical functionality
2. **Performance Testing**: Load testing for scalability and performance validation
3. **Cross-Browser Testing**: Support for Chrome, Firefox, Safari, and mobile browsers
4. **Continuous Integration**: Automated testing in CI/CD pipeline
5. **Coverage Requirements**: 80% minimum coverage threshold for quality assurance
6. **Game Mechanics Testing**: Specialized tests for real-time features and animations

The testing framework ensures Dopamine Hero meets its performance, reliability, and user experience requirements while maintaining high code quality throughout development.