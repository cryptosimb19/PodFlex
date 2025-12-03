# FlexPod - Product Requirements Document (PRD)

## Product Overview

| **Attribute** | **Details** |
|--------------|-------------|
| **Product Name** | FlexPod |
| **Version** | 1.1 |
| **Document Date** | December 3, 2025 |
| **Product Type** | Mobile-First Progressive Web Application (PWA) |
| **Target Market** | Bay Club gym membership sharing |
| **Primary Users** | Pod Seekers & Pod Leaders |

## Executive Summary

FlexPod is a comprehensive gym membership pod sharing platform that transforms how people access premium fitness facilities. Built specifically for Bay Club members, the platform replaces ad-hoc WhatsApp coordination with a secure, streamlined experience for discovering and joining membership "pods" - shared memberships that make high-end fitness accessible and affordable.

## Problem & Solution

| **Problem** | **Solution** |
|-------------|--------------|
| Bay Club memberships cost $227-$445/month | Shared "pod" memberships reduce individual costs to $165-$285/month |
| Scattered coordination via WhatsApp groups | Centralized platform with structured workflows |
| Unclear pricing and trust mechanisms | Transparent pricing with verified pod leader profiles |
| Manual payment coordination | Automated join request and approval system |
| Limited pod discovery | Searchable database of 10+ Bay Club locations |

## Target Users

| **User Type** | **Needs** | **Features** |
|--------------|-----------|--------------|
| **Pod Seekers** | Affordable access to premium fitness | Pod discovery, join requests, membership tracking |
| **Pod Leaders** | Fill membership spots, reduce costs | Pod creation, member management, request approval |
| **Fitness Enthusiasts** | Tennis, multi-club access, family amenities | Region filtering, amenity search, detailed pod info |

---

## Feature Implementation Status

### 1. Authentication & Security

| **Feature** | **Status** | **Implementation Details** |
|------------|------------|---------------------------|
| Email/Password Auth | ✅ Implemented | Bcrypt password hashing, secure session management |
| Email Verification | ✅ Implemented | Required before first login, 24-hour token expiry, resend capability |
| Two-Factor Authentication (2FA) | ✅ Implemented | Email-based 6-digit code, 10-minute expiration, rate-limited |
| Google OAuth | ✅ Implemented | Social login with Passport.js |
| Apple OAuth | ✅ Implemented | Sign in with Apple authentication |
| Phone Number Auth (SMS OTP) | ✅ Implemented | Twilio SMS verification, E.164 format validation |
| Session Management | ✅ Implemented | PostgreSQL-backed sessions with connect-pg-simple |
| Password Reset | ✅ Implemented | Email-based token system, 1-hour expiration |
| Protected Routes | ✅ Implemented | Authentication middleware on all sensitive endpoints |
| Role-Based Access | ✅ Implemented | Pod Leader vs Pod Seeker permissions |
| Rate Limiting | ✅ Implemented | OTP: 3 requests/15min, Verify: 5 attempts/15min, 2FA: 3 resends/15min |

### 2. User Management

| **Feature** | **Status** | **Implementation Details** |
|------------|------------|---------------------------|
| Multi-step Registration | ✅ Implemented | Progress tracking, role selection (Seeker/Leader) |
| User Profiles | ✅ Implemented | Name, email, phone, address, Bay Club membership details |
| Onboarding Flow | ✅ Implemented | Completion tracking with conditional redirects |
| Profile Editing | ✅ Implemented | Real-time updates with database persistence |
| Bay Club Integration | ✅ Implemented | 10 authentic campuses, membership tiers, pricing |
| Data Persistence | ✅ Implemented | Full PostgreSQL storage (replaced localStorage) |

### 3. Email Notification System

