# Project Setup Guide

## Prerequisites Verification

### Required Software Versions

Before setting up the Dopamine Hero project, ensure your system meets these requirements:

#### Core Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Git**: Latest stable version
- **Docker**: Latest stable version (for local development containers)

#### Version Verification Commands

Run these commands to verify your software versions:

```bash
# Check Node.js version
node --version
# Expected: v18.0.0 or higher

# Check npm version
npm --version
# Expected: 9.0.0 or higher

# Check Git version
git --version
# Expected: 2.x.x or higher

# Check Docker version
docker --version
# Expected: 20.x.x or higher

# Check Docker Compose version
docker-compose --version
# Expected: 2.x.x or higher
```

### System Compatibility

#### Supported Operating Systems
- **Linux**: Ubuntu 20.04+, CentOS 8+, Arch Linux
- **macOS**: 11.0 (Big Sur) or higher
- **Windows**: Windows 10 with WSL2 (Windows Subsystem for Linux)

#### Platform-Specific Notes

**Linux Users:**
- Install Node.js via NodeSource or nvm for proper version management
- Ensure Docker daemon is running and user has proper permissions
- Some distributions may require additional build tools

**macOS Users:**
- Use Homebrew for easy installation: `brew install node git docker`
- Ensure Docker Desktop is installed and running
- Xcode Command Line Tools may be required for some packages

**Windows Users:**
- WSL2 is required for proper development environment
- Install Docker Desktop with WSL2 integration enabled
- Use Windows Terminal for best command-line experience

#### Installing Missing Dependencies

**Install Node.js and npm:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from nodejs.org
```

**Install Git:**
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install git

# macOS (with Homebrew)
brew install git

# Windows
# Download from git-scm.com
```

**Install Docker:**
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install docker.io docker-compose

# macOS/Windows
# Download Docker Desktop from docker.com
```

## Repository Initial Setup

### Step 1: Clone the Repository

```bash
# Clone the repository (replace with actual repository URL)
git clone https://github.com/your-org/dopamine-hero.git

# Navigate to the project directory
cd dopamine-hero
```

### Step 2: Install Dependencies

```bash
# Install all dependencies for the monorepo
npm install

# This will automatically install dependencies for:
# - apps/web/ (frontend application)
# - apps/api/ (backend application)
# - packages/shared/ (shared utilities)
# - packages/ui/ (shared UI components)
# - packages/config/ (configuration files)
```

### Step 3: Verify Monorepo Workspace Setup

```bash
# Verify workspace structure
npm run workspaces:list

# Check that all packages are properly linked
npm ls --workspaces
```

## Development Environment Configuration

### Step 1: Environment File Setup

```bash
# Copy environment templates for web application
cp apps/web/.env.example apps/web/.env.local

# Copy environment templates for API application
cp apps/api/.env.example apps/api/.env

# List all environment files
ls -la apps/**/.env*
```

### Step 2: Database and Redis Setup

**Option A: Using Docker (Recommended for Development)**
```bash
# Start database and Redis containers
docker-compose up -d database redis

# Verify services are running
docker ps
```

**Option B: Local Installation**
- Follow your platform-specific installation instructions for PostgreSQL and Redis
- Ensure PostgreSQL is accepting connections on localhost:5432
- Ensure Redis is accepting connections on localhost:6379

### Step 3: Start Development Servers

```bash
# Start all services (frontend + backend + database)
npm run dev

# Or start services individually:
# Start frontend only
npm run dev:web

# Start backend only
npm run dev:api

# Access applications:
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# API Documentation: http://localhost:3001/docs
```

## Setup Validation and Troubleshooting

### Validation Commands

Run these commands to verify your setup is working correctly:

```bash
# 1. Verify all dependencies are installed
npm run check-deps

# 2. Run linting to ensure code quality
npm run lint

# 3. Run TypeScript type checking
npm run type-check

# 4. Run the test suite
npm run test

# 5. Build the applications
npm run build

# 6. Check that all services start correctly
npm run dev:check
```

### Expected Validation Results

All validation commands should complete without errors:

- ✅ Dependencies properly installed and linked
- ✅ No linting errors
- ✅ No TypeScript compilation errors
- ✅ All tests pass
- ✅ Applications build successfully
- ✅ Development servers start without issues

### Common Setup Issues and Solutions

#### Issue: "npm install fails with permission errors"
**Solution:**
```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Or use nvm to avoid permission issues
```

#### Issue: "Node.js version too old"
**Solution:**
```bash
# Use nvm to install and use correct Node.js version
nvm install 18
nvm use 18
nvm alias default 18
```

#### Issue: "Docker daemon not running"
**Solution:**
```bash
# Start Docker daemon (Linux)
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and log back in for changes to take effect
```

#### Issue: "Port already in use"
**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use different ports by updating environment files
```

#### Issue: "Database connection failed"
**Solution:**
```bash
# Check if database container is running
docker ps | grep database

# Check database logs
docker logs dopamine-hero_database_1

# Restart database container
docker-compose restart database
```

#### Issue: "Environment variables not loaded"
**Solution:**
```bash
# Verify environment files exist
ls -la apps/web/.env.local
ls -la apps/api/.env

# Check environment file contents
cat apps/web/.env.local
cat apps/api/.env

# Ensure no syntax errors in environment files
```

### Getting Help Resources

If you encounter issues not covered above:

1. **Check the logs**: Look at terminal output for specific error messages
2. **Consult documentation**: Check `docs/` directory for additional guides
3. **Search issues**: Check GitHub issues for similar problems
4. **Ask for help**: Reach out to the development team

### Resetting the Environment

If you need to completely reset your development environment:

```bash
# Stop all Docker containers
docker-compose down

# Remove node_modules directories
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
npm install

# Restart services
npm run dev
```

---

## Quick Start Checklist

- [ ] Node.js 18.0.0+ installed (`node --version`)
- [ ] npm 9.0.0+ installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] Docker installed and running (`docker --version`)
- [ ] Repository cloned (`git clone ...`)
- [ ] Dependencies installed (`npm install`)
- [ ] Environment files configured (`cp .env.example .env.local`)
- [ ] Database and Redis running
- [ ] Development servers start without errors (`npm run dev`)
- [ ] All validation commands pass (`npm run lint && npm run test`)

If all items in this checklist are complete, your development environment is ready for use!