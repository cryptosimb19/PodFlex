# FlexPod - Gym Membership Pod Sharing Platform

## Overview
FlexPod is a mobile-first web application designed to facilitate the sharing of high-end gym memberships, specifically starting with Bay Club, to make them more affordable. It provides a secure and streamlined platform for users to discover, join, and manage shared membership "pods," addressing issues like scattered information, unclear pricing, and manual coordination. The platform aims to centralize pod discovery and management, offering value to both "pod seekers" looking for lower fees and "pod leaders" needing to fill their shared accounts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Design Approach**: Mobile-first responsive design.
- **Styling**: Tailwind CSS with custom CSS variables, incorporating a purple-branded aesthetic, animations, and glass effects.
- **Accessibility**: WCAG-compliant.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Radix UI components styled with shadcn/ui, TanStack Query for server state, Wouter for routing, and PWA capabilities (service worker, manifest, offline support).
- **Backend**: Node.js with Express server, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM, hosted on Neon serverless PostgreSQL.
- **Authentication**: Multi-method authentication including email/password, Google OAuth, Apple OAuth, and phone number authentication (SMS OTP) using Passport.js strategies. Session management and password reset functionality included.
  - **Email Verification**: New user registrations via email/password require email verification before first login. Verification email with secure token (24-hour expiry) is sent upon registration. Users are redirected to /check-email page after signup, and unverified users attempting login are blocked and redirected to /check-email. Verification is completed via /verify-email?token=xxx which marks user as verified.
  - **Two-Factor Authentication (2FA)**: Email-based 2FA for email/password login. After valid credentials, a 6-digit verification code is sent to the user's email with 10-minute expiration. User must enter code on /verify-2fa page to complete login.
  - **Security Measures**: Rate limiting (3 OTP requests/15min, 5 verify attempts/15min, 3 2FA resend requests/15min, 3 email verification resend requests/15min), one-time OTP and 2FA code use with deletion after verification, phone number validation (E.164 format), OTP and 2FA code cleanup before new creation.
- **Core Features**:
    - **Pod Discovery**: Region-based filtering (e.g., Bay Club campuses), membership type categorization, advanced filtering, search functionality.
    - **Membership Management**: Pod creation/management for leaders, comprehensive pod editing with 10+ editable fields (title, description, club details, amenities, pricing, capacity), join request workflow with approval, member tracking, rich pod profiles.
    - **User Experience**: Offline capability, push notifications.
- **Data Flow**: Structured for user onboarding, pod discovery, join request processing, and pod management.
- **Database Schema**: Includes tables for Users (profile, preferences, membership), Pods (membership info, availability, pricing, amenities), and Join Requests (user-pod connections, approval status).
- **Functional Requirements**: Comprehensive user management (registration, profiles, roles, authentication), robust pod discovery and management, efficient membership coordination (join requests, member tracking), dedicated dashboards for users and pod leaders, and integration with authentic Bay Club data.

### System Design Choices
- **Full-stack TypeScript**: Ensures type safety across the entire application.
- **Scalable Database**: PostgreSQL with Drizzle ORM for robust data management.
- **Real-time Data**: TanStack Query for efficient server state management.
- **Modular Project Structure**: Separated client, server, shared, and migrations folders.
- **Onboarding Flow**: Streamlined user onboarding with conditional redirects based on completion status and user type, protecting dashboard routes. Session persistence delay of 1500ms ensures PostgreSQL session data is fully persisted before page reload.
- **Email Handling**: Robust email notification system with status tracking and resend capabilities for join requests, password reset emails with secure token-based authentication, welcome emails sent to all new users upon signup (across all authentication methods), and member removal notifications when pod leaders remove members from their pods.
- **Route Protection**: Comprehensive authentication guards using ProtectedRoute component that redirects unauthenticated users to login page, with dual-layer protection for dashboards (authentication check + user type validation) and onboarding requirement checks for sensitive routes. OAuth callbacks (Google/Apple) intelligently redirect users based on userType: pod_leaders to /pod-leader-dashboard, pod_seekers to /dashboard, and users without userType to /user-type-selection.
- **Business Rules Enforcement**:
  - **One Pod Per Leader**: Pod leaders can only create one active pod. Backend validates via `getPodsByLeaderId()` which filters out deleted pods (`deletedAt IS NULL`). If a leader already has a pod, creation returns 400 with descriptive error message.
  - **Maximum 8 Members Per Pod**: Enforced on both pod creation (POST /api/pods) and editing (PATCH /api/pods/:id). Backend validates `totalSpots <= 8` and returns 400 if exceeded. Frontend forms include `max="8"` attribute for immediate user feedback.
  - **Pod Leader Assignment**: When creating a pod, `leadId` is automatically set from the authenticated user's ID (`req.user.id`), ensuring pods are correctly associated with their leaders and appear on the leader dashboard.
- **Dual-Role Support**: Users can simultaneously be a pod member (in one pod) AND a pod leader (of their own pod).
  - **Member Dashboard**: Shows a "Pod Leader" card with either "Create Your Own Pod" button (if no pod exists) or "Switch to Leader Dashboard" button (if user has a pod).
  - **Leader Dashboard**: Shows a "Pod Member" card with "Switch to Member Dashboard" button if the user is also a member of another pod.
  - **API Endpoint**: GET /api/pods/leader/:leaderId returns pods where the specified user is the leader, enabling dual-role detection.
- **Privacy Controls**:
  - **Pod Leader Details Hidden for Guests**: When browsing pods from the welcome page, pod leader details (name, email, phone) are hidden until users register or sign in. Guest visitors see a "Sign in to view leader details" message instead.
  - **Fellow Pod Members Privacy**: Pod members can only see other members' names and join dates - emails and phone numbers are hidden for privacy.

## External Dependencies

### Core Libraries
- `@neondatabase/serverless`: PostgreSQL database connectivity.
- `drizzle-orm`: Type-safe ORM for database operations.
- `@tanstack/react-query`: Server state management.
- `@radix-ui/react-***`: Accessible UI components.
- `wouter`: Lightweight client-side routing.
- `zod`: Runtime type validation.

### Third-Party Services
- **SendGrid**: Used for email notifications (e.g., join requests, acceptance/rejection, password reset) with branded HTML templates. Configured with API key via `SENDGRID_API_KEY` environment variable. Note: Sender email address must be verified in SendGrid before emails can be sent.
- **Twilio**: Used for SMS-based phone number authentication with OTP verification. Configured with `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` environment variables.
- **Apple OAuth**: Sign in with Apple authentication configured with `APPLE_TEAM_ID`, `APPLE_CLIENT_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` environment variables.

### Development Tools
- `Vite`: Build tool and development server.
- `TypeScript`: Static type checking.
- `Tailwind CSS`: Utility-first CSS framework.
- `ESBuild`: Production bundling.