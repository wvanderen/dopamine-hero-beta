# Dopamine Hero Security Strategy

## Security Requirements

### Frontend Security
- **CSP Headers:** `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`
- **XSS Prevention:** React's built-in XSS protection + DOMPurify for user content
- **Secure Storage:** Sensitive data in httpOnly cookies, non-sensitive in localStorage

### Backend Security
- **Input Validation:** Comprehensive validation with Joi/Zod schemas
- **Rate Limiting:** Tiered rate limiting based on user tier and endpoint sensitivity
- **CORS Policy:** Restrictive CORS with specific allowed origins

### Authentication Security
- **Token Storage:** JWT with refresh tokens, stored in httpOnly cookies
- **Session Management:** Secure session handling with Redis
- **Password Policy:** Minimum 8 characters, complexity requirements

## Security Implementation

### Security Middleware

```typescript
// apps/api/src/middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Helmet for security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.dopaminehero.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting configuration
export const createRateLimit = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

// Different rate limits for different endpoints
export const rateLimits = {
  // Strict limits for auth endpoints
  auth: createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts'),

  // Moderate limits for API endpoints
  api: createRateLimit(15 * 60 * 1000, 100, 'Too many API requests'),

  // Strict limits for expensive operations
  expensive: createRateLimit(60 * 60 * 1000, 10, 'Too many expensive operations'),

  // Lenient limits for read operations
  read: createRateLimit(15 * 60 * 1000, 1000, 'Too many read requests'),
};

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Input validation middleware
export const validateInput = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map((detail: any) => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

// XSS prevention middleware
export const xssPrevention = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize user inputs
  if (req.body) {
    sanitizeObject(req.body);
  }

  if (req.query) {
    sanitizeObject(req.query);
  }

  next();
};

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Basic XSS prevention - in production, use DOMPurify
      obj[key] = obj[key]
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
```

### Authentication Security

```typescript
// apps/api/src/services/authService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserService } from './userService';
import { EmailService } from './emailService';

export class AuthService {
  private readonly saltRounds = 12;
  private readonly tokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  async register(userData: RegisterData): Promise<AuthResponse> {
    // Validate password strength
    this.validatePassword(userData.password);

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(userData.password, this.saltRounds);

    // Create user
    const user = await this.userService.create({
      ...userData,
      passwordHash
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.displayName);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user with password hash
    const user = await this.userService.findByEmailWithPassword(email);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new AuthenticationError('Account locked');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

      // Verify refresh token is still valid
      const storedToken = await this.redis.get(`refresh_token:${decoded.userId}`);
      if (storedToken !== refreshToken) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Get user
      const user = await this.userService.findById(decoded.userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Invalidate old refresh token
      await this.redis.del(`refresh_token:${decoded.userId}`);

      return tokens;
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Invalidate refresh token
    await this.redis.del(`refresh_token:${userId}`);

    // Add token to blacklist (short-term)
    await this.redis.setex(`blacklist:${refreshToken}`, 3600, 'true');
  }

  private async generateTokens(user: User): Promise<TokenResponse> {
    const payload = {
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    };

    // Generate access token (short-lived)
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.tokenExpiry,
      issuer: 'dopamine-hero',
      audience: 'dopamine-hero-users'
    });

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: this.refreshTokenExpiry }
    );

    // Store refresh token in Redis
    await this.redis.setex(`refresh_token:${user.id}`, 7 * 24 * 3600, refreshToken);

    return { accessToken, refreshToken };
  }

  private validatePassword(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new ValidationError(`Password must be at least ${minLength} characters`);
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      throw new ValidationError('Password must contain uppercase, lowercase, and numbers');
    }

    if (!hasSpecialChar) {
      throw new ValidationError('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new ValidationError('Password is too common');
    }
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
```

### Data Security

```typescript
// apps/api/src/services/dataSecurityService.ts
import crypto from 'crypto';

export class DataSecurityService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor() {
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  }

  // Encrypt sensitive data
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('dopamine-hero'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt sensitive data
  decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('dopamine-hero'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Hash passwords securely
  hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });
  }

  // Verify password hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, originalHash] = hash.split(':');
    return new Promise((resolve) => {
      crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
        if (err) resolve(false);
        resolve(derivedKey.toString('hex') === originalHash);
      });
    });
  }

  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Sanitize user input
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove potential JS
      .replace(/on\w+=/gi, '') // Remove potential event handlers
      .trim();
  }

  // Validate email addresses
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Rate limiting based on user
  async checkRateLimit(userId: string, endpoint: string, limit: number, window: number): Promise<boolean> {
    const key = `rate_limit:${userId}:${endpoint}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, window);
    }

    return current <= limit;
  }

  // Audit logging
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: event.type,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
      severity: event.severity
    };

    // Log to file/monitoring service
    console.log(JSON.stringify(logEntry));

    // Store in database for audit trail
    await this.securityAuditRepo.create(logEntry);
  }
}

interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'data_access' | 'permission_denied';
  userId?: string;
  ip: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

### API Security Controls

```typescript
// apps/api/src/middleware/apiSecurity.ts
import { Request, Response, NextFunction } from 'express';

export class APISecurity {
  // Input validation schemas
  private static schemas = {
    user: {
      create: {
        email: {
          type: 'string',
          format: 'email',
          required: true
        },
        password: {
          type: 'string',
          minLength: 8,
          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          required: true
        },
        displayName: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          required: true
        }
      },
      update: {
        displayName: {
          type: 'string',
          minLength: 1,
          maxLength: 100
        },
        preferences: {
          type: 'object',
          properties: {
            theme: { enum: ['light', 'dark', 'auto'] },
            focusTimerDuration: { type: 'number', minimum: 5, maximum: 180 }
          }
        }
      }
    },
    task: {
      create: {
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
          required: true
        },
        category: {
          type: 'string',
          enum: ['creative', 'analytical', 'physical', 'learning'],
          required: true
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          default: 'medium'
        }
      }
    }
  };

  // SQL injection prevention
  static preventSQLInjection(query: string, params: any[]): { query: string; params: any[] } {
    // Ensure parameters are properly escaped
    const escapedParams = params.map(param => {
      if (typeof param === 'string') {
        return param.replace(/'/g, "''");
      }
      return param;
    });

    return {
      query,
      params: escapedParams
    };
  }

  // CSRF protection
  static validateCSRFToken(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;

    if (req.method !== 'GET' && (!token || token !== sessionToken)) {
      return res.status(403).json({
        error: {
          code: 'CSRF_INVALID',
          message: 'Invalid CSRF token'
        }
      });
    }

    next();
  }

  // Request size limiting
  static validateRequestSize(req: Request, res: Response, next: NextFunction): void {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload too large'
        }
      });
    }

    next();
  }

  // File upload security
  static validateFileUpload(file: Express.Multer.File): boolean {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return false;
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return false;
    }

    // Check filename for suspicious patterns
    const suspiciousPatterns = [/\.exe$/, /\.php$/, /\.bat$/, /\.sh$/];
    if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
      return false;
    }

    return true;
  }

  // Content Security Policy
  static getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.dopaminehero.com wss://api.dopaminehero.com",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');
  }

  // Security headers
  static setSecurityHeaders(res: Response): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', this.getCSPHeader());
  }
}
```

### Infrastructure Security

```typescript
// infrastructure/security/terraform/security.tf
# Network security
resource "aws_security_group" "web_sg" {
  name        = "dopamine-hero-web-sg"
  description = "Security group for web servers"

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS traffic"
  }

  ingress {
    from_port = 80
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Redirect HTTP to HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks  = ["0.0.0.0/0"]
    description = "Outbound traffic"
  }
}

resource "aws_security_group" "db_sg" {
  name        = "dopamine-hero-db-sg"
  description = "Security group for database"

  ingress {
    from_port = 5432
    to_port   = 5432
    protocol  = "tcp"
    security_groups = [aws_security_group.web_sg.id]
    description = "Allow web servers to access database"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks  = ["0.0.0.0/0"]
    description = "Database outbound traffic"
  }
}

# IAM roles and policies
resource "aws_iam_role" "ecs_task_role" {
  name = "dopamine-hero-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        },
        Action = "sts:AssumeRole",
        Effect = "Allow"
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "dopamine-hero-ecs-task-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:*",
          "s3:*",
          "rds-db:*"
        ],
        Resource = [
          "*"
        ]
      }
    ]
  })
}

# KMS for encryption
resource "aws_kms_key" "main" {
  description             = "Dopamine Hero encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "Enable IAM User Permissions",
        Effect = "Allow",
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.account_id}:root"
        },
        Action   = "kms:*",
        Resource = "*"
      }
    ]
  })
}

# S3 bucket with security
resource "aws_s3_bucket" "uploads" {
  bucket = "dopamine-hero-uploads"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default = true
      sse_algorithm = "AES256"
    }
  }

  public_access_block {
    block_public_acls   = true
    block_public_policy = true
  }

  logging {
    target_bucket = "dopamine-hero-logs"
    target_prefix = "s3-access-logs/"
  }
}
```

### Security Monitoring

