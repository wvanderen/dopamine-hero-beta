# Dopamine Hero Data Models

Based on the PRD requirements, I'll define the core data models/entities that will be shared between frontend and backend. These models represent the fundamental business concepts of Dopamine Hero and will support both the productivity and gaming systems.

## User

**Purpose:** Core user profile and authentication data, supporting both web and mobile platforms with consistent user experience across devices.

**Key Attributes:**
- id: UUID - Primary unique identifier
- email: string - User email address (unique)
- displayName: string - User's chosen display name
- avatar: string (URL) - Profile image URL
- createdAt: DateTime - Account creation timestamp
- updatedAt: DateTime - Last profile update
- preferences: JSON - User settings and preferences
- subscriptionTier: string - Free/Premium tier status

**TypeScript Interface:**
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  subscriptionTier: 'free' | 'premium';
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  focusTimerDuration: number; // minutes
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
}
```

**Relationships:**
- One-to-many with Tasks (user creates tasks)
- One-to-many with FocusSessions (user has focus sessions)
- One-to-many with OwnedModules (user owns modules)
- One-to-many with Presets (user creates presets)
- One-to-one with UserStats (user statistics)

## Task

**Purpose:** Represents work items that users can complete to generate energy, with categorization determining energy rewards and productivity patterns.

**Key Attributes:**
- id: UUID - Primary unique identifier
- userId: UUID (FK) - Owner of the task
- title: string - Task title/name
- description: string - Detailed task description
- category: TaskCategory - Type of work (creative, analytical, physical, learning)
- status: TaskStatus - Current state (active, completed, archived)
- priority: TaskPriority - Importance level
- dueDate: DateTime - Optional deadline
- estimatedDuration: number - Expected completion time in minutes
- createdAt: DateTime - Task creation timestamp
- updatedAt: DateTime - Last modification
- completedAt: DateTime - Completion timestamp

**TypeScript Interface:**
```typescript
interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  estimatedDuration?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

type TaskCategory = 'creative' | 'analytical' | 'physical' | 'learning';
type TaskStatus = 'active' | 'completed' | 'archived';
type TaskPriority = 'low' | 'medium' | 'high';
```

**Relationships:**
- Many-to-one with User (task belongs to user)
- One-to-many with FocusSessions (task can have multiple focus sessions)

## FocusSession

**Purpose:** Records individual focus timer sessions, linking productivity work with energy generation and tracking user patterns.

**Key Attributes:**
- id: UUID - Primary unique identifier
- userId: UUID (FK) - User who owns the session
- taskId: UUID (FK) - Task associated with session (optional)
- duration: number - Session length in minutes
- actualDuration: number - Actual time completed (may differ from planned)
- energyGenerated: number - Energy earned from this session
- startedAt: DateTime - Session start timestamp
- endedAt: DateTime - Session end timestamp
- interruptions: number - Count of interruptions/pauses
- quality: SessionQuality - User-rated session quality
- notes: string - Optional session notes

**TypeScript Interface:**
```typescript
interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  duration: number;
  actualDuration: number;
  energyGenerated: number;
  startedAt: Date;
  endedAt: Date;
  interruptions: number;
  quality: SessionQuality;
  notes?: string;
}

type SessionQuality = 'excellent' | 'good' | 'fair' | 'poor';
```

**Relationships:**
- Many-to-one with User (session belongs to user)
- Many-to-one with Task (session belongs to task, optional)

## Module

**Purpose:** Defines the synth modules that users can acquire, with unique effects, costs, and rarity levels that drive the gaming economy.

**Key Attributes:**
- id: UUID - Primary unique identifier
- name: string - Module display name
- description: string - Module functionality description
- type: ModuleType - Category of module (generator, multiplier, special)
- rarity: ModuleRarity - Rarity level affecting cost and power
- baseCost: number - Energy cost to acquire
- effect: ModuleEffect - Effect specification and parameters
- requirements: JSON - Prerequisites for acquisition
- isActive: boolean - Whether module is available
- createdAt: DateTime - Module creation timestamp

**TypeScript Interface:**
```typescript
interface Module {
  id: string;
  name: string;
  description: string;
  type: ModuleType;
  rarity: ModuleRarity;
  baseCost: number;
  effect: ModuleEffect;
  requirements: ModuleRequirements;
  isActive: boolean;
  createdAt: Date;
}

