# Dopamine Hero Coding Standards and Error Handling

## Coding Standards

Defining minimal but critical standards for AI agents to ensure consistency, prevent common mistakes, and maintain code quality across the complex dual-currency system.

### Critical Fullstack Rules

- **Type Sharing:** Always define types in `packages/shared` and import from there - ensures frontend/backend consistency for complex game logic
- **API Calls:** Never make direct HTTP calls - use the service layer to maintain consistent error handling and authentication
- **Environment Variables:** Access only through config objects, never process.env directly - prevents runtime errors and improves security
- **Error Handling:** All API routes must use the standard error handler - ensures consistent error responses across the application
- **State Updates:** Never mutate state directly - use proper state management patterns to prevent bugs in currency calculations
- **Database Transactions:** All currency operations must be wrapped in database transactions - ensures ACID compliance for economic system
- **Input Validation:** Never trust user input - always validate using Joi schemas before processing
- **Authentication Checks:** All protected routes must validate JWT tokens and check user permissions - prevents unauthorized access
- **Async Error Handling:** Always use try-catch blocks or .catch() with async operations - prevents unhandled promise rejections
- **Performance Logging:** Log slow operations (>100ms for API, >50ms for DB) - essential for maintaining ADHD user experience

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | - | `useAuth.ts` |
| API Routes | - | kebab-case | `/api/user-profile` |
| Database Tables | - | snake_case | `user_profiles` |
| Variables | camelCase | camelCase | `userName`, `sessionData` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `MAX_SESSION_DURATION` |
| Files | kebab-case | kebab-case | `focus-timer.tsx` |
| Interfaces | PascalCase with 'I' prefix | PascalCase | `IUser`, `FocusSession` |
| Types | PascalCase | PascalCase | `TaskCategory`, `ModuleType` |

### Code Quality Standards

#### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

#### ESLint Critical Rules

```javascript
module.exports = {
  rules: {
    // Prevent runtime errors
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    'no-var': 'error',
    'prefer-const': 'error',

    // Ensure consistency
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I']
      }
    ],

    // Prevent common bugs
    'eqeqeq': 'error',
    'curly': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // Security
    'no-script-url': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'warn'
  }
};
```

### Specific Standards for Dual-Currency System

#### Currency Calculations

```typescript
// ✅ CORRECT: Use Decimal for financial calculations
import Decimal from 'decimal.js';

export function calculateEnergy(session: FocusSession, duration: number): Decimal {
  const baseEnergy = new Decimal(duration);

  // Apply category bonuses
  const categoryBonus = CATEGORY_BONUSES[session.task?.category] || 1;
  const withBonus = baseEnergy.mul(categoryBonus);

  // Apply duration bonuses
  if (duration >= 25) {
    withBonus.mul(1.1);
  }

  return withBonus.toDecimalPlaces(2);
}

// ❌ WRONG: Never use floating point for currency
export function calculateEnergyWrong(session: FocusSession, duration: number): number {
  return duration * 1.1; // Precision errors!
}
```

#### State Management

```typescript
// ✅ CORRECT: Immutable updates with proper typing
export const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  energy: 0,
  dopamine: 0,

  addEnergy: (amount: number) => set(
    (state) => ({
      energy: state.energy + amount,
      lastUpdated: new Date()
    }),
    false,
    'addEnergy'
  ),

  spendEnergy: (amount: number) => set(
    (state) => ({
      energy: Math.max(0, state.energy - amount)
    }),
    false,
    'spendEnergy'
  )
}));

// ❌ WRONG: Direct mutation
export const useCurrencyStoreWrong = create<CurrencyStore>((set, get) => ({
  energy: 0,

  addEnergy: (amount: number) => {
    get().energy += amount; // Don't do this!
  }
}));
```

#### API Error Handling

```typescript
// ✅ CORRECT: Standardized error handling
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    requestId,
    endpoint: req.path,
    method: req.method,
  });

  const apiError: ApiError = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId,
    }
  };

  res.status(500).json(apiError);
};

// ❌ WRONG: Inconsistent error handling
export const badErrorHandler = (error: Error, req: Request, res: Response) => {
  res.status(500).json({ error: error.message }); // No context, no ID
};
```

#### Database Operations

