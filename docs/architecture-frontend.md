# Dopamine Hero Frontend Architecture

## Frontend Architecture

Based on React 18+ and TypeScript, the frontend architecture prioritizes performance for ADHD users, component reusability, and state management complexity suitable for the dual-currency system.

### Component Architecture

#### Component Organization

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements (Button, Input, Card)
│   ├── forms/          # Form-specific components
│   ├── layout/         # Layout components (Header, Sidebar, Main)
│   └── features/       # Feature-specific components
│       ├── focus/      # Focus timer components
│       ├── tasks/      # Task management components
│       ├── modules/    # Module assembly components
│       └── presets/    # Preset management components
├── pages/              # Route-level components
├── hooks/              # Custom React hooks
├── services/           # API client services
├── stores/             # Zustand state stores
├── styles/             # Global styles and themes
├── utils/              # Frontend utilities
└── types/              # TypeScript type definitions
```

#### Component Template

```typescript
// src/components/features/focus/FocusTimer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusTimer } from '@/hooks/useFocusTimer';
import { useCurrencyStore } from '@/stores/currencyStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface FocusTimerProps {
  taskId?: string;
  presetId?: string;
  onComplete?: (session: FocusSession) => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  taskId,
  presetId,
  onComplete
}) => {
  const {
    timeLeft,
    isActive,
    status,
    start,
    pause,
    reset,
    complete
  } = useFocusTimer({ taskId, presetId });

  const { energy, dopamine } = useCurrencyStore();
  const [interruptions, setInterruptions] = useState(0);

  const handleComplete = useCallback(() => {
    const session = complete();
    onComplete?.(session);
  }, [complete, onComplete]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="focus-timer">
      <div className="timer-display">
        {formatTime(timeLeft)}
      </div>

      <div className="currency-display">
        <div className="energy-counter">
          ⚡ {energy.toFixed(1)}
        </div>
        <div className="dopamine-counter">
          🧪 {dopamine.toFixed(2)}
        </div>
      </div>

      <div className="timer-controls">
        <Button
          onClick={isActive ? pause : start}
          variant={isActive ? 'secondary' : 'primary'}
        >
          {isActive ? 'Pause' : 'Start'}
        </Button>

        <Button onClick={reset} variant="outline">
          Reset
        </Button>

        <Button
          onClick={handleComplete}
          variant="success"
          disabled={status !== 'active'}
        >
          Complete
        </Button>
      </div>
    </Card>
  );
};
```

### State Management Architecture

#### State Structure

```typescript
// src/stores/types.ts
export interface AppState {
  auth: AuthState;
  user: UserState;
  tasks: TaskState;
  focus: FocusState;
  modules: ModuleState;
  currency: CurrencyState;
  presets: PresetState;
  ui: UIState;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface CurrencyState {
  energy: number;
  dopamine: number;
  totalEnergyEarned: number;
  totalDopamineEarned: number;
  transactions: CurrencyTransaction[];
  lastUpdated: Date | null;
}

export interface FocusState {
  currentSession: FocusSession | null;
  isActive: boolean;
  timeLeft: number;
  status: SessionStatus;
  interruptions: number;
}
```

#### State Management Patterns

```typescript
// src/stores/currencyStore.ts
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { CurrencyState } from './types';
import { currencyService } from '@/services/currencyService';

interface CurrencyStore extends CurrencyState {
  // Actions
  setEnergy: (energy: number) => void;
  setDopamine: (dopamine: number) => void;
  addEnergy: (amount: number) => void;
  addDopamine: (amount: number) => void;
  spendEnergy: (amount: number) => void;
  refreshBalances: () => Promise<void>;
  reset: () => void;
}

export const useCurrencyStore = create<CurrencyStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      energy: 0,
      dopamine: 0,
      totalEnergyEarned: 0,
      totalDopamineEarned: 0,
      transactions: [],
      lastUpdated: null,

      // Actions
      setEnergy: (energy) => set({ energy }, false, 'setEnergy'),

      setDopamine: (dopamine) => set({ dopamine }, false, 'setDopamine'),

      addEnergy: (amount) => set(
        (state) => ({
          energy: state.energy + amount,
          totalEnergyEarned: state.totalEnergyEarned + amount,
          lastUpdated: new Date()
        }),
        false,
        'addEnergy'
      ),

      addDopamine: (amount) => set(
        (state) => ({
          dopamine: state.dopamine + amount,
          totalDopamineEarned: state.totalDopamineEarned + amount,
          lastUpdated: new Date()
        }),
        false,
        'addDopamine'
      ),

      spendEnergy: (amount) => set(
        (state) => ({
          energy: Math.max(0, state.energy - amount),
          lastUpdated: new Date()
        }),
        false,
        'spendEnergy'
      ),

      refreshBalances: async () => {
        try {
          const balances = await currencyService.getBalances();
          set({
            energy: balances.energy,
            dopamine: balances.dopamine,
            totalEnergyEarned: balances.totalEnergyEarned,
            totalDopamineEarned: balances.totalDopamineEarned,
            lastUpdated: new Date()
          }, false, 'refreshBalances');
        } catch (error) {
          console.error('Failed to refresh balances:', error);
        }
      },

      reset: () => set({
        energy: 0,
        dopamine: 0,
        totalEnergyEarned: 0,
        totalDopamineEarned: 0,
        transactions: [],
        lastUpdated: null
      }, false, 'reset')
    })),
    {
      name: 'currency-store'
    }
  )
);

