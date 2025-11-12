# FlexPod - Product Requirements Document (PRD)

## Product Overview

**Product Name:** FlexPod  
**Version:** 1.0  
**Document Date:** November 12, 2025  
**Product Type:** Mobile-First Progressive Web Application (PWA)

## Executive Summary

FlexPod is a comprehensive gym membership pod sharing platform that transforms how people access premium fitness facilities. Built specifically for Bay Club members, the platform replaces ad-hoc WhatsApp coordination with a secure, streamlined experience for discovering and joining membership "pods" - shared memberships that make high-end fitness accessible and affordable.

## Problem Statement

**Core Challenge:** Bay Club memberships are expensive ($227-$445/month), leading to informal cost-sharing arrangements scattered across WhatsApp groups with unclear pricing, limited trust mechanisms, and manual payment coordination.

**Target Users:**
- **Pod Seekers:** Individuals wanting affordable access to premium fitness facilities
- **Pod Leaders:** Primary account holders looking to share membership costs
- **Fitness Enthusiasts:** Users valuing tennis, multi-club access, and family amenities

## Solution Overview

FlexPod provides a centralized platform where users can discover pods, request membership, and manage shared gym memberships through intuitive dashboards and secure coordination tools.

## Implemented Features

### 1. Authentication & Security System

#### 1.1 Multi-Method Authentication
- **Email/Password Authentication** with secure password hashing (bcrypt)
- **Google OAuth Integration** for social login
- **Magic Link Email Authentication** for passwordless login
- **Session Management** with secure cookies using express-session
- **PostgreSQL-backed sessions** for persistence across server restarts
- **Automatic session validation** on all protected routes

#### 1.2 Password Security
- **Password Reset Workflow** with email-based token system
- **Secure Token Generation** using crypto.randomBytes(32)
- **Token Expiration** (1 hour) for security
- **Password Hash Updates** with automatic token cleanup
- **Database-backed reset tokens** (snake_case: password_reset_token, password_reset_expires)

#### 1.3 User Session Management
- **Persistent sessions** stored in PostgreSQL
- **500ms delay** before redirects to ensure session persistence
- **Automatic session cleanup** on logout
- **Protected routes** with authentication middleware
- **Role-based access control** for pod leaders vs seekers

### 2. User Management System

#### 2.1 User Registration & Onboarding
- **Multi-step registration flow** with progress tracking
- **User type selection:** Pod Seeker vs Pod Leader pathways
- **Comprehensive profile creation** including:
  - Personal information (name, email, phone, address)
  - Bay Club membership details (campus, club, tier, membership ID)
  - Date of birth and location preferences
- **Form validation** with real-time error handling
- **Full PostgreSQL persistence** for all user data
- **Onboarding completion tracking** with conditional redirects

#### 2.2 Role-Based Access Control
- **Dual user types** with distinct user flows
- **Pod Leader Dashboard:** Advanced management capabilities
- **Pod Seeker Dashboard:** Simplified discovery and tracking interface
- **Automatic role-based navigation** after registration
- **Dashboard route protection** based on onboarding status

#### 2.3 Profile Management
- **Complete user profiles** with contact information
- **Membership tier integration** with authentic Bay Club levels
- **Profile editing capabilities** with data validation
- **PostgreSQL data persistence** replacing localStorage
- **Real-time profile updates** synchronized with database

### 3. Email Notification System

#### 3.1 SendGrid Integration
- **Production email service** with SendGrid API
- **Verified sender email** (podmembership.com domain)
- **HTML email templates** with branded styling
- **Email status tracking** and error handling
- **Resend capabilities** for failed deliveries

#### 3.2 Automated Notifications
- **Join Request Notifications:**
  - Email to pod leader when new request submitted
  - Includes requester details and pod information
  - Direct links to dashboard for review
- **Request Status Updates:**
  - Acceptance email to approved users
  - Rejection email to declined users
  - Branded templates with clear next steps
- **Password Reset Emails:**
  - Secure token-based reset links
  - Production domain integration (podmembership.com)
  - 1-hour expiration for security