| **Notification Type** | **Status** | **Trigger** | **Template** |
|---------------------|------------|------------|--------------|
| Email Verification | ✅ Implemented | New user registration | Branded HTML with verification link, 24-hour expiry |
| 2FA Verification Code | ✅ Implemented | Email/password login | 6-digit code email, 10-minute expiry |
| Welcome Email | ✅ Implemented | New user signup (all auth methods) | Branded welcome message with getting started info |
| Join Request to Leader | ✅ Implemented | New join request submitted | Branded HTML with requester details, pod info |
| Request Accepted | ✅ Implemented | Leader approves request | Congratulations email with next steps |
| Request Rejected | ✅ Implemented | Leader rejects request | Polite decline with encouragement to explore other pods |
| Member Removed | ✅ Implemented | Leader removes member from pod | Notification with pod details and support info |
| Password Reset | ✅ Implemented | User requests password reset | Secure token link, 1-hour expiration notice |
| Pod Created | ✅ Implemented | Leader creates a new pod | Confirmation with pod management instructions |

**Email Service:** SendGrid with verified sender (podmembership.com)

### 4. Pod Discovery & Search

| **Feature** | **Status** | **Implementation Details** |
|------------|------------|---------------------------|
| Pod Listings | ✅ Implemented | Cards with location, pricing, capacity, amenities, images |
| Regional Filtering | ✅ Implemented | 10 Bay Club campuses (San Jose, SF, East Bay, LA, etc.) |
| Membership Type Filter | ✅ Implemented | Executive Club tiers, Single Site, Campus memberships |
| Availability Tracking | ✅ Implemented | Real-time spot counts from database |
| Search Functionality | ✅ Implemented | Instant results with keyword search |
| Amenity Display | ✅ Implemented | Tennis, pickleball, pool, spa, gym, childcare, etc. |

### 5. Join Request Management

| **Feature** | **Status** | **Implementation Details** |
|------------|------------|---------------------------|
| Submit Join Request | ✅ Implemented | One-click with pre-populated user data |
| Request Status Tracking | ✅ Implemented | Pending, Accepted, Rejected with visual indicators |
| Leader Approval Workflow | ✅ Implemented | One-click approve/reject with email notifications |
| Request History | ✅ Implemented | View all requests (users) or received requests (leaders) |
| Email Integration | ✅ Implemented | Automated notifications on all status changes |
| Applicant Details | ✅ Implemented | Full contact info and membership details for leaders |

### 6. Pod Management System

| **Feature** | **Status** | **Implementation Details** |
|------------|------------|---------------------------|
| Create Pod | ✅ Implemented | Comprehensive setup: club, location, pricing, amenities (max 8 members) |
| Edit Pod | ✅ Implemented | Update 10+ fields including images, pricing, amenities |
| Delete Pod | ✅ Implemented | Leader-only, confirmation dialog, transactional cascade cleanup |
| View Pod Details | ✅ Implemented | Full pod page with leader contact info (name, email, phone) |
| Member Tracking | ✅ Implemented | Current members, capacity, availability |
| Remove Members | ✅ Implemented | Soft-delete with audit trail, email notification to removed member |
| One Pod Per Leader | ✅ Implemented | Business rule enforced on backend |
| Authorization | ✅ Implemented | 403 error if not leader, 404 if pod not found |

### 7. Dashboard Features

#### Pod Leader Dashboard

| **Tab** | **Features** | **Status** |
|---------|--------------|------------|
| **Join Requests** | View pending requests, approve/reject, see applicant details | ✅ Implemented |
| **Pod Members** | View all members by pod, contact info, join dates, member profiles | ✅ Implemented |
| **My Pods** | List of created pods, analytics, edit/delete actions | ✅ Implemented |

**Analytics Cards:**
- Active Pods Count
- Total Members Across All Pods
- Pending Requests
- Monthly Revenue

#### User Dashboard

| **Feature** | **Status** | **Implementation Details** |
|------------|------------|---------------------------|
| Profile Overview | ✅ Implemented | Personal info, membership details |
| Join Request History | ✅ Implemented | All submitted requests with status |
| Active Memberships | ✅ Implemented | Pods user has joined |
| Quick Actions | ✅ Implemented | Browse pods, manage requests |