```typescript
// ✅ CORRECT: Transactions for currency operations
export async function purchaseModule(
  userId: string,
  moduleId: string
): Promise<UserModule> {
  return await db.transaction(async (client) => {
    // Get current balance
    const balance = await client.query(
      'SELECT energy_balance FROM user_currency_balances WHERE user_id = $1',
      [userId]
    );

    const module = await client.query(
      'SELECT base_energy_cost FROM modules WHERE id = $1',
      [moduleId]
    );

    if (balance.rows[0].energy_balance < module.rows[0].base_energy_cost) {
      throw new Error('Insufficient energy');
    }

    // Update balance
    await client.query(
      'UPDATE user_currency_balances SET energy_balance = energy_balance - $1 WHERE user_id = $2',
      [module.rows[0].base_energy_cost, userId]
    );

    // Create user module
    const newModule = await client.query(
      'INSERT INTO user_modules (user_id, module_id) VALUES ($1, $2) RETURNING *',
      [userId, moduleId]
    );

    return newModule.rows[0];
  });
}

// ❌ WRONG: No transaction, race conditions possible
export async function purchaseModuleWrong(
  userId: string,
  moduleId: string
): Promise<UserModule> {
  // These operations aren't atomic!
  const balance = await getBalance(userId);
  const module = await getModule(moduleId);

  if (balance.energy < module.cost) {
    throw new Error('Insufficient energy');
  }

  // What if another request happens between these?
  await updateBalance(userId, balance.energy - module.cost);
  return await createUserModule(userId, moduleId);
}
```

### React Component Standards

```typescript
// ✅ CORRECT: Proper component structure
interface FocusTimerProps {
  duration: number;
  onComplete: (session: FocusSession) => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  duration,
  onComplete
}) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isActive, setIsActive] = useState(false);

  const handleComplete = useCallback(() => {
    // Validation
    if (timeLeft > 0) return;

    const session: FocusSession = {
      id: generateId(),
      duration: duration - Math.floor(timeLeft / 60),
      completedAt: new Date(),
    };

    onComplete(session);
  }, [duration, timeLeft, onComplete]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  return (
    <div className="focus-timer">
      <div className="timer-display">
        {formatTime(timeLeft)}
      </div>
      <div className="timer-controls">
        <button
          onClick={() => setIsActive(!isActive)}
          disabled={timeLeft === 0}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button onClick={handleComplete} disabled={timeLeft > 0}>
          Complete
        </button>
      </div>
    </div>
  );
};
```

### Critical Constants

```typescript
// packages/shared/src/constants/currency.ts
export const CURRENCY_CONSTANTS = {
  ENERGY: {
    BASE_RATE: 1, // 1 energy per minute
    MAX_BALANCE: 10000,
    SESSION_BONUS_THRESHOLD: 25, // minutes
    SESSION_BONUS_MULTIPLIER: 1.1,
    MAX_INTERRUPTION_PENALTY: 0.5,
  },
  DOPAMINE: {
    BASE_GENERATION_RATE: 0.1, // per module per minute
    MAX_BALANCE: 1000000,
    SYNERGY_BONUS_MULTIPLIER: 1.2,
  },
  VALIDATION: {
    MIN_SESSION_DURATION: 1,
    MAX_SESSION_DURATION: 480, // 8 hours
    MIN_ENERGY_COST: 1,
    MAX_ENERGY_COST: 1000,
  }
} as const;
```

### AI Agent Development Guidelines

1. **Type Safety First:** Always define types before implementing functionality
2. **Test Critical Paths:** All currency calculations must have unit tests
3. **Error Boundaries:** Every async operation must have proper error handling
4. **Performance Awareness:** Monitor for slow operations that could impact ADHD users
5. **Documentation:** Complex business logic (especially economic calculations) must be well-documented
6. **Security Mindset:** Never trust user input, always validate and sanitize
7. **Consistency:** Follow established patterns for similar functionality

### Code Review Checklist for AI Agents

- [ ] Types are defined in shared package when used across frontend/backend
- [ ] All async operations have error handling
- [ ] Currency calculations use Decimal.js
- [ ] Database operations use transactions where appropriate
- [ ] Component props are properly typed
- [ ] No direct process.env access
- [ ] API calls go through service layer
- [ ] Performance logging for potentially slow operations
- [ ] Tests cover critical business logic
- [ ] Code follows naming conventions

## Error Handling Strategy

Implementing unified error handling across frontend and backend that provides excellent user experience for ADHD users while maintaining system reliability and debugging capabilities.

### Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
    retryable?: boolean;
    retryAfter?: number; // seconds
  };
}
```

### Frontend Error Handling

#### Error Boundary Component

```typescript
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);

    // Log to monitoring service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}