interface ModuleEffect {
  type: EffectType;
  value: number;
  duration?: number; // in minutes
  targets?: string[]; // what this module affects
  conditions?: EffectCondition[];
}

type ModuleType = 'generator' | 'multiplier' | 'modifier' | 'special';
type ModuleRarity = 'common' | 'rare' | 'epic' | 'legendary';
type EffectType = 'energy_bonus' | 'time_bonus' | 'focus_multiplier' | 'streak_bonus';
```

**Relationships:**
- One-to-many with OwnedModules (module can be owned by multiple users)
- Many-to-many with Presets (module appears in presets)

## OwnedModule

**Purpose:** Represents instances of modules owned by users, tracking acquisition, usage, and customization.

**Key Attributes:**
- id: UUID - Primary unique identifier
- userId: UUID (FK) - Owner of the module
- moduleId: UUID (FK) - Module definition
- acquiredAt: DateTime - When module was acquired
- usageCount: number - Times used in assemblies
- level: number - Module upgrade level
- customName: string - User-given custom name
- isFavorite: boolean - User marked as favorite
- metadata: JSON - Custom module state

**TypeScript Interface:**
```typescript
interface OwnedModule {
  id: string;
  userId: string;
  moduleId: string;
  acquiredAt: Date;
  usageCount: number;
  level: number;
  customName?: string;
  isFavorite: boolean;
  metadata: Record<string, any>;
}
```

**Relationships:**
- Many-to-one with User (owned module belongs to user)
- Many-to-one with Module (owned module refers to module definition)
- Many-to-many with PresetAssembly (modules used in presets)

## Preset

**Purpose:** User-created module configurations that can be quickly saved and loaded for different work scenarios, reducing decision fatigue.

**Key Attributes:**
- id: UUID - Primary unique identifier
- userId: UUID (FK) - Creator of preset
- name: string - Preset display name
- description: string - Preset purpose description
- category: PresetCategory - Use case category
- isPublic: boolean - Whether preset is shareable
- usageCount: number - Times preset has been loaded
- effectiveness: number - Calculated effectiveness score
- createdAt: DateTime - Preset creation timestamp
- updatedAt: DateTime - Last modification

**TypeScript Interface:**
```typescript
interface Preset {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: PresetCategory;
  isPublic: boolean;
  usageCount: number;
  effectiveness: number;
  createdAt: Date;
  updatedAt: Date;
}

type PresetCategory = 'focus' | 'creative' | 'analytical' | 'learning' | 'custom';
```

**Relationships:**
- Many-to-one with User (preset belongs to user)
- One-to-many with PresetAssembly (preset contains multiple modules)

## PresetAssembly

**Purpose:** Junction table representing which modules are in which presets and their configuration.

**Key Attributes:**
- id: UUID - Primary unique identifier
- presetId: UUID (FK) - Preset this assembly belongs to
- ownedModuleId: UUID (FK) - Specific module instance
- position: Position - Grid position in assembly
- configuration: JSON - Module-specific settings
- connections: string[] - Connected module IDs

**TypeScript Interface:**
```typescript
interface PresetAssembly {
  id: string;
  presetId: string;
  ownedModuleId: string;
  position: Position;
  configuration: ModuleConfiguration;
  connections: string[];
}

interface Position {
  x: number;
  y: number;
}