---

## Technical Architecture

### Technology Stack

| **Layer** | **Technology** | **Purpose** |
|-----------|---------------|-------------|
| **Frontend** | React 18 + TypeScript | Type-safe UI development |
| **Build Tool** | Vite | Fast development and production builds |
| **Routing** | Wouter | Lightweight client-side routing |
| **State Management** | TanStack Query | Server state management and caching |
| **UI Components** | Radix UI + shadcn/ui | Accessible component library |
| **Styling** | Tailwind CSS | Utility-first styling with custom branding |
| **Backend** | Node.js + Express | RESTful API server |
| **Database** | PostgreSQL (Neon) | Serverless production database |
| **ORM** | Drizzle | Type-safe database operations |
| **Authentication** | Passport.js | Multi-strategy auth (local, OAuth) |
| **Session Store** | connect-pg-simple | PostgreSQL session persistence |
| **Email Service** | SendGrid | Transactional email delivery |
| **Validation** | Zod | Runtime type validation |

### Database Schema

| **Table** | **Purpose** | **Key Fields** |
|-----------|-------------|----------------|
| `users` | User accounts and profiles | id, email, passwordHash, firstName, lastName, userType, bayClubCampus, membershipTier |
| `pods` | Gym membership pods | id, leadId, clubName, clubRegion, costPerPerson, totalSpots, availableSpots, amenities |
| `pod_members` | User-pod relationships | id, podId, userId, joinedAt, status |
| `join_requests` | Membership requests | id, podId, userId, status, emailSent, requestedAt |
| `sessions` | User sessions | sid, sess, expire |

### API Endpoints

#### Authentication Endpoints

| **Method** | **Endpoint** | **Auth Required** | **Description** |
|-----------|-------------|-------------------|-----------------|
| POST | `/api/auth/register` | No | Create new user account (sends verification email) |
| POST | `/api/auth/login` | No | Email/password login (triggers 2FA if enabled) |
| GET | `/api/auth/verify-email` | No | Verify email with token |
| POST | `/api/auth/resend-verification` | No | Resend verification email (rate-limited) |
| POST | `/api/auth/verify-2fa` | No | Verify 2FA code |
| POST | `/api/auth/resend-2fa` | No | Resend 2FA code (rate-limited) |
| GET | `/api/auth/google` | No | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | No | OAuth callback handler |
| GET | `/api/auth/apple` | No | Initiate Apple OAuth |
| GET | `/api/auth/apple/callback` | No | Apple OAuth callback handler |
| POST | `/api/auth/phone/send-otp` | No | Send SMS OTP to phone number |
| POST | `/api/auth/phone/verify-otp` | No | Verify phone OTP and login |
| POST | `/api/auth/logout` | Yes | End user session |
| GET | `/api/auth/user` | Yes | Get current user profile |
| POST | `/api/auth/forgot-password` | No | Request password reset email |
| POST | `/api/auth/reset-password` | No | Reset password with token |

#### User Endpoints

| **Method** | **Endpoint** | **Auth Required** | **Description** |
|-----------|-------------|-------------------|-----------------|
| GET | `/api/users/:id` | Yes | Get user profile by ID |
| PATCH | `/api/users/:id` | Yes (self) | Update user profile |
| PATCH | `/api/users/:id/onboarding` | Yes (self) | Mark onboarding complete |

#### Pod Endpoints

| **Method** | **Endpoint** | **Auth Required** | **Description** |
|-----------|-------------|-------------------|-----------------|
| GET | `/api/pods` | No | List all pods |
| GET | `/api/pods/:id` | No | Get pod details |
| POST | `/api/pods` | Yes (leader) | Create new pod |
| PATCH | `/api/pods/:id` | Yes (leader, owner) | Update pod details |
| DELETE | `/api/pods/:id` | Yes (leader, owner) | Delete pod with cascade cleanup |
| GET | `/api/pods/search/:query` | No | Search pods by keyword |
| POST | `/api/pods/filter` | No | Filter pods by criteria |