```

#### Error Hook

```typescript
export const useErrorHandler = () => {
  const [error, setError] = useState<ApiClientError | null>(null);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiClientError) {
      setError(error);
    } else if (error instanceof AxiosError) {
      setError(handleApiError(error));
    } else if (error instanceof Error) {
      setError(new ApiClientError(
        error.message,
        'UNKNOWN_ERROR',
        'client-side',
        undefined,
        false
      ));
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
};
```

### Backend Error Handling

#### Global Error Handler

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, any>,
    retryable = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.retryable = retryable;
    this.retryAfter = retryAfter;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, details, false);
  }
}

export class InsufficientEnergyError extends AppError {
  constructor(currentEnergy: number, requiredEnergy: number) {
    super(
      `Insufficient energy. You have ${currentEnergy} but need ${requiredEnergy}.`,
      400,
      'INSUFFICIENT_ENERGY',
      true,
      { currentEnergy, requiredEnergy },
      false
    );
  }
}
```

#### Currency System Error Handling

```typescript
export class CurrencyService {
  async processSessionRewards(
    userId: string,
    energyAmount: number,
    dopamineAmount: number,
    sessionId: string
  ): Promise<void> {
    try {
      await this.db.transaction(async (client) => {
        // Get current balances
        const currentBalances = await this.getBalancesWithLock(client, userId);

        // Validate energy amount
        if (energyAmount < 0) {
          throw new ValidationError(
            'Energy reward cannot be negative',
            { energyAmount }
          );
        }

        // Check for overflow
        const newEnergyBalance = currentBalances.energy + energyAmount;
        const newDopamineBalance = currentBalances.dopamine + dopamineAmount;

        if (newEnergyBalance > CURRENCY_CONSTANTS.ENERGY.MAX_BALANCE) {
          throw new ValidationError(
            'Energy balance would exceed maximum limit',
            {
              current: currentBalances.energy,
              reward: energyAmount,
              max: CURRENCY_CONSTANTS.ENERGY.MAX_BALANCE
            }
          );
        }

        // Update balances
        await client.query(
          `UPDATE user_currency_balances
           SET energy_balance = energy_balance + $1,
               dopamine_balance = dopamine_balance + $2,
               total_energy_earned = total_energy_earned + $1,
               total_dopamine_earned = total_dopamine_earned + $2,
               last_updated = CURRENT_TIMESTAMP
           WHERE user_id = $3`,
          [energyAmount, dopamineAmount, userId]
        );

        logger.info('Session rewards processed', {
          userId,
          sessionId,
          energyAmount,
          dopamineAmount,
          newEnergyBalance,
          newDopamineBalance,
        });
      });
    } catch (error) {
      logger.error('Failed to process session rewards', {
        error: error.message,
        userId,
        sessionId,
        energyAmount,
        dopamineAmount,
        stack: error.stack,
      });

      // Re-throw with context
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new DatabaseError(
        'Failed to process session rewards',
        error instanceof Error ? error : undefined
      );
    }
  }
}
```

### Error Handling Rationale

1. **User Experience for ADHD:** Clear, actionable error messages reduce frustration and anxiety
2. **Consistency:** Unified error format across frontend and backend simplifies debugging
3. **Recovery:** Retry mechanisms and clear error states help users recover from failures
4. **Debugging:** Comprehensive error logging with request IDs enables effective troubleshooting
5. **Financial Safety:** Robust error handling prevents currency calculation errors that could impact the economic system
6. **Performance:** Fast error handling prevents cascading failures that could impact user experience
7. **Monitoring:** Structured error reporting enables proactive issue detection and resolution

### Performance Monitoring

```typescript
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    // Record metrics
    const durationHistogram = getHistogram('http_request_duration_ms', 'HTTP request duration in ms', ['method', 'route', 'status']);
    durationHistogram.observe({ method: req.method, route: req.route?.path || 'unknown', status: res.statusCode.toString() }, duration);

    // Log slow requests
    if (duration > 100) {
      logger.warn('Slow request detected', {
        endpoint,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }
  });

  next();
};
```

### Error Handling Best Practices

1. **Never Swallow Errors:** Always handle or properly bubble up errors
2. **Provide Context:** Include request IDs, user information, and relevant data in error logs
3. **User-Friendly Messages:** Translate technical errors into actionable user messages
4. **Recovery Options:** Provide clear paths for users to recover from error states
5. **Monitoring Integration:** Send structured error data to monitoring systems
6. **Rate Limiting on Errors:** Prevent cascading failures from overwhelming the system
7. **Security:** Never expose sensitive information in error messages