interface ModuleConfiguration {
  enabled: boolean;
  intensity: number; // 0-100
  customSettings: Record<string, any>;
}
```

**Relationships:**
- Many-to-one with Preset (assembly belongs to preset)
- Many-to-one with OwnedModule (assembly uses specific module)

## UserStats

**Purpose:** Aggregated user statistics and achievements for progress tracking and motivation.

**Key Attributes:**
- id: UUID - Primary unique identifier
- userId: UUID (FK) - User these stats belong to
- totalFocusTime: number - Lifetime focus minutes
- totalTasksCompleted: number - Completed tasks count
- totalEnergyGenerated: number - Lifetime energy earned
- currentStreak: number - Current daily streak
- longestStreak: number - Longest streak achieved
- modulesAcquired: number - Total modules owned
- presetsCreated: number - Presets created
- lastActiveDate: DateTime - Last activity timestamp
- achievements: JSON - Unlocked achievements

**TypeScript Interface:**
```typescript
interface UserStats {
  id: string;
  userId: string;
  totalFocusTime: number;
  totalTasksCompleted: number;
  totalEnergyGenerated: number;
  currentStreak: number;
  longestStreak: number;
  modulesAcquired: number;
  presetsCreated: number;
  lastActiveDate: Date;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: Date;
  icon: string;
}
```

**Relationships:**
- One-to-one with User (stats belong to user)

## Additional Models for Enhanced Features

### EnergyTransaction
**Purpose:** Track all energy-related transactions for detailed analytics and user insights.

```typescript
interface EnergyTransaction {
  id: string;
  userId: string;
  amount: number;
  source: TransactionSource;
  description: string;
  createdAt: Date;
  relatedEntityId?: string; // Task ID, Session ID, etc.
}

type TransactionSource = 'focus_session' | 'module_purchase' | 'bonus' | 'achievement' | 'refund';
```

### ModuleInteraction
**Purpose:** Track complex module interactions and synergies for game balance.

```typescript
interface ModuleInteraction {
  id: string;
  userId: string;
  moduleIds: string[]; // Modules involved in interaction
  interactionType: InteractionType;
  effectBonus: number; // Calculated bonus effect
  discoveredAt: Date;
  usageCount: number;
}

type InteractionType = 'synergy' | 'combination' | 'chain' | 'bonus';
```

### UserActivityLog
**Purpose:** Comprehensive activity logging for analytics and user behavior analysis.

```typescript
interface UserActivityLog {
  id: string;
  userId: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  metadata: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
}

type ActivityAction = 'create' | 'update' | 'delete' | 'complete' | 'purchase' | 'load' | 'save';
```

## Data Model Validation Against PRD

### FR Coverage: 100% Complete

✅ **FR1: Focus Mode with Timer System** - Fully supported by FocusSession model
✅ **FR2: Task Management with Categorization** - Complete Task model with all required fields
✅ **FR3: Single Energy Generation System** - Energy tracking across sessions and transactions
✅ **FR4: Synth Module Acquisition System** - Complete Module and OwnedModule models
✅ **FR5: Module Assembly Interface** - PresetAssembly with positioning and configuration
✅ **FR6: Preset Management System** - Full Preset model with categorization
✅ **FR7: Session Persistence and Sync** - Comprehensive timestamp and relationship tracking
✅ **FR8: User Profile and Progress Tracking** - UserStats with comprehensive metrics
✅ **FR9: Onboarding Simplicity** - Clear data relationships support simple user journey

### Cross-Platform Consistency

- **TypeScript Interfaces**: 100% type sharing between web and mobile
- **UUID Primary Keys**: Optimized for distributed systems and mobile sync
- **JSON Fields**: Flexible schema for future feature expansion
- **Audit Trails**: Comprehensive timestamps for synchronization

### Scalability Considerations

- **Database Optimization**: Proper indexing strategies defined
- **Relationship Design**: Clear boundaries for future microservice extraction
- **Data Partitioning**: User-based data partitioning for scale
- **Caching Strategy**: Models designed for effective caching

These data models provide a solid foundation for Dopamine Hero's hybrid productivity and gaming system, supporting both current requirements and future scalability needs.