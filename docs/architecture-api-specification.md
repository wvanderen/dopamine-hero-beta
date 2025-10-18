# Dopamine Hero API Specification

Based on the chosen REST API style and validated data models, here's the comprehensive OpenAPI 3.0 specification for Dopamine Hero:

## OpenAPI 3.0 Specification

```yaml
openapi: 3.0.0
info:
  title: Dopamine Hero API
  version: 1.0.0
  description: RESTful API for Dopamine Hero productivity and gaming platform
  contact:
    name: Dopamine Hero Team
servers:
  - url: https://api.dopaminehero.com/v1
    description: Production server
  - url: https://staging-api.dopaminehero.com/v1
    description: Staging server
  - url: http://localhost:3001/v1
    description: Development server

security:
  - BearerAuth: []

paths:
  # Authentication endpoints
  /auth/register:
    post:
      tags: [Authentication]
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
                displayName: { type: string, minLength: 1 }
              required: [email, password, displayName]
      responses:
        201:
          description: User registered successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
                  token: { type: string }
        400: { $ref: '#/components/responses/BadRequest' }
        409: { $ref: '#/components/responses/Conflict' }

  /auth/login:
    post:
      tags: [Authentication]
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email: { type: string, format: email }
                password: { type: string }
              required: [email, password]
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
                  token: { type: string }
                  refreshToken: { type: string }
        401: { $ref: '#/components/responses/Unauthorized' }

  /auth/refresh:
    post:
      tags: [Authentication]
      summary: Refresh access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                refreshToken: { type: string }
              required: [refreshToken]
      responses:
        200:
          description: Token refreshed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: { type: string }
                  refreshToken: { type: string }
        401: { $ref: '#/components/responses/Unauthorized' }

  /auth/logout:
    post:
      tags: [Authentication]
      summary: User logout
      responses:
        200:
          description: Logout successful
        401: { $ref: '#/components/responses/Unauthorized' }

  # User management endpoints
  /users/profile:
    get:
      tags: [Users]
      summary: Get current user profile
      responses:
        200:
          description: User profile retrieved
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
        401: { $ref: '#/components/responses/Unauthorized' }

    put:
      tags: [Users]
      summary: Update user profile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                displayName: { type: string }
                preferences: { $ref: '#/components/schemas/UserPreferences' }
      responses:
        200:
          description: Profile updated successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
        400: { $ref: '#/components/responses/BadRequest' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /users/stats:
    get:
      tags: [Users]
      summary: Get user statistics
      responses:
        200:
          description: User statistics retrieved
          content:
            application/json:
              schema: { $ref: '#/components/schemas/UserStats' }
        401: { $ref: '#/components/responses/Unauthorized' }

  # Task management endpoints
  /tasks:
    get:
      tags: [Tasks]
      summary: Get user tasks
      parameters:
        - name: status
          in: query
          schema: { type: string, enum: [active, completed, archived] }
        - name: category
          in: query
          schema: { type: string, enum: [creative, analytical, physical, learning] }
        - name: limit
          in: query
          schema: { type: integer, default: 50 }
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
      responses:
        200:
          description: Tasks retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  tasks:
                    type: array
                    items: { $ref: '#/components/schemas/Task' }
                  pagination:
                    $ref: '#/components/schemas/Pagination' }
        401: { $ref: '#/components/responses/Unauthorized' }

    post:
      tags: [Tasks]
      summary: Create new task
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateTaskRequest' }
      responses:
        201:
          description: Task created successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Task' }
        400: { $ref: '#/components/responses/BadRequest' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /tasks/{taskId}:
    get:
      tags: [Tasks]
      summary: Get specific task
      parameters:
        - name: taskId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Task retrieved
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Task' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

    put:
      tags: [Tasks]
      summary: Update task
      parameters:
        - name: taskId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateTaskRequest' }
      responses:
        200:
          description: Task updated successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Task' }
        400: { $ref: '#/components/responses/BadRequest' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

    delete:
      tags: [Tasks]
      summary: Delete task
      parameters:
        - name: taskId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        204:
          description: Task deleted successfully
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /tasks/{taskId}/complete:
    post:
      tags: [Tasks]
      summary: Mark task as completed
      parameters:
        - name: taskId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                quality: { type: string, enum: [excellent, good, fair, poor] }
                notes: { type: string }
      responses:
        200:
          description: Task completed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  task: { $ref: '#/components/schemas/Task' }
                  energyEarned: { type: number }
                  stats: { $ref: '#/components/schemas/UserStats' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  # Focus session endpoints
  /focus-sessions:
    get:
      tags: [Focus Sessions]
      summary: Get user focus sessions
      parameters:
        - name: startDate
          in: query
          schema: { type: string, format: date }
        - name: endDate
          in: query
          schema: { type: string, format: date }
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
      responses:
        200:
          description: Focus sessions retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  sessions:
                    type: array
                    items: { $ref: '#/components/schemas/FocusSession' }
                  pagination:
                    $ref: '#/components/schemas/Pagination' }
        401: { $ref: '#/components/responses/Unauthorized' }

    post:
      tags: [Focus Sessions]
      summary: Start new focus session
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateFocusSessionRequest' }
      responses:
        201:
          description: Focus session started
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FocusSession' }
        400: { $ref: '#/components/responses/BadRequest' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /focus-sessions/{sessionId}/complete:
    post:
      tags: [Focus Sessions]
      summary: Complete focus session
      parameters:
        - name: sessionId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                actualDuration: { type: integer }
                quality: { type: string, enum: [excellent, good, fair, poor] }
                notes: { type: string }
              required: [actualDuration, quality]
      responses:
        200:
          description: Session completed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  session: { $ref: '#/components/schemas/FocusSession' }
                  energyGenerated: { type: number }
                  stats: { $ref: '#/components/schemas/UserStats' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /focus-sessions/{sessionId}/pause:
    post:
      tags: [Focus Sessions]
      summary: Pause focus session
      parameters:
        - name: sessionId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Session paused successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FocusSession' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /focus-sessions/{sessionId}/resume:
    post:
      tags: [Focus Sessions]
      summary: Resume focus session
      parameters:
        - name: sessionId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Session resumed successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FocusSession' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  # Module endpoints
  /modules:
    get:
      tags: [Modules]
      summary: Get available modules catalog
      parameters:
        - name: type
          in: query
          schema: { type: string, enum: [generator, multiplier, modifier, special] }
        - name: rarity
          in: query
          schema: { type: string, enum: [common, rare, epic, legendary] }
        - name: minCost
          in: query
          schema: { type: integer }
        - name: maxCost
          in: query
          schema: { type: integer }
      responses:
        200:
          description: Module catalog retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  modules:
                    type: array
                    items: { $ref: '#/components/schemas/Module' }
                  pagination:
                    $ref: '#/components/schemas/Pagination' }

  /modules/owned:
    get:
      tags: [Modules]
      summary: Get user's owned modules
      parameters:
        - name: type
          in: query
          schema: { type: string, enum: [generator, multiplier, modifier, special] }
        - name: isFavorite
          in: query
          schema: { type: boolean }
        - name: sortBy
          in: query
          schema: { type: string, enum: [acquiredAt, usageCount, level, name] }
      responses:
        200:
          description: Owned modules retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  modules:
                    type: array
                    items: { $ref: '#/components/schemas/OwnedModule' }
                  totalEnergy: { type: number }
        401: { $ref: '#/components/responses/Unauthorized' }

    post:
      tags: [Modules]
      summary: Purchase module
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                moduleId: { type: string, format: uuid }
              required: [moduleId]
      responses:
        201:
          description: Module purchased successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OwnedModule' }
        400: { $ref: '#/components/responses/BadRequest' }
        402: { description: Insufficient energy }
        401: { $ref: '#/components/responses/Unauthorized' }

  /modules/owned/{ownedModuleId}:
    put:
      tags: [Modules]
      summary: Update owned module
      parameters:
        - name: ownedModuleId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                customName: { type: string }
                isFavorite: { type: boolean }
                metadata: { type: object }
      responses:
        200:
          description: Module updated successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OwnedModule' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

    delete:
      tags: [Modules]
      summary: Delete owned module (refund energy)
      parameters:
        - name: ownedModuleId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Module deleted successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  refundedEnergy: { type: number }
                  newTotalEnergy: { type: number }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  # Preset endpoints
  /presets:
    get:
      tags: [Presets]
      summary: Get user presets
      parameters:
        - name: category
          in: query
          schema: { type: string, enum: [focus, creative, analytical, learning, custom] }
        - name: sortBy
          in: query
          schema: { type: string, enum: [usageCount, createdAt, effectiveness, name] }
        - name: limit
          in: query
          schema: { type: integer, default: 50 }
      responses:
        200:
          description: Presets retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  presets:
                    type: array
                    items: { $ref: '#/components/schemas/Preset' }
                  pagination:
                    $ref: '#/components/schemas/Pagination' }
        401: { $ref: '#/components/responses/Unauthorized' }

    post:
      tags: [Presets]
      summary: Create new preset
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreatePresetRequest' }
      responses:
        201:
          description: Preset created successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Preset' }
        400: { $ref: '#/components/responses/BadRequest' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /presets/{presetId}:
    get:
      tags: [Presets]
      summary: Get specific preset with assemblies
      parameters:
        - name: presetId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Preset retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  preset: { $ref: '#/components/schemas/Preset' }
                  assemblies:
                    type: array
                    items: { $ref: '#/components/schemas/PresetAssembly' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

    put:
      tags: [Presets]
      summary: Update preset
      parameters:
        - name: presetId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
                description: { type: string }
                category: { type: string, enum: [focus, creative, analytical, learning, custom] }
                assemblies: { type: array, items: { $ref: '#/components/schemas/AssemblyData' } }
      responses:
        200:
          description: Preset updated successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Preset' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

    delete:
      tags: [Presets]
      summary: Delete preset
      parameters:
        - name: presetId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        204: { description: Preset deleted successfully }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /presets/{presetId}/load:
    post:
      tags: [Presets]
      summary: Load preset configuration (activate preset)
      parameters:
        - name: presetId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Preset loaded successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  preset: { $ref: '#/components/schemas/Preset' }
                  assemblies:
                    type: array
                    items: { $ref: '#/components/schemas/PresetAssembly' }
                  activeEffects: { type: array, items: { $ref: '#/components/schemas/ActiveEffect' } }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /presets/{presetId}/duplicate:
    post:
      tags: [Presets]
      summary: Duplicate preset
      parameters:
        - name: presetId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
      responses:
        201:
          description: Preset duplicated successfully
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Preset' }
        404: { $ref: '#/components/responses/NotFound' }
        401: { $ref: '#/components/responses/Unauthorized' }

  # Analytics endpoints
  /analytics/productivity:
    get:
      tags: [Analytics]
      summary: Get productivity analytics
      parameters:
        - name: startDate
          in: query
          schema: { type: string, format: date }
        - name: endDate
          in: query
          schema: { type: string, format: date }
        - name: granularity
          in: query
          schema: { type: string, enum: [day, week, month] }
      responses:
        200:
          description: Productivity analytics retrieved
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ProductivityAnalytics' }
        401: { $ref: '#/components/responses/Unauthorized' }

  /analytics/progress:
    get:
      tags: [Analytics]
      summary: Get progress analytics
      responses:
        200:
          description: Progress analytics retrieved
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ProgressAnalytics' }
        401: { $ref: '#/components/responses/Unauthorized' }

  # Health check endpoint
  /health:
    get:
      tags: [Health]
      summary: Health check
      responses:
        200:
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string }
                  timestamp: { type: string, format: date-time }
                  version: { type: string }
                  uptime: { type: number }

components:
  schemas:
    User:
      type: object
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        displayName: { type: string }
        avatar: { type: string }
        energy: { type: integer }
        level: { type: integer }
        experience: { type: integer }
        subscriptionTier: { type: string, enum: [free, premium] }
        preferences: { $ref: '#/components/schemas/UserPreferences' }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    UserPreferences:
      type: object
      properties:
        theme: { type: string, enum: [light, dark, auto] }
        focusTimerDuration: { type: integer, minimum: 5, maximum: 180 }
        notifications:
          type: object
          properties:
            sessionComplete: { type: boolean }
            taskReminders: { type: boolean }
            achievements: { type: boolean }
        accessibility:
          type: object
          properties:
            reducedMotion: { type: boolean }
            highContrast: { type: boolean }
            fontSize: { type: string, enum: [small, medium, large] }

    Task:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        title: { type: string }
        description: { type: string }
        category: { type: string, enum: [creative, analytical, physical, learning] }
        status: { type: string, enum: [active, completed, archived] }
        priority: { type: string, enum: [low, medium, high] }
        dueDate: { type: string, format: date-time }
        estimatedDuration: { type: integer }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
        completedAt: { type: string, format: date-time }

    CreateTaskRequest:
      type: object
      properties:
        title: { type: string, minLength: 1 }
        description: { type: string }
        category: { type: string, enum: [creative, analytical, physical, learning] }
        priority: { type: string, enum: [low, medium, high] }
        dueDate: { type: string, format: date-time }
        estimatedDuration: { type: integer }
      required: [title, category]

    UpdateTaskRequest:
      type: object
      properties:
        title: { type: string }
        description: { type: string }
        category: { type: string, enum: [creative, analytical, physical, learning] }
        status: { type: string, enum: [active, completed, archived] }
        priority: { type: string, enum: [low, medium, high] }
        dueDate: { type: string, format: date-time }
        estimatedDuration: { type: integer }

    FocusSession:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        taskId: { type: string, format: uuid }
        duration: { type: integer }
        actualDuration: { type: integer }
        energyGenerated: { type: number }
        startedAt: { type: string, format: date-time }
        endedAt: { type: string, format: date-time }
        interruptions: { type: integer }
        quality: { type: string, enum: [excellent, good, fair, poor] }
        notes: { type: string }

    CreateFocusSessionRequest:
      type: object
      properties:
        taskId: { type: string, format: uuid }
        duration: { type: integer, minimum: 1, maximum: 180 }
      required: [duration]

    Module:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        description: { type: string }
        type: { type: string, enum: [generator, multiplier, modifier, special] }
        rarity: { type: string, enum: [common, rare, epic, legendary] }
        baseCost: { type: integer }
        effect: { $ref: '#/components/schemas/ModuleEffect' }
        requirements: { type: object }
        isActive: { type: boolean }
        createdAt: { type: string, format: date-time }

    ModuleEffect:
      type: object
      properties:
        type: { type: string, enum: [energy_bonus, time_bonus, focus_multiplier, streak_bonus] }
        value: { type: number }
        duration: { type: integer }
        targets: { type: array, items: { type: string } }
        conditions: { type: array, items: { type: object } }

    OwnedModule:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        moduleId: { type: string, format: uuid }
        acquiredAt: { type: string, format: date-time }
        usageCount: { type: integer }
        level: { type: integer }
        customName: { type: string }
        isFavorite: { type: boolean }
        metadata: { type: object }

    Preset:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        name: { type: string }
        description: { type: string }
        category: { type: string, enum: [focus, creative, analytical, learning, custom] }
        isPublic: { type: boolean }
        usageCount: { type: integer }
        effectiveness: { type: number }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    CreatePresetRequest:
      type: object
      properties:
        name: { type: string, minLength: 1 }
        description: { type: string }
        category: { type: string, enum: [focus, creative, analytical, learning, custom] }
        assemblies: { type: array, items: { $ref: '#/components/schemas/AssemblyData' } }
      required: [name, assemblies]

    AssemblyData:
      type: object
      properties:
        ownedModuleId: { type: string, format: uuid }
        position:
          type: object
          properties:
            x: { type: integer }
            y: { type: integer }
        configuration:
          type: object
          properties:
            enabled: { type: boolean }
            intensity: { type: number, minimum: 0, maximum: 100 }
            customSettings: { type: object }
        connections: { type: array, items: { type: string } }

    PresetAssembly:
      type: object
      properties:
        id: { type: string, format: uuid }
        presetId: { type: string, format: uuid }
        ownedModuleId: { type: string, format: uuid }
        position:
          type: object
          properties:
            x: { type: integer }
            y: { type: integer }
        configuration:
          type: object
          properties:
            enabled: { type: boolean }
            intensity: { type: number, minimum: 0, maximum: 100 }
            customSettings: { type: object }
        connections: { type: array, items: { type: string } }

    UserStats:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        totalFocusTime: { type: integer }
        totalTasksCompleted: { type: integer }
        totalEnergyGenerated: { type: number }
        currentStreak: { type: integer }
        longestStreak: { type: integer }
        modulesAcquired: { type: integer }
        presetsCreated: { type: integer }
        lastActiveDate: { type: string, format: date-time }
        achievements: { type: array, items: { type: object } }

    Pagination:
      type: object
      properties:
        page: { type: integer }
        limit: { type: integer }
        total: { type: integer }
        totalPages: { type: integer }
        hasNext: { type: boolean }
        hasPrev: { type: boolean }

    ActiveEffect:
      type: object
      properties:
        type: { type: string }
        value: { type: number }
        duration: { type: integer }
        sourceModule: { type: string }

    ProductivityAnalytics:
      type: object
      properties:
        focusTimeByCategory:
          type: object
          additionalProperties:
            type: number
        taskCompletionRate: { type: number }
        averageSessionLength: { type: number }
        energyGenerationRate: { type: number }
        streakData:
          type: array
          items:
            type: object
            properties:
              date: { type: string, format: date }
              streakLength: { type: integer }

    ProgressAnalytics:
      type: object
      properties:
        moduleAcquisitionRate: { type: number }
        presetUsageEffectiveness: { type: number }
        weeklyGrowth:
          type: array
          items:
            type: object
            properties:
              week: { type: string }
              energyGained: { type: number }
              tasksCompleted: { type: integer }

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code: { type: string }
                  message: { type: string }
                  details: { type: object }
                  timestamp: { type: string, format: date-time }
                  requestId: { type: string }

    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code: { type: string }
                  message: { type: string }
                  timestamp: { type: string, format: date-time }
                  requestId: { type: string }

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code: { type: string }
                  message: { type: string }
                  timestamp: { type: string, format: date-time }
                  requestId: { type: string }

    Conflict:
      description: Resource conflict
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code: { type: string }
                  message: { type: string }
                  timestamp: { type: string, format: date-time }
                  requestId: { type: string }
```