#### Join Request Endpoints

| **Method** | **Endpoint** | **Auth Required** | **Description** |
|-----------|-------------|-------------------|-----------------|
| GET | `/api/join-requests/user/:userId` | Yes (self) | Get user's join requests |
| GET | `/api/join-requests/leader/:leaderId` | Yes (self) | Get leader's received requests |
| POST | `/api/join-requests` | Yes | Submit join request |
| PATCH | `/api/join-requests/:id` | Yes (leader) | Update request status (triggers email) |

#### Pod Member Endpoints

| **Method** | **Endpoint** | **Auth Required** | **Description** |
|-----------|-------------|-------------------|-----------------|
| GET | `/api/pod-members/pod/:podId` | No | Get all members of a pod |
| GET | `/api/pod-members/user/:userId` | Yes | Get user's pod memberships |

---

## Bay Club Integration Data

### Authentic Locations

| **Region** | **Club Name** | **City** | **Membership Types Available** |
|-----------|--------------|----------|-------------------------------|
| San Jose | Bay Club Courtside | San Jose, CA | Executive Club South Bay, Campus |
| San Jose | Bay Club Almaden | San Jose, CA | Executive Club South Bay, Single Site |
| Santa Clara | Bay Club Santa Clara | Santa Clara, CA | Santa Clara Campus, Executive Club South Bay |
| San Francisco | Bay Club SF Tennis | San Francisco, CA | Executive Club North Bay, Single Site |
| San Francisco | Bay Club Downtown SF | San Francisco, CA | Executive Club North Bay, Club West Gold |
| East Bay | Bay Club Marin | Corte Madera, CA | Executive Club East Bay, Single Site |
| East Bay | Bay Club Pleasanton | Pleasanton, CA | Executive Club East Bay, Campus |
| Los Angeles | Bay Club Redondo Beach | Redondo Beach, CA | Executive Club LA, Single Site |
| Los Angeles | Bay Club Manhattan Beach | Manhattan Beach, CA | Executive Club Southern CA |
| Seattle | Bay Club Seattle | Seattle, WA | Single Site, Club West Gold |

### Membership Tiers & Pricing

| **Membership Type** | **Monthly Cost Range** | **Access Level** |
|-------------------|----------------------|------------------|
| Executive Club South Bay | $220-$285/person | All South Bay locations + reciprocal access |
| Executive Club North Bay | $210-$275/person | All North Bay locations + reciprocal access |
| Executive Club East Bay | $200-$265/person | All East Bay locations + reciprocal access |
| Executive Club LA | $230-$295/person | All LA locations + reciprocal access |
| Executive Club Southern CA | $225-$285/person | All Southern CA locations |
| Club West Gold | $195-$250/person | Multi-club access (limited) |
| Single Site | $165-$220/person | Single location access only |
| Campus (specific) | $180-$240/person | Campus-wide access |
| Santa Clara Campus | $185-$235/person | Santa Clara campus locations |

### Amenities Available

| **Amenity** | **Common At** | **Description** |
|------------|--------------|-----------------|
| Tennis Courts | 8/10 clubs | Indoor/outdoor courts, lessons available |
| Pickleball | 6/10 clubs | Dedicated courts |
| Swimming Pool | 10/10 clubs | Lap pool, family pool options |
| Spa & Steam | 7/10 clubs | Sauna, steam room, hot tub |
| Fitness Center | 10/10 clubs | Cardio, weights, functional training |
| Group Classes | 10/10 clubs | Yoga, spin, HIIT, etc. |
| Childcare | 8/10 clubs | Supervised kids' activities |
| Cafe/Lounge | 9/10 clubs | Healthy food and beverages |
| Basketball | 4/10 clubs | Indoor courts |
| Personal Training | 10/10 clubs | Certified trainers available |