// Subscribe to currency changes for persistence
if (typeof window !== 'undefined') {
  useCurrencyStore.subscribe(
    (state) => ({
      energy: state.energy,
      dopamine: state.dopamine,
      lastUpdated: state.lastUpdated
    }),
    (state) => {
      if (state.lastUpdated) {
        localStorage.setItem('currency-state', JSON.stringify(state));
      }
    },
    {
      fireImmediately: false
    }
  );
}
```

### Routing Architecture

#### Route Organization

```typescript
// src/routes/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <FocusMode />
      },
      {
        path: 'tasks',
        children: [
          {
            index: true,
            element: <TaskList />
          },
          {
            path: 'new',
            element: <TaskForm />
          },
          {
            path: ':id',
            element: <TaskDetail />
          },
          {
            path: ':id/edit',
            element: <TaskForm />
          }
        ]
      },
      {
        path: 'game',
        element: <ProtectedRoute><GameMode /></ProtectedRoute>,
        children: [
          {
            index: true,
            element: <ModuleAssembly />
          },
          {
            path: 'modules',
            element: <ModuleCatalog />
          },
          {
            path: 'presets',
            children: [
              {
                index: true,
                element: <PresetList />
              },
              {
                path: 'new',
                element: <PresetForm />
              },
              {
                path: ':id',
                element: <PresetDetail />
              }
            ]
          }
        ]
      },
      {
        path: 'profile',
        element: <ProtectedRoute><Profile /></ProtectedRoute>
      },
      {
        path: 'settings',
        element: <ProtectedRoute><Settings /></ProtectedRoute>
      }
    ]
  },
  {
    path: '/auth',
    children: [
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'register',
        element: <Register />
      }
    ]
  }
]);
```

#### Protected Route Pattern

```typescript
// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
```

### Frontend Services Layer

#### API Client Setup

```typescript
// src/services/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/authStore';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const tokens = useAuthStore.getState().tokens;
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newTokens = await this.refreshToken();
            useAuthStore.getState().setTokens(newTokens);

            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            useAuthStore.getState().logout();
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<AuthTokens> {
    const response = await this.client.post('/auth/refresh', {
      refreshToken: useAuthStore.getState().tokens?.refreshToken
    });
    return response.data.tokens;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

#### Service Example

```typescript
// src/services/currencyService.ts
import { apiClient } from './apiClient';
import { UserStats } from '@/types';

export interface CurrencyBalance {
  energy: number;
  dopamine: number;
  totalEnergyEarned: number;
  totalDopamineEarned: number;
}

export class CurrencyService {
  async getBalances(): Promise<CurrencyBalance> {
    return apiClient.get<CurrencyBalance>('/users/currency');
  }

  async getTransactionHistory(limit = 50): Promise<CurrencyTransaction[]> {
    return apiClient.get<CurrencyTransaction[]>('/users/transactions', {
      params: { limit }
    });
  }

  async purchaseModule(moduleId: string): Promise<UserModule> {
    return apiClient.post<UserModule>(`/modules/${moduleId}/purchase`);
  }

  async enhanceModule(userModuleId: string, dopamineAmount: number): Promise<UserModule> {
    return apiClient.post<UserModule>(`/user-modules/${userModuleId}/enhance`, {
      dopamineAmount
    });
  }
}

export const currencyService = new CurrencyService();
```

### Performance Optimization

#### Real-time Updates

```typescript
// src/hooks/useRealTimeSync.ts
import { useEffect, useRef } from 'react';
import { useCurrencyStore } from '@/stores/currencyStore';
import { useFocusStore } from '@/stores/focusStore';

export const useRealTimeSync = () => {
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const { refreshBalances } = useCurrencyStore();
  const { currentSession } = useFocusStore();

  useEffect(() => {
    // Sync currency balances every 30 seconds
    syncIntervalRef.current = setInterval(() => {
      refreshBalances();
    }, 30000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [refreshBalances]);

  // Sync more frequently during active focus sessions
  useEffect(() => {
    if (currentSession?.isActive) {
      const interval = setInterval(() => {
        refreshBalances();
      }, 5000); // Every 5 seconds during active sessions

      return () => clearInterval(interval);
    }
  }, [currentSession?.isActive, refreshBalances]);
};
```

#### Lazy Loading Components

```typescript
// src/components/LazyLoadedComponents.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const ModuleAssembly = lazy(() =>
  import('@/components/features/modules/ModuleAssembly').then(module => ({
    default: module.ModuleAssembly
  }))
);

export const LazyModuleAssembly = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <ModuleAssembly />
  </Suspense>
);
```

### Error Handling

#### Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Send to monitoring service
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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Oops! Something went wrong
      </h2>
      <p className="text-gray-600 mb-6">
        We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </button>
    </div>
  </div>
);
```

### Frontend Architecture Rationale

1. **Component Organization:** Feature-based structure supports AI agent development by grouping related functionality
2. **State Management:** Zustand provides simplicity for complex dual-currency state without Redux boilerplate
3. **TypeScript Integration:** Full type coverage ensures catch errors at build time for complex game logic
4. **Performance Optimized:** Optimistic updates and local state management provide sub-200ms perceived performance
5. **Error Boundaries:** Component-level error handling prevents cascade failures in complex module assembly
6. **Progressive Enhancement:** Core functionality works offline with sync when connection restored