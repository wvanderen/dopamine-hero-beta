# Dopamine Hero API Specification

## REST API Specification

Based on the REST API choice from the tech stack, here is the complete OpenAPI 3.0 specification that covers all endpoints required by the PRD epics. This specification ensures consistency across frontend-backend communication and provides the foundation for AI agent development.

```yaml
openapi: 3.0.0
info:
  title: Dopamine Hero API
  version: 1.0.0
  description: RESTful API for Dopamine Hero productivity-gaming hybrid with dual-currency economic system
servers:
  - url: https://api.dopamine-hero.com/v1
    description: Production server
  - url: https://staging-api.dopamine-hero.com/v1
    description: Staging server
  - url: http://localhost:3001/v1
    description: Development server

paths:
  # Authentication endpoints
  /auth:
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
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
              required: [email, password]
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  tokens:
                    $ref: '#/components/schemas/AuthTokens'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /auth/register:
    post:
      tags: [Authentication]
      summary: User registration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                displayName:
                  type: string
                  minLength: 2
                  maxLength: 50
              required: [email, password, displayName]
      responses:
        '201':
          description: Registration successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  tokens:
                    $ref: '#/components/schemas/AuthTokens'
        '409':
          $ref: '#/components/responses/Conflict'

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
                refreshToken:
                  type: string
              required: [refreshToken]
      responses:
        '200':
          description: Token refreshed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthTokens'

  # User management endpoints
  /users/profile:
    get:
      tags: [Users]
      summary: Get current user profile
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User profile retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '401':
          $ref: '#/components/responses/Unauthorized'

    put:
      tags: [Users]
      summary: Update user profile
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                displayName:
                  type: string
                  minLength: 2
                  maxLength: 50
                avatar:
                  type: string
                  format: uri
                preferences:
                  $ref: '#/components/schemas/UserPreferences'
      responses:
        '200':
          description: Profile updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

  # Task management endpoints
  /tasks:
    get:
      tags: [Tasks]
      summary: Get user's tasks
      security:
        - bearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, in_progress, completed, cancelled]
        - name: category
          in: query
          schema:
            type: string
            enum: [creative, analytical, physical, learning]
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Tasks retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  tasks:
                    type: array
                    items:
                      $ref: '#/components/schemas/Task'
                  total:
                    type: integer
                  hasMore:
                    type: boolean

    post:
      tags: [Tasks]
      summary: Create new task
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskRequest'
      responses:
        '201':
          description: Task created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'

  /tasks/{taskId}:
    get:
      tags: [Tasks]
      summary: Get specific task
      security:
        - bearerAuth: []
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Task retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      tags: [Tasks]
      summary: Update task
      security:
        - bearerAuth: []
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTaskRequest'
      responses:
        '200':
          description: Task updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'

    delete:
      tags: [Tasks]
      summary: Delete task
      security:
        - bearerAuth: []
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: Task deleted successfully

  /tasks/{taskId}/complete:
    post:
      tags: [Tasks]
      summary: Mark task as complete
      security:
        - bearerAuth: []
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Task completed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  task:
                    $ref: '#/components/schemas/Task'
                  energyEarned:
                    type: number
                  dopamineBonus:
                    type: number

  # Focus session endpoints
  /focus-sessions:
    get:
      tags: [Focus Sessions]
      summary: Get user's focus sessions
      security:
        - bearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [planned, active, completed, abandoned, paused]
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Focus sessions retrieved successfully

    post:
      tags: [Focus Sessions]
      summary: Create new focus session
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateFocusSessionRequest'
      responses:
        '201':
          description: Focus session created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FocusSession'

  /focus-sessions/{sessionId}/start:
    post:
      tags: [Focus Sessions]
      summary: Start focus session
      security:
        - bearerAuth: []
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Session started successfully

  /focus-sessions/{sessionId}/complete:
    post:
      tags: [Focus Sessions]
      summary: Complete focus session
      security:
        - bearerAuth: []
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                actualDuration:
                  type: number
                  minimum: 1
      responses:
        '200':
          description: Session completed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  session:
                    $ref: '#/components/schemas/FocusSession'
                  energyEarned:
                    type: number
                  dopamineEarned:
                    type: number

  # Module endpoints
  /modules:
    get:
      tags: [Modules]
      summary: Get available modules
      security:
        - bearerAuth: []
      parameters:
        - name: type
          in: query
          schema:
            type: string
            enum: [generator, multiplier, special, synergy]
        - name: rarity
          in: query
          schema:
            type: string
            enum: [common, uncommon, rare, legendary]
      responses:
        '200':
          description: Modules retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  modules:
                    type: array
                    items:
                      $ref: '#/components/schemas/Module'
                  userModules:
                    type: array
                    items:
                      $ref: '#/components/schemas/UserModule'

  /modules/{moduleId}/purchase:
    post:
      tags: [Modules]
      summary: Purchase module with energy
      security:
        - bearerAuth: []
      parameters:
        - name: moduleId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Module purchased successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  userModule:
                    $ref: '#/components/schemas/UserModule'
                  remainingEnergy:
                    type: number

  # Module preset endpoints
  /module-presets:
    get:
      tags: [Module Presets]
      summary: Get user's module presets
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Presets retrieved successfully
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ModulePreset'

    post:
      tags: [Module Presets]
      summary: Create new module preset
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateModulePresetRequest'
      responses:
        '201':
          description: Preset created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ModulePreset'

  /module-presets/{presetId}:
    get:
      tags: [Module Presets]
      summary: Get specific module preset
      security:
        - bearerAuth: []
      parameters:
        - name: presetId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Preset retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ModulePreset'

  # User statistics endpoints
  /users/stats:
    get:
      tags: [Users]
      summary: Get user statistics and analytics
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Statistics retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserStats'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        displayName:
          type: string
        avatar:
          type: string
          format: uri
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        preferences:
          $ref: '#/components/schemas/UserPreferences'

    UserPreferences:
      type: object
      properties:
        focusSessionDuration:
          type: integer
          minimum: 5
          maximum: 120
          default: 25
        theme:
          type: string
          enum: [light, dark, auto]
          default: auto
        notifications:
          type: object
          properties:
            sessionComplete:
              type: boolean
              default: true
            achievements:
              type: boolean
              default: true
        accessibility:
          type: object
          properties:
            reducedMotion:
              type: boolean
              default: false
            highContrast:
              type: boolean
              default: false

    AuthTokens:
      type: object
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        expiresIn:
          type: integer
        tokenType:
          type: string
          enum: [Bearer]

    Task:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        title:
          type: string
          minLength: 1
          maxLength: 200
        description:
          type: string
          maxLength: 1000
        category:
          type: string
          enum: [creative, analytical, physical, learning]
        status:
          type: string
          enum: [pending, in_progress, completed, cancelled]
        priority:
          type: string
          enum: [low, medium, high]
        dueDate:
          type: string
          format: date-time
        estimatedDuration:
          type: integer
          minimum: 1
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time

    CreateTaskRequest:
      type: object
      required: [title, category]
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 200
        description:
          type: string
          maxLength: 1000
        category:
          type: string
          enum: [creative, analytical, physical, learning]
        priority:
          type: string
          enum: [low, medium, high]
          default: medium
        dueDate:
          type: string
          format: date-time
        estimatedDuration:
          type: integer
          minimum: 1

    UpdateTaskRequest:
      type: object
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 200
        description:
          type: string
          maxLength: 1000
        category:
          type: string
          enum: [creative, analytical, physical, learning]
        status:
          type: string
          enum: [pending, in_progress, completed, cancelled]
        priority:
          type: string
          enum: [low, medium, high]
        dueDate:
          type: string
          format: date-time
        estimatedDuration:
          type: integer
          minimum: 1

    FocusSession:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        taskId:
          type: string
          format: uuid
          nullable: true
        startTime:
          type: string
          format: date-time
        endTime:
          type: string
          format: date-time
          nullable: true
        plannedDuration:
          type: integer
          minimum: 1
        actualDuration:
          type: integer
          minimum: 1
          nullable: true
        status:
          type: string
          enum: [planned, active, completed, abandoned, paused]
        energyGenerated:
          type: number
          minimum: 0
          nullable: true
        dopamineGenerated:
          type: number
          minimum: 0
          nullable: true
        moduleConfigurationId:
          type: string
          format: uuid
          nullable: true
        interruptionCount:
          type: integer
          minimum: 0
          default: 0
        createdAt:
          type: string
          format: date-time

    CreateFocusSessionRequest:
      type: object
      required: [plannedDuration]
      properties:
        taskId:
          type: string
          format: uuid
        plannedDuration:
          type: integer
          minimum: 1
          maximum: 120
        moduleConfigurationId:
          type: string
          format: uuid

    Module:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        type:
          type: string
          enum: [generator, multiplier, special, synergy]
        rarity:
          type: string
          enum: [common, uncommon, rare, legendary]
        baseEnergyCost:
          type: number
          minimum: 0
        baseDopamineGeneration:
          type: number
          minimum: 0
        effects:
          type: array
          items:
            $ref: '#/components/schemas/ModuleEffect'
        requirements:
          type: array
          items:
            $ref: '#/components/schemas/ModuleRequirement'
        isActive:
          type: boolean
        createdAt:
          type: string
          format: date-time

    ModuleEffect:
      type: object
      required: [type, value]
      properties:
        type:
          type: string
          enum: [energy_multiplier, dopamine_generator, synergy_bonus, special_ability]
        value:
          type: number
        condition:
          type: string

    ModuleRequirement:
      type: object
      required: [type, value]
      properties:
        type:
          type: string
          enum: [level, module, achievement]
        value:
          type: string | number

    UserModule:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        moduleId:
          type: string
          format: uuid
        acquiredAt:
          type: string
          format: date-time
        upgradeLevel:
          type: integer
          minimum: 1
          default: 1
        dopamineEnhancements:
          type: number
          minimum: 0
          default: 0
        isActive:
          type: boolean
          default: true
        metadata:
          type: object
          additionalProperties: true

    ModulePreset:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: string
          maxLength: 500
        category:
          type: string
          enum: [work, study, creative, learning, custom]
        configuration:
          type: array
          items:
            $ref: '#/components/schemas/ModuleConfiguration'
        totalEnergyCost:
          type: number
          minimum: 0
        dopamineGenerationRate:
          type: number
          minimum: 0
        energyEfficiency:
          type: number
          minimum: 0
        usageCount:
          type: integer
          minimum: 0
        totalSessionTime:
          type: integer
          minimum: 0
        averageDopaminePerSession:
          type: number
          minimum: 0
        isActive:
          type: boolean
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    ModuleConfiguration:
      type: object
      required: [userModuleId, position]
      properties:
        userModuleId:
          type: string
          format: uuid
        position:
          type: object
          properties:
            x:
              type: integer
            y:
              type: integer
        connections:
          type: array
          items:
            type: string
            format: uuid
        isActive:
          type: boolean
          default: true

    CreateModulePresetRequest:
      type: object
      required: [name, configuration]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: string
          maxLength: 500
        category:
          type: string
          enum: [work, study, creative, learning, custom]
          default: custom
        configuration:
          type: array
          items:
            $ref: '#/components/schemas/ModuleConfiguration'

    UserStats:
      type: object
      properties:
        totalFocusTime:
          type: integer
          description: Total focus time in minutes
        totalTasksCompleted:
          type: integer
        currentEnergy:
          type: number
        totalEnergyEarned:
          type: number
        currentDopamine:
          type: number
        totalDopamineEarned:
          type: number
        modulesOwned:
          type: integer
        presetsCreated:
          type: integer
        streakDays:
          type: integer
        achievements:
          type: array
          items:
            type: string
        productivityByCategory:
          type: object
          additionalProperties:
            type: integer
        weeklyProgress:
          type: array
          items:
            type: object
            properties:
              date:
                type: string
                format: date
              focusTime:
                type: integer
              tasksCompleted:
                type: integer
              energyEarned:
                type: number

  responses:
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
                  code:
                    type: string
                  message:
                    type: string
                  timestamp:
                    type: string
                    format: date-time
                  requestId:
                    type: string

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
                  code:
                    type: string
                  message:
                    type: string
                  timestamp:
                    type: string
                    format: date-time
                  requestId:
                    type: string

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
                  code:
                    type: string
                  message:
                    type: string
                  timestamp:
                    type: string
                    format: date-time
                  requestId:
                    type: string

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## API Design Rationale

The REST API follows OpenAPI 3.0 standards with comprehensive error handling and consistent response formats. Key design decisions:

1. **Resource-Driven URLs:** Clear resource hierarchy (`/tasks/{taskId}/complete`) for intuitive API usage
2. **Comprehensive Error Handling:** Standardized error responses with request IDs for debugging
3. **Dual-Currency Support:** Dedicated endpoints for energy and dopamine calculations in session completion
4. **Real-Time Ready:** WebSocket endpoints planned for live focus session updates
5. **Performance Optimized:** Pagination, filtering, and field selection for ADHD performance requirements
6. **Security First:** JWT authentication with refresh tokens and secure token storage