```typescript
// apps/api/src/services/securityMonitoring.ts
export class SecurityMonitoring {
  private readonly alertThresholds = {
    failedLogins: 5,
    suspiciousActivity: 10,
    dataAccessAnomalies: 100,
    highSeverityEvents: 1
  };

  private readonly eventCounts = new Map<string, number>();
  private readonly alertCooldowns = new Map<string, number>();

  async monitorSecurityEvent(event: SecurityEvent): Promise<void> {
    // Increment event count
    const eventKey = `${event.type}:${event.userId || 'anonymous'}`;
    this.eventCounts.set(eventKey, (this.eventCounts.get(eventKey) || 0) + 1);

    // Check cooldown
    const cooldownKey = `${event.type}:${event.userId || 'anonymous'}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
    const now = Date.now();

    if (now - lastAlert < 300000) { // 5 minute cooldown
      return; // Don't spam alerts
    }

    // Check thresholds
    await this.checkAlertThresholds(event, eventKey);

    // Update cooldown
    this.alertCooldowns.set(cooldownKey, now);
  }

  private async checkAlerts(event: SecurityEvent, count: number): Promise<void> {
    const alerts = [];

    // Failed login attempts
    if (event.type === 'failed_login' && count >= this.alertThresholds.failedLogins) {
      alerts.push({
        type: 'BRUTE_FORCE_DETECTED',
        severity: 'high',
        message: `Multiple failed login attempts detected for user ${event.userId}`,
        details: { attempts: count }
      });
    }

    // Suspicious activity
    if (event.type === 'suspicious_activity' && count >= this.alertThresholds.suspiciousActivity) {
      alerts.push({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'medium',
        message: `Suspicious activity detected for user ${event.userId}`,
        details: event.details
      });
    }

    // High severity events
    if (event.severity === 'critical') {
      alerts.push({
        type: 'CRITICAL_SECURITY_EVENT',
        severity: 'critical',
        message: `Critical security event: ${event.type}`,
        details: event.details
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  private async sendAlert(alert: SecurityAlert): Promise<void> {
    // Log to monitoring service
    console.error(`SECURITY ALERT: ${alert.type}`, alert);

    // Send to notification service
    if (alert.severity === 'critical' || alert.severity === 'high') {
      await this.notificationService.sendSecurityAlert(alert);
    }

    // Store in database for audit
    await this.securityAuditService.createAlert(alert);
  }

  async generateSecurityReport(): Promise<SecurityReport> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const report = {
      timestamp: now.toISOString(),
      period: '24 hours',
      events: {
        failedLogins: await this.getEventCount('failed_login', oneDayAgo, now),
        successfulLogins: await this.getEventCount('login', oneDayAgo, now),
        suspiciousActivity: await this.getEventCount('suspicious_activity', oneDayAgo, now),
        dataAccessEvents: await this.getEventCount('data_access', oneDayAgo, now),
        criticalEvents: await this.getEventCount('critical', oneDayAgo, now)
      },
      topIPAddresses: await this.getTopIPAddresses(oneDayAgo, now),
      topUsers: await this.getTopUsers(oneDayAgo, now),
      recommendations: await this.generateSecurityRecommendations()
    };

    return report;
  }

  private async generateSecurityRecommendations(): Promise<string[]> {
    const recommendations = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check for high failed login rates
    const failedLogins = await this.getEventCount('failed_login', oneDayAgo, now);
    const successfulLogins = await this.getEventCount('login', oneDayAgo, now);
    const loginSuccessRate = successfulLogins / (failedLogins + successfulLogins);

    if (loginSuccessRate < 0.9) {
      recommendations.push('Consider implementing additional authentication measures');
    }

    // Check for suspicious activity
    const suspiciousActivity = await this.getEventCount('suspicious_activity', oneDayAgo, now);
    if (suspiciousActivity > 50) {
      recommendations.push('Review user access patterns and implement additional monitoring');
    }

    return recommendations;
  }
}

interface SecurityAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
}

interface SecurityReport {
  timestamp: string;
  period: string;
  events: {
    failedLogins: number;
    successfulLogins: number;
    suspiciousActivity: number;
    dataAccessEvents: number;
    criticalEvents: number;
  };
  topIPAddresses: Array<{ ip: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
  recommendations: string[];
}
```

This comprehensive security strategy provides:

1. **Multi-Layer Protection**: Security headers, input validation, encryption, and access controls
2. **Authentication Security**: Strong password policies, secure token management, and session handling
3. **Data Protection**: Encryption at rest and in transit, secure data handling practices
4. **API Security**: Rate limiting, input validation, and secure coding practices
5. **Infrastructure Security**: Network security groups, IAM roles, and encrypted storage
6. **Security Monitoring**: Real-time threat detection, alerting, and reporting

The security architecture ensures Dopamine Hero protects user data, prevents common attacks, and maintains compliance with security best practices.