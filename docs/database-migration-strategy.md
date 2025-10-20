# Database Migration and Seeding Strategy

## Overview

This document outlines the comprehensive database migration and seeding strategy for Dopamine Hero, ensuring reliable schema evolution and consistent initial data across all environments.

## Migration Architecture

### Migration System Design

**Technology Stack:**
- **Migration Runner**: Custom Node.js utility built on top of `pg` library
- **Migration Format**: SQL files with optional TypeScript up/down scripts
- **Version Control**: Numeric versioning with `migration_versions` table tracking
- **Rollback Support**: Down migrations for safe rollback procedures

**Migration File Structure:**
```
apps/api/src/database/migrations/
├── 001_initial_schema.sql
├── 002_add_currency_constraints.sql
├── 003_create_module_tables.sql
├── 004_add_achievement_system.sql
├── 005_add_user_preferences.sql
└── ...
```

### Migration Execution Process

**Development Environment:**
```bash
# Create new migration
npm run db:migration:create -- --name="add_new_feature"

# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Reset database (dangerous - only for development)
npm run db:reset
```

**Production Environment:**
```bash
# Dry run migration to preview changes
npm run db:migrate -- --env=production --dry-run

# Execute migration with monitoring
npm run db:migrate -- --env=production

# Validate migration success
npm run db:validate -- --env=production
```

## Seed Data Strategy

### Seed Data Categories

**1. Core Reference Data**
- Module catalog with balanced economics
- Task categories and priorities
- Achievement templates
- Default user preferences

**2. Environment-Specific Data**
- Development: Test users and demo data
- Staging: Sample production-like data
- Production: Minimal essential data only

**3. Dynamic Data**
- User statistics initialization
- Currency balance setup
- Achievement progress tracking

### Seed Data Execution

**Seed File Structure:**
```
apps/api/src/database/seeds/
├── 001_modules.ts          # Starter module catalog
├── 002_achievements.ts     # Achievement templates
├── 003_user_defaults.ts    # Default preferences
├── 004_tasks_categories.ts # Task categories
└── 005_development.ts      # Development-only data
```

**Seeding Commands:**
```bash
# Run all seeds for current environment
npm run db:seed

# Run specific seed file
npm run db:seed -- --file=001_modules

# Reset and reseed all data
npm run db:seed -- --reset

# Validate seed data integrity
npm run db:validate-seed
```

## Database Version Management

### Version Tracking

**Migration Versions Table:**
```sql
CREATE TABLE migration_versions (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    checksum VARCHAR(64)
);
```

**Seed Data Versioning:**
```sql
CREATE TABLE seed_versions (
    seed_name VARCHAR(255) PRIMARY KEY,
    version INTEGER NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    environment VARCHAR(50) NOT NULL
);
```

### Migration Validation

**Pre-Migration Checks:**
1. Database backup verification (production only)
2. Migration file integrity validation
3. Dependency conflict detection
4. Rollback feasibility assessment

**Post-Migration Validation:**
1. Schema consistency verification
2. Data integrity checks
3. Performance impact assessment
4. Application compatibility testing

## Environment-Specific Strategies

### Development Environment

**Characteristics:**
- Full migration and seed execution
- Test data and demo users
- Frequent resets and re-migrations
- Development-friendly debugging tools

**Configuration:**
```typescript
// config/development.json
{
  "database": {
    "migrations": {
      "autoRun": true,
      "seedData": true,
      "resetAllowed": true
    }
  }
}
```

### Staging Environment

**Characteristics:**
- Production-like data structure
- Sample user accounts for testing
- Careful migration validation
- Performance testing

**Configuration:**
```typescript
// config/staging.json
{
  "database": {
    "migrations": {
      "autoRun": false,
      "seedData": "essential",
      "resetAllowed": false
    }
  }
}
```

### Production Environment

**Characteristics:**
- Manual migration execution
- Minimal seed data only
- Comprehensive backup procedures
- Extensive validation requirements

