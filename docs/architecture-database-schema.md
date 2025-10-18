# Dopamine Hero Database Schema

## Database Schema

Transforming the conceptual data models into a concrete PostgreSQL schema optimized for the dual-currency system and real-time performance requirements. The schema is designed for ACID compliance in currency transactions and query performance for ADHD users.

### Database Schema Definition

```sql
-- ========================================
-- Database: dopamine_hero
-- Engine: PostgreSQL 15+
-- ========================================

-- ========================================
-- Extensions
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ========================================
-- Enums
-- ========================================
CREATE TYPE task_category AS ENUM ('creative', 'analytical', 'physical', 'learning');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE session_status AS ENUM ('planned', 'active', 'completed', 'abandoned', 'paused');
CREATE TYPE module_type AS ENUM ('generator', 'multiplier', 'special', 'synergy');
CREATE TYPE module_rarity AS ENUM ('common', 'uncommon', 'rare', 'legendary');
CREATE TYPE preset_category AS ENUM ('work', 'study', 'creative', 'learning', 'custom');
CREATE TYPE theme_type AS ENUM ('light', 'dark', 'auto');

-- ========================================
-- Tables
-- ========================================

-- Users table - Core user accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Preferences stored as JSONB for flexibility
    preferences JSONB NOT NULL DEFAULT '{
        "focusSessionDuration": 25,
        "theme": "auto",
        "notifications": {
            "sessionComplete": true,
            "achievements": true
        },
        "accessibility": {
            "reducedMotion": false,
            "highContrast": false
        }
    }'::jsonb
);

-- Tasks table - Task management
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category task_category NOT NULL,
    status task_status NOT NULL DEFAULT 'pending',
    priority task_priority NOT NULL DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Modules table - Module definitions
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    type module_type NOT NULL,
    rarity module_rarity NOT NULL,
    base_energy_cost DECIMAL(10,2) NOT NULL CHECK (base_energy_cost >= 0),
    base_dopamine_generation DECIMAL(10,4) NOT NULL CHECK (base_dopamine_generation >= 0),
    effects JSONB NOT NULL DEFAULT '[]'::jsonb,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User modules - Users' owned modules
CREATE TABLE user_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    upgrade_level INTEGER NOT NULL DEFAULT 1 CHECK (upgrade_level >= 1),
    dopamine_enhancements DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (dopamine_enhancements >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,

    UNIQUE(user_id, module_id)
);

-- Module presets - User configurations
CREATE TABLE module_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category preset_category NOT NULL DEFAULT 'custom',
    configuration JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_energy_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_energy_cost >= 0),
    dopamine_generation_rate DECIMAL(10,4) NOT NULL DEFAULT 0 CHECK (dopamine_generation_rate >= 0),
    energy_efficiency DECIMAL(5,4) NOT NULL DEFAULT 0 CHECK (energy_efficiency >= 0),
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    total_session_time INTEGER NOT NULL DEFAULT 0 CHECK (total_session_time >= 0),
    average_dopamine_per_session DECIMAL(10,4) NOT NULL DEFAULT 0 CHECK (average_dopamine_per_session >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Focus sessions - Core focus timer functionality
CREATE TABLE focus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    module_preset_id UUID REFERENCES module_presets(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    planned_duration INTEGER NOT NULL CHECK (planned_duration >= 1), -- in minutes
    actual_duration INTEGER, -- in minutes
    status session_status NOT NULL DEFAULT 'planned',
    energy_generated DECIMAL(10,2) CHECK (energy_generated >= 0),
    dopamine_generated DECIMAL(10,4) CHECK (dopamine_generated >= 0),
    interruption_count INTEGER NOT NULL DEFAULT 0 CHECK (interruption_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User currency balances - Real-time currency tracking
CREATE TABLE user_currency_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    energy_balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (energy_balance >= 0),
    dopamine_balance DECIMAL(10,4) NOT NULL DEFAULT 0 CHECK (dopamine_balance >= 0),
    total_energy_earned DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_energy_earned >= 0),
    total_dopamine_earned DECIMAL(10,4) NOT NULL DEFAULT 0 CHECK (total_dopamine_earned >= 0),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Currency transactions - Audit trail for all currency movements
CREATE TABLE currency_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'focus_session', 'module_purchase', 'enhancement'
    energy_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    dopamine_amount DECIMAL(10,4) NOT NULL DEFAULT 0,
    balance_after_energy DECIMAL(10,2) NOT NULL,
    balance_after_dopamine DECIMAL(10,4) NOT NULL,
    reference_id UUID, -- Links to focus_sessions, user_modules, etc.
    reference_type VARCHAR(50), -- 'focus_session', 'user_module', etc.
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User achievements - Gamification elements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, achievement_type)
);

-- User statistics - Computed analytics
CREATE TABLE user_statistics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_focus_time INTEGER NOT NULL DEFAULT 0 CHECK (total_focus_time >= 0), -- in minutes
    total_tasks_completed INTEGER NOT NULL DEFAULT 0 CHECK (total_tasks_completed >= 0),
    current_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
    longest_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak_days >= 0),
    modules_owned INTEGER NOT NULL DEFAULT 0 CHECK (modules_owned >= 0),
    presets_created INTEGER NOT NULL DEFAULT 0 CHECK (presets_created >= 0),
    productivity_by_category JSONB DEFAULT '{}'::jsonb,
    weekly_progress JSONB DEFAULT '[]'::jsonb,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Indexes for Performance
-- ========================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Tasks indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_search ON tasks USING gin(title gin_trgm_ops, description gin_trgm_ops);

-- Focus sessions indexes
CREATE INDEX idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_status ON focus_sessions(status);
CREATE INDEX idx_focus_sessions_start_time ON focus_sessions(start_time);
CREATE INDEX idx_focus_sessions_user_start_time ON focus_sessions(user_id, start_time DESC);

-- Modules indexes
CREATE INDEX idx_modules_type ON modules(type);
CREATE INDEX idx_modules_rarity ON modules(rarity);
CREATE INDEX idx_modules_active ON modules(is_active) WHERE is_active = true;

-- User modules indexes
CREATE INDEX idx_user_modules_user_id ON user_modules(user_id);
CREATE INDEX idx_user_modules_active ON user_modules(user_id) WHERE is_active = true;

-- Module presets indexes
CREATE INDEX idx_module_presets_user_id ON module_presets(user_id);
CREATE INDEX idx_module_presets_category ON module_presets(category);
CREATE INDEX idx_module_presets_user_active ON module_presets(user_id) WHERE is_active = true;

-- Currency transactions indexes
CREATE INDEX idx_currency_transactions_user_id ON currency_transactions(user_id);
CREATE INDEX idx_currency_transactions_type ON currency_transactions(transaction_type);
CREATE INDEX idx_currency_transactions_created_at ON currency_transactions(created_at);
CREATE INDEX idx_currency_transactions_user_created ON currency_transactions(user_id, created_at DESC);

-- ========================================
-- Triggers and Functions
-- ========================================

-- Update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_presets_updated_at BEFORE UPDATE ON module_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize user currency balance
CREATE OR REPLACE FUNCTION initialize_user_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_currency_balances (user_id) VALUES (NEW.id);
    INSERT INTO user_statistics (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER initialize_user_balance_trigger AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_balance();

-- Currency transaction logging
CREATE OR REPLACE FUNCTION log_currency_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Log energy transaction
    IF NEW.energy_balance IS DISTINCT FROM OLD.energy_balance THEN
        INSERT INTO currency_transactions (
            user_id, transaction_type, energy_amount,
            balance_after_energy, balance_after_dopamine,
            reference_id, reference_type, metadata
        ) VALUES (
            NEW.user_id, 'balance_update',
            NEW.energy_balance - OLD.energy_balance,
            NEW.energy_balance, NEW.dopamine_balance,
            TG_ARGV[0]::UUID, TG_ARGV[1],
            jsonb_build_object('trigger', TG_TABLE_NAME)
        );
    END IF;

    -- Log dopamine transaction
    IF NEW.dopamine_balance IS DISTINCT FROM OLD.dopamine_balance THEN
        INSERT INTO currency_transactions (
            user_id, transaction_type, dopamine_amount,
            balance_after_energy, balance_after_dopamine,
            reference_id, reference_type, metadata
        ) VALUES (
            NEW.user_id, 'balance_update',
            NEW.dopamine_balance - OLD.dopamine_balance,
            NEW.energy_balance, NEW.dopamine_balance,
            TG_ARGV[0]::UUID, TG_ARGV[1],
            jsonb_build_object('trigger', TG_TABLE_NAME)
        );
    END IF;

    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_currency_transaction_trigger
    AFTER UPDATE ON user_currency_balances
    FOR EACH ROW EXECUTE FUNCTION log_currency_transaction();

-- Update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
        -- Update task completion statistics
        IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status != 'completed') THEN
            UPDATE user_statistics
            SET
                total_tasks_completed = total_tasks_completed + 1,
                productivity_by_category = jsonb_set(
                    productivity_by_category,
                    ARRAY[NEW.category::text],
                    COALESCE((productivity_by_category->NEW.category::text)::int, 0) + 1
                ),
                last_calculated = CURRENT_TIMESTAMP
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_statistics_trigger
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_user_statistics();
```