---

## Security & Compliance

### Security Measures

| **Category** | **Implementation** | **Status** |
|-------------|-------------------|------------|
| **Password Security** | Bcrypt hashing with salt | ✅ Implemented |
| **Email Verification** | Required before first login, 24-hour token expiry | ✅ Implemented |
| **Two-Factor Authentication** | Email-based 2FA with 6-digit codes, 10-minute expiry | ✅ Implemented |
| **Rate Limiting** | Express-rate-limit on OTP, 2FA, and verification endpoints | ✅ Implemented |
| **Session Security** | HttpOnly cookies, secure flag in production | ✅ Implemented |
| **API Authorization** | Middleware checks on protected routes | ✅ Implemented |
| **Input Validation** | Zod schemas on all endpoints | ✅ Implemented |
| **SQL Injection Prevention** | Parameterized queries via Drizzle ORM | ✅ Implemented |
| **Token Security** | Crypto-random tokens, expiration enforcement | ✅ Implemented |
| **Phone Validation** | E.164 format validation for SMS OTP | ✅ Implemented |
| **Data Access Control** | User can only modify own resources | ✅ Implemented |

### Privacy & Data Handling

| **Aspect** | **Implementation** |
|-----------|-------------------|
| **User Data Storage** | PostgreSQL with encrypted connections |
| **Password Storage** | Never stored in plain text, bcrypt hashed |
| **Email Privacy** | Only visible to pod leaders for approved members |
| **Session Data** | Stored server-side, not exposed to client |
| **Reset Tokens** | Single-use, time-limited, cleared after use |

---

## Performance Specifications

| **Metric** | **Target** | **Current Status** |
|-----------|-----------|-------------------|
| Page Load Time | < 2 seconds | ✅ Meeting target |
| API Response Time | < 500ms | ✅ Meeting target |
| Mobile Optimization | iOS & Android support | ✅ Responsive design |
| Database Query Performance | Indexed queries | ✅ Optimized |
| Session Persistence | Survives server restart | ✅ PostgreSQL-backed |
| Email Delivery | < 5 seconds | ✅ SendGrid integration |

---

## User Experience Features

### Design System

| **Element** | **Implementation** |
|-----------|-------------------|
| **Color Scheme** | Purple-to-pink gradient branding |
| **Typography** | Clean, readable fonts optimized for mobile |
| **Icons** | Lucide React icon library |
| **Animations** | Smooth transitions, loading states |
| **Accessibility** | WCAG compliant, keyboard navigation |
| **Responsive Design** | Mobile-first, tablet & desktop optimized |
| **Glass Effects** | Modern translucent UI elements |

### Navigation Flow

| **User Journey** | **Steps** | **Completion Rate Target** |
|-----------------|----------|---------------------------|
| **New User Registration** | 1. Landing → 2. Role Selection → 3. Profile Creation → 4. Dashboard | 85%+ |
| **Join Pod (Seeker)** | 1. Browse Pods → 2. View Details → 3. Submit Request → 4. Track Status | 90%+ |
| **Approve Request (Leader)** | 1. Dashboard → 2. View Request → 3. Approve/Reject → 4. Email Sent | 95%+ |
| **Create Pod (Leader)** | 1. Registration → 2. Pod Details → 3. Publish → 4. Manage | 80%+ |
| **Password Reset** | 1. Forgot Password → 2. Check Email → 3. Reset → 4. Login | 75%+ |

---

## Production Deployment

### Current Status

| **Component** | **Status** | **Environment** |
|--------------|------------|----------------|
| Frontend Application | ✅ Deployed | Production |
| Backend API | ✅ Deployed | Production |
| PostgreSQL Database | ✅ Deployed | Neon Serverless |
| Email Service | ✅ Configured | SendGrid Production |
| Authentication | ✅ Active | Passport.js |
| Session Storage | ✅ Active | PostgreSQL |
| Domain Integration | ✅ Configured | podmembership.com |