**Configuration:**
```typescript
// config/production.json
{
  "database": {
    "migrations": {
      "autoRun": false,
      "seedData": "minimal",
      "resetAllowed": false,
      "requireBackup": true
    }
  }
}
```

## Safety and Rollback Procedures

### Migration Safety

**Pre-Migration Safety Checklist:**
1. ✅ Recent database backup verified
2. ✅ Migration files reviewed and approved
3. ✅ Rollback plan documented
4. ✅ Staging environment successfully tested
5. ✅ Application compatibility verified
6. ✅ Monitoring and alerting configured

**Migration Execution Protocol:**
1. **Preparation Phase**
   - Create database backup
   - Validate migration files
   - Prepare rollback procedures

2. **Execution Phase**
   - Run migration with monitoring
   - Validate post-migration state
   - Test application functionality

3. **Verification Phase**
   - Run health checks
   - Monitor performance metrics
   - Validate user workflows

### Rollback Procedures

**Automatic Rollback Triggers:**
- Migration execution failure
- Post-migration validation failure
- Application health check failures
- Performance degradation beyond thresholds

**Manual Rollback Process:**
```bash
# Step 1: Identify rollback target
npm run db:status -- --env=production

# Step 2: Execute rollback
npm run db:rollback -- --env=production --steps=1

# Step 3: Validate rollback success
npm run db:validate -- --env=production

# Step 4: Notify stakeholders
npm run notify:rollback -- --env=production
```

## Monitoring and Alerting

### Migration Monitoring

**Key Metrics:**
- Migration execution time
- Database performance impact
- Application error rates
- User experience degradation

**Alerting Conditions:**
- Migration failure
- Database connection issues
- Performance degradation >20%
- Application errors >5%

### Automated Health Checks

**Database Health:**
```typescript
const healthChecks = {
  connection: 'SELECT 1',
  schema: 'SELECT COUNT(*) FROM migration_versions',
  performance: 'SELECT pg_stat_activity()',
  integrity: 'SELECT COUNT(*) FROM users WHERE email IS NULL'
};
```

**Application Health:**
```typescript
const appHealthChecks = {
  api: 'GET /health',
  database: 'Database connectivity test',
  authentication: 'User login test',
  coreFeatures: 'Focus timer creation test'
};
```

## Best Practices

### Migration Development

1. **Small, Atomic Changes**
   - One logical change per migration
   - Avoid complex multi-table operations
   - Test thoroughly in development

2. **Backward Compatibility**
   - Maintain API compatibility
   - Support old application versions
   - Use feature flags for breaking changes

3. **Performance Considerations**
   - Avoid long-running migrations
   - Use proper indexing
   - Consider zero-downtime strategies

### Seed Data Management

1. **Idempotent Operations**
   - Seed scripts should be rerunnable
   - Use UPSERT operations
   - Handle existing data gracefully

2. **Environment Awareness**
   - Different seeds for different environments
   - Respect production data privacy
   - Use realistic but non-sensitive data

3. **Version Control**
   - Track seed data versions
   - Document data changes
   - Maintain data lineage

## Troubleshooting

### Common Issues

**Migration Conflicts:**
- Multiple developers creating migrations
- Dependency order problems
- Schema version mismatches

**Data Integrity Issues:**
- Constraint violations during seeding
- Orphaned records after rollback
- Performance degradation

**Environment Discrepancies:**
- Different schema versions
- Missing seed data
- Configuration mismatches

### Debugging Tools

```bash
# Check migration status
npm run db:status

# Validate database schema
npm run db:validate

# Check seed data integrity
npm run db:validate-seed

# Generate migration documentation
npm run db:docs
```

## Conclusion

This migration and seeding strategy provides a robust foundation for database schema evolution and consistent data management across all environments. The emphasis on safety, monitoring, and rollback procedures ensures reliable production deployments while maintaining development agility.

Key success factors:
- **Safety First**: Comprehensive backup and rollback procedures
- **Environment Awareness**: Tailored strategies for each environment
- **Monitoring**: Real-time health checks and alerting
- **Automation**: Streamlined processes with manual oversight
- **Documentation**: Clear procedures and troubleshooting guides