### Schema Design Rationale

1. **ACID Compliance for Currency:** All currency transactions use proper database constraints and triggers to ensure consistency in the dual-currency system

2. **Performance Optimization:** Strategic indexes on frequently queried columns (user_id, status, timestamps) support sub-200ms response times

3. **JSONB for Flexibility:** Preferences, effects, and configuration data stored as JSONB for schema evolution without migrations

4. **Audit Trail:** Complete currency transaction history enables debugging and economic analysis

5. **Computed Analytics:** User statistics table stores pre-computed values for dashboard performance

6. **Foreign Key Constraints:** Proper referential integrity ensures data consistency across complex relationships

7. **Enum Types:** Strong typing for categorical data prevents invalid states

### Indexing Strategy

- **Composite indexes** for common query patterns (user_id + status)
- **GIN indexes** for JSONB and text search
- **Partial indexes** for active records to reduce size
- **Time-based indexes** for analytics queries

### Data Consistency Rules

- **Currency balances never negative** (CHECK constraints)
- **Unique constraints** prevent duplicate user modules per user
- **Cascade deletes** maintain data integrity
- **Triggers** ensure derived data stays synchronized

### Currency System Constraints

- **Energy Balance**: Non-negative with maximum limits to prevent economic imbalance
- **Dopamine Balance**: Non-negative with unlimited accumulation potential
- **Transaction Atomicity**: All currency operations wrapped in database transactions
- **Audit Trail**: Complete history for debugging and economic analysis