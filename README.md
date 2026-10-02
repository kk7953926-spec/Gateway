# FamPay X - Email Verification Gateway

Production-ready web application with an **Email Verification Gateway** featuring cryptographically secure 16-digit numeric verification codes.

## Features

- **16-Digit Verification Code Engine**: Cryptographically generated on backend via Node.js `crypto.randomBytes`. Exactly 16 digits (`0-9`). Plaintext code is **NEVER** stored in database — only SHA-256 hashes are persisted.
- **Nodemailer SMTP Integration**: Responsive HTML email templates with custom FamPay X branding, code expiration, and security warnings. Supports live SMTP delivery and simulated log mode.
- **Security & Rate Limiting**: Maximum 5 verification attempts per code before invalidation, 10-minute expiration window, and rate limiters per email & IP.
- **Developer Dashboard**: Live analytics for total users, verified/unverified users, code dispatch requests, success rates, failed attempts, and API hits.
- **Interactive API Test Console**: Send live REST requests directly to `/api/*` endpoints from inside the dashboard UI.
- **Administrator Panel**: User management directory, 16-digit verification audit trail, Nodemailer SMTP configurator, test email dispatcher, and security event logs.
- **API Documentation**: Detailed endpoint documentation for registration, 16-digit code verification, code resend, profile, and admin routes.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React Icons
- **Backend**: Node.js, Express, TypeScript, Nodemailer, Bcrypt.js, JWT
- **Database**: Firestore (Persistent Cloud DB) with in-memory fallback cache
- **Security**: Argon2/Bcrypt password hashing, SHA-256 verification code hashing, rate-limiters, helmet headers, CORS

## Project Structure

```
/
├── .env.example                 # Environment variables configuration guide
├── server.ts                    # Express + Vite unified server entry point
├── database/
│   └── db.ts                    # Firestore database service & in-memory cache
├── utils/
│   └── cryptoUtils.ts           # 16-Digit cryptographic generator & SHA-256 hashing
├── services/
│   ├── emailService.ts          # Nodemailer SMTP HTML email renderer
│   └── verificationService.ts   # Code generation, hashing, and verification engine
├── middleware/
│   ├── rateLimiter.ts           # IP & Email anti-spam rate limiter
│   └── authMiddleware.ts        # JWT authentication & admin authorization
├── controllers/
│   ├── authController.ts        # Registration, verification, login endpoints
│   └── adminController.ts       # Analytics, user management, SMTP settings endpoints
├── routes/
│   ├── authRoutes.ts            # Auth & verification REST routes
│   ├── userRoutes.ts            # User profile routes
│   └── adminRoutes.ts           # Administrative routes
└── src/
    ├── App.tsx                  # Main application container
    ├── components/
    │   ├── CodeInput16Digit.tsx # 16-digit input component (4 groups of 4 digits)
    │   └── Navbar.tsx           # Navigation bar with role badges
    ├── pages/
    │   ├── RegisterPage.tsx     # Registration form
    │   ├── VerifyEmailPage.tsx  # 16-digit code verification screen with timer
    │   ├── LoginPage.tsx        # Gateway login form
    │   ├── DashboardPage.tsx    # Developer dashboard & test console
    │   ├── AdminPage.tsx        # Admin panel & SMTP configuration
    │   └── DevDocsPage.tsx      # API documentation
    └── context/
        └── AuthContext.tsx      # Application state management
```

## API Endpoints

### Authentication & Verification

- `POST /api/auth/register` - Registers a user and sends a 16-digit verification code.
- `POST /api/auth/verify-email` - Validates the 16-digit verification code.
- `POST /api/auth/send-verification` - Dispatches a new verification code.
- `POST /api/auth/resend-verification` - Resends verification code with rate-limiting.
- `POST /api/auth/login` - Authenticates user credentials.
- `GET /api/user/profile` - Retrieves authenticated user details.

### Admin Panel Endpoints

- `GET /api/admin/stats` - System telemetry and verification metrics.
- `GET /api/admin/users` - Registered user directory.
- `GET /api/admin/verifications` - 16-digit verification code logs.
- `GET /api/admin/logs` - Security event audit trail.
- `POST /api/admin/settings` - Updates SMTP credentials & rate limits.
- `POST /api/admin/test-email` - Dispatches test 16-digit verification email.

## Local Development Commands

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and adjust configuration as needed.

3. **Start development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Production Deployment Instructions

1. **Build client bundle**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm run start
   ```

## Demo Credentials

- **Default Admin Email**: `admin@fampayx.com`
- **Default Admin Password**: `FamPayX#Admin2026!`