### 4. Pod Discovery & Search System

#### 4.1 Comprehensive Pod Listings
- **Regional organization** across 10 authentic Bay Club campuses
- **Detailed pod cards** featuring:
  - Club location and address
  - Membership type and pricing
  - Available spots and total capacity
  - Amenities and facilities
  - Pod leader information
  - High-quality imagery
- **Real-time availability tracking** from database

#### 4.2 Search & Filtering
- **Region-based filtering** (San Jose, San Francisco, East Bay, etc.)
- **Membership type categorization** using authentic Bay Club tiers
- **Availability tracking** with real-time spot updates
- **Search functionality** with instant results
- **Database-driven queries** for accurate data

#### 4.3 Authentic Bay Club Integration
- **10 campuses** with real locations and addresses
- **Authentic membership levels:**
  - Executive Club South Bay, Executive Club North Bay
  - Executive Club East Bay, Executive Club LA
  - Executive Club Southern CA, Club West Gold
  - Single Site, Campus memberships, Santa Clara Campus
- **Accurate pricing** from $165-$285 per person monthly
- **Real amenities** (tennis, pickleball, pool, spa, gym, etc.)

### 5. Join Request Management System

#### 5.1 Request Submission Workflow
- **One-click join requests** with pre-populated user data
- **Detailed application forms** with user preferences
- **Real-time status tracking** (pending, accepted, rejected)
- **Request history** for users and leaders
- **PostgreSQL persistence** for all requests

#### 5.2 Pod Leader Approval System
- **Comprehensive request review** with applicant details
- **Approval/rejection workflow** with one-click actions
- **Automated email notifications** on status change
- **Applicant contact information** display
- **Batch request management** capabilities
- **Email status tracking** (sent, pending, failed)

#### 5.3 Status Management
- **Real-time updates** on request status changes
- **Request tracking** across multiple pods
- **Historical request logs** for both users and leaders
- **Email notification integration** for status changes

### 6. Pod Management System

#### 6.1 Pod Creation
- **Pod Leader Registration** workflow with Bay Club authentication
- **Comprehensive pod setup** including:
  - Club selection and location
  - Membership type and pricing
  - Total spots and availability
  - Amenities and facilities
  - Pod description and rules
- **Image upload** with URL-based storage
- **Database persistence** with leader assignment

#### 6.2 Pod Editing
- **Image update functionality** for pod leaders
- **URL-based image management**
- **Real-time preview** before saving
- **Error handling** for invalid URLs
- **Automatic cache invalidation** after updates

#### 6.3 Pod Deletion
- **Leader-only authorization** for pod deletion
- **Confirmation dialog** with clear warnings:
  - "This action cannot be undone"
  - Lists all data that will be removed
  - Requires explicit confirmation
- **Transactional deletion** ensuring data integrity:
  - Removes all join requests
  - Removes all pod members
  - Removes the pod itself
- **Security checks:**
  - 403 error if not pod leader
  - 404 error if pod not found
- **UX features:**
  - Destructive button styling (red with trash icon)
  - Loading state during deletion
  - Success/error toast notifications
  - Automatic cache refresh
  - Members view cleanup if active

### 7. Pod Leader Dashboard

#### 7.1 Three-Tab Management Interface
- **Join Requests Tab:** Review and manage pending applications
- **Pod Members Tab:** View and manage current members
- **My Pods Tab:** Overview of created pods with full management

#### 7.2 Analytics & Insights
- **Real-time statistics:**
  - Active pods count
  - Total members across all pods
  - Pending requests requiring attention
  - Monthly revenue tracking
- **Performance metrics** for pod management
- **Member engagement tracking**
- **Database-driven analytics** for accuracy

#### 7.3 Member Management System
- **Pod selection interface** for viewing specific pod members
- **Detailed member cards** with:
  - Contact information (name, email, phone)
  - Membership details and tier
  - Join date and status
  - Profile avatars with initials