### Known Limitations

| **Limitation** | **Impact** | **Workaround/Notes** |
|---------------|-----------|---------------------|
| SendGrid sender verification required | Emails won't send until verified | Verify sender email in SendGrid dashboard |
| Session redirect delay (500ms) | Slight delay after login/logout | Required for PostgreSQL session persistence |
| Database naming convention | snake_case DB vs camelCase TypeScript | Automatic mapping via Drizzle |
| Password reset token expiry | 1-hour window | Security best practice, users can request new token |
| Hard delete on pod removal | No soft delete/archive | Product decision for MVP, can be changed |

---

## Success Metrics & KPIs

### User Engagement Metrics

| **Metric** | **Definition** | **Target** |
|-----------|---------------|-----------|
| Registration Completion Rate | % users completing onboarding | 80%+ |
| Pod Discovery Rate | % users browsing pods within 24hrs | 70%+ |
| Join Request Submission Rate | % pod views resulting in requests | 25%+ |
| Request Approval Rate | % requests approved by leaders | 60%+ |
| Member Retention (30-day) | % members still active after 30 days | 85%+ |
| Email Open Rate | % notification emails opened | 40%+ |

### Platform Performance Metrics

| **Metric** | **Measurement** | **Target** |
|-----------|----------------|-----------|
| API Uptime | % time API is available | 99.5%+ |
| Average Response Time | Median API response time | < 300ms |
| Database Query Performance | 95th percentile query time | < 100ms |
| Failed Email Rate | % emails not delivered | < 2% |
| Session Persistence Rate | % sessions surviving restart | 100% |

---

## Future Roadmap

### Phase 2: Payment & Automation (Q1 2026)

| **Feature** | **Priority** | **Estimated Effort** |
|------------|-------------|---------------------|
| Stripe Payment Integration | High | 3-4 weeks |
| Automated Monthly Billing | High | 2-3 weeks |
| Payment Reminders | Medium | 1-2 weeks |
| Refund Management | Medium | 1-2 weeks |

### Phase 3: Real-Time & Communication (Q2 2026)

| **Feature** | **Priority** | **Estimated Effort** |
|------------|-------------|---------------------|
| WebSocket Integration | High | 2-3 weeks |
| In-App Messaging | High | 4-5 weeks |
| Push Notifications | Medium | 2-3 weeks |
| Real-Time Availability Updates | Medium | 1-2 weeks |

### Phase 4: Expansion & Enhancement (Q3 2026)

| **Feature** | **Priority** | **Estimated Effort** |
|------------|-------------|---------------------|
| Multi-Gym Support (beyond Bay Club) | High | 6-8 weeks |
| Ratings & Reviews System | Medium | 3-4 weeks |
| Advanced Analytics Dashboard | Medium | 4-5 weeks |
| Mobile App (iOS/Android) | Low | 12+ weeks |
| Location-Based Search | Medium | 2-3 weeks |

---

## Document Control

| **Attribute** | **Value** |
|--------------|-----------|
| **Document Version** | 1.1 |
| **Last Updated** | December 3, 2025 |
| **Status** | Production Ready - Enhanced Security Features |
| **Next Review Date** | Payment Integration Planning (Q1 2026) |
| **Document Owner** | Product Management Team |
| **Technical Owner** | Development Team |
| **Stakeholders** | Product, Engineering, Bay Club Partnership |

### Change Log

| **Version** | **Date** | **Changes** |
|------------|----------|-------------|
| 1.1 | December 3, 2025 | Added email verification for new signups, Two-Factor Authentication (2FA), Apple OAuth, Phone/SMS authentication, member removal with notifications, pod leader contact display, enhanced rate limiting |
| 1.0 | November 12, 2025 | Initial release with core pod sharing features |

---

**End of Document**
