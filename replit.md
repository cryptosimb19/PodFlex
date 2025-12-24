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
  - **Maximum 10 Members Per Pod**: Enforced on both pod creation (POST /api/pods) and editing (PATCH /api/pods/:id). Backend validates `totalSpots <= 10` and returns 400 if exceeded. Frontend forms include `max="10"` attribute for immediate user feedback. The 10-member limit includes the pod leader.
  - **Available Spots Calculation**: When a pod is created, `availableSpots = totalSpots - 1` because the pod leader occupies one spot. For example, if totalSpots is 5, availableSpots will be 4.
  - **Pod Leader Assignment**: When creating a pod, `leadId` is automatically set from the authenticated user's ID (`req.user.id`), ensuring pods are correctly associated with their leaders and appear on the leader dashboard.
  - **Platform Fee Admin-Only**: Platform fee can only be edited by platform admins. Pod leaders can view the current platform fee in their Settings tab but cannot modify it.
- **Profile Images**: Users can upload profile images from the edit profile page. Images are stored using Replit object storage. Dashboards display profile images with fallback to initials (first letter of first name + first letter of last name) when no image is uploaded. Maximum file size is 5MB, JPEG or PNG formats supported.
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
- **Polar.sh**: Payment processing (Merchant of Record) for pod membership fees. Configured with `POLAR_ACCESS_TOKEN` and `POLAR_WEBHOOK_SECRET` environment variables.

### Payment Integration
- **Database Tables**: `pod_payments` stores payment records (checkout/order IDs, amounts, status); `platform_settings` stores adjustable platform fee percentage.
- **Payment Flow**: 
  1. Member views PaymentCard on pod detail page showing cost breakdown (membership fee + platform fee)
  2. Member clicks "Pay Now" which creates a Polar.sh checkout session
  3. User is redirected to Polar.sh hosted checkout page
  4. After payment, user returns to /payment-success page which polls for completion
  5. Polar.sh sends webhook events to /api/webhooks/polar to update payment status
- **Platform Fee**: Adjustable percentage (default 5%) set by managers in pod-leader-dashboard Settings tab
- **API Endpoints**:
  - `GET /api/settings/platform-fee` - Get current platform fee percentage
  - `PATCH /api/settings/platform-fee` - Update platform fee percentage (authenticated users)
  - `GET /api/pods/:id/payment-breakdown` - Calculate payment amounts for a pod
  - `POST /api/payments/create-checkout` - Create Polar.sh checkout session
  - `GET /api/payments/my-history` - Get authenticated user's payment history
  - `GET /api/payments/status/:checkoutId` - Check payment status
  - `POST /api/webhooks/polar` - Handle Polar webhook events
- **Frontend Components**: PaymentCard (cost breakdown + checkout button), PaymentHistory (user's past payments), PaymentSuccess (post-checkout confirmation page)
- **Dashboards**: Member dashboard has "Payments" tab showing payment history; Leader dashboard has "Settings" tab for platform fee management

### Development Tools
- `Vite`: Build tool and development server.
- `TypeScript`: Static type checking.
- `Tailwind CSS`: Utility-first CSS framework.
- `ESBuild`: Production bundling.