- **Member profile modals** with comprehensive information
- **Member status tracking** and management
- **PostgreSQL-backed member data**

#### 7.4 Pod Management Actions
- **View Pod Details** for each created pod
- **Edit Pod Images** with real-time preview
- **Delete Pods** with confirmation and cascade cleanup
- **Member tracking** with counts and capacity
- **Availability monitoring** for each pod

### 8. User Dashboard

#### 8.1 Account Overview
- **Personal profile display** with membership information
- **Quick access** to browse pods and manage requests
- **Join request history** with status tracking
- **Active pod memberships** display
- **Database-synced profile data**

#### 8.2 Activity Tracking
- **Join request status** across all submitted requests
- **Pod membership status** and details
- **Quick navigation** to pod discovery and management
- **Real-time updates** from PostgreSQL

### 9. Database Architecture

#### 9.1 PostgreSQL Implementation
- **Neon Serverless PostgreSQL** for production database
- **Drizzle ORM** for type-safe database operations
- **Complete schema migration** from in-memory to persistent storage
- **Database tables:**
  - `users`: Complete user profiles and authentication
  - `pods`: Membership pods with leader assignments
  - `pod_members`: Member relationships
  - `join_requests`: Request workflow management
  - `sessions`: Persistent session storage

#### 9.2 Data Persistence
- **All user data** stored in PostgreSQL
- **Session persistence** across server restarts
- **Transactional operations** for data integrity
- **Snake_case database columns** with camelCase TypeScript mapping
- **Database push workflow** with `npm run db:push`

### 10. Technical Architecture

#### 10.1 Frontend Implementation
- **React 18** with TypeScript for type safety
- **Vite** for development and production builds
- **Radix UI** with shadcn/ui for accessible components
- **Tailwind CSS** with custom purple branding
- **TanStack Query** for server state management
- **Wouter** for lightweight client-side routing
- **Progressive Web App** capabilities

#### 10.2 Backend Implementation
- **Node.js** with Express server
- **PostgreSQL database** with Drizzle ORM
- **RESTful API** with proper validation
- **Zod schemas** for type validation
- **Passport.js** for authentication
- **SendGrid** for email notifications
- **Session management** with connect-pg-simple

#### 10.3 Data Architecture
- **Shared TypeScript schemas** for end-to-end type safety
- **Database-first approach** with Drizzle ORM
- **Structured data models** for users, pods, requests, and members
- **Production-ready sample data** with authentic Bay Club information

### 11. User Experience Features

#### 11.1 Mobile-First Design
- **Progressive Web App** capabilities
- **Responsive design** optimized for mobile devices
- **Touch-friendly interactions** and navigation
- **Offline capability** foundation

#### 11.2 Visual Design System
- **Purple-to-pink gradient branding** with lightning bolt icon
- **Modern glass effects** and smooth animations
- **Accessibility compliance** with WCAG standards
- **Consistent design language** across all components
- **data-testid attributes** for comprehensive testing

#### 11.3 Navigation & Flow
- **Intuitive navigation** with role-based routing
- **Seamless user flows** from registration to pod joining
- **Clear visual hierarchy** and information architecture
- **Smooth transitions** and micro-interactions
- **Protected routes** with authentication checks

## Data Integration

### 12.1 Authentic Bay Club Data
- **Complete location database** across California, Washington, and Oregon
- **Accurate membership pricing** from official Bay Club structure
- **Real amenities** and facility information
- **Authentic club names** and addresses

### 12.2 Production Data Management
- **Database-driven pod listings** with real availability
- **User-generated content** for pods and profiles
- **Automated member tracking** and capacity management
- **Real-time synchronization** across all features

## Success Metrics

### 13.1 User Engagement
- **User registration** completion rates
- **Pod discovery** and search usage
- **Join request** submission and approval rates
- **Member retention** within pods
- **Email notification** delivery and open rates

### 13.2 Platform Performance
- **Response times** for search and filtering
- **API performance** for data operations
- **Mobile responsiveness** across device types
- **Accessibility compliance** scoring
- **Database query performance**

## Technical Specifications

### 14.1 Performance Requirements
- **Page load times** under 2 seconds
- **API response times** under 500ms
- **Mobile optimization** for iOS and Android
- **PWA compliance** with service worker implementation
- **Database query optimization** for scalability

### 14.2 Security & Privacy
- **Data validation** using Zod schemas
- **Input sanitization** for all user inputs
- **Secure API endpoints** with proper error handling
- **Privacy-compliant** data handling
- **Password hashing** with bcrypt
- **Session security** with httpOnly cookies
- **CSRF protection** considerations
- **SQL injection prevention** via parameterized queries

## Deployment Status

### 15.1 Current State
- **Production environment** fully operational
- **Core functionality** implemented and tested
- **User workflows** complete and validated
- **Database integration** with PostgreSQL
- **Email notifications** configured with SendGrid
- **Authentication system** fully implemented
- **Production domain** integration (podmembership.com)

### 15.2 Production Readiness
- **Code quality** with TypeScript enforcement
- **Error handling** implemented across all features
- **Responsive design** tested across devices
- **Database migrations** completed
- **Email service** configured and tested
- **Session management** production-ready
- **Security measures** implemented

## API Endpoints

### 16.1 Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Email/password login
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### 16.2 User Endpoints
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update user profile
- `PATCH /api/users/:id/onboarding` - Update onboarding status

### 16.3 Pod Endpoints
- `GET /api/pods` - List all pods
- `GET /api/pods/:id` - Get pod details
- `POST /api/pods` - Create new pod (leader only)
- `PATCH /api/pods/:id` - Update pod (leader only)
- `DELETE /api/pods/:id` - Delete pod (leader only, with cascade)
- `GET /api/pods/search/:query` - Search pods
- `POST /api/pods/filter` - Filter pods by criteria

### 16.4 Join Request Endpoints
- `GET /api/join-requests/user/:userId` - User's join requests
- `GET /api/join-requests/leader/:leaderId` - Leader's received requests
- `POST /api/join-requests` - Submit join request
- `PATCH /api/join-requests/:id` - Update request status (with email notification)

### 16.5 Pod Member Endpoints
- `GET /api/pod-members/pod/:podId` - Get pod members
- `GET /api/pod-members/user/:userId` - Get user's memberships

## Future Enhancements

### 17.1 Immediate Next Steps
- **Payment integration** with Stripe for fee collection
- **Real-time updates** with WebSocket connections
- **Advanced search** with location-based distance calculations
- **Mobile app versions** for iOS and Android

### 17.2 Long-term Features
- **Community features** including ratings and reviews
- **Admin dashboard** for platform management
- **Analytics dashboard** for comprehensive insights
- **Multi-gym expansion** beyond Bay Club
- **In-app messaging** between members and leaders
- **Automated payment processing** and reminders
- **Calendar integration** for facility booking

### 17.3 Technical Improvements
- **Service worker** implementation for offline capability
- **Push notifications** for mobile devices
- **Image optimization** and CDN integration
- **Advanced caching** strategies
- **Database indexing** optimization
- **Load balancing** for high traffic

## Known Limitations & Notes

### 18.1 Email System
- **SendGrid sender verification** required before emails can be sent
- **Production domain** (podmembership.com) used in all email templates
- **Email status tracking** implemented for troubleshooting

### 18.2 Data Management
- **Database uses snake_case** column names while TypeScript uses camelCase
- **Password reset tokens** expire after 1 hour for security
- **Session delay** (500ms) required before redirects for PostgreSQL persistence

### 18.3 Product Decisions
- **Pod deletion** allowed regardless of active members (hard delete approach)
- **Authorization checks** on all sensitive operations
- **Transactional cleanup** ensures no orphaned data

---

**Document Status:** Current as of November 12, 2025  
**Last Updated:** All features implemented and production-ready  
**Next Review:** Payment integration and real-time features  
**Stakeholders:** Development team, product management, Bay Club partnership team