## API Usage Examples

### Authentication Flow
```bash
# Register new user
curl -X POST https://api.dopaminehero.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "displayName": "John Doe"
  }'

# Login
curl -X POST https://api.dopaminehero.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'

# Use token for authenticated requests
curl -X GET https://api.dopaminehero.com/v1/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Task Management
```bash
# Create task
curl -X POST https://api.dopaminehero.com/v1/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project documentation",
    "description": "Finish writing comprehensive architecture docs",
    "category": "analytical",
    "priority": "high",
    "estimatedDuration": 45
  }'

# Get active tasks
curl -X GET "https://api.dopaminehero.com/v1/tasks?status=active&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Complete task
curl -X POST https://api.dopaminehero.com/v1/tasks/TASK_ID/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quality": "good",
    "notes": "Completed with good focus"
  }'
```

### Focus Session Management
```bash
# Start focus session
curl -X POST https://api.dopaminehero.com/v1/focus-sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "TASK_ID",
    "duration": 25
  }'

# Complete focus session
curl -X POST https://api.dopaminehero.com/v1/focus-sessions/SESSION_ID/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actualDuration": 23,
    "quality": "excellent",
    "notes": "Very productive session"
  }'
```

This comprehensive API specification provides complete coverage of all Dopamine Hero functionality with proper error handling, authentication, and pagination support.