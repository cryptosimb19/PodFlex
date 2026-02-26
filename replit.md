# FlexPod - Gym Membership Pod Sharing Platform

## Overview
FlexPod is a mobile-first web application designed to facilitate the sharing of high-end gym memberships, starting with Bay Club, to make them more affordable. It centralizes the discovery, joining, and management of shared membership "pods," addressing issues like scattered information and manual coordination. The platform aims to benefit both "pod seekers" looking for lower fees and "pod leaders" needing to fill their shared accounts, providing a streamlined and secure experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Design Approach**: Mobile-first responsive design.
- **Styling**: Tailwind CSS with custom variables, purple branding, animations, and glass effects.
- **Accessibility**: WCAG-compliant.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Radix UI components (styled with shadcn/ui), TanStack Query for server state, Wouter for routing, and PWA capabilities.
- **Backend**: Node.js with Express server, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM, hosted on Neon serverless.
- **Authentication**: Multi-method authentication (email/password, Google OAuth, Apple OAuth, phone number SMS OTP) using Passport.js, with session management and password reset. Features include email verification, email-based Two-Factor Authentication (2FA), automatic OAuth account merging, password setup for OAuth-only users, and rate limiting for security.
- **Core Features**:
    - **Pod Discovery**: Region-based filtering, membership type categorization, advanced search.
    - **Membership Management**: Pod creation/editing for leaders (with comprehensive fields), join request workflow with approval, member tracking, and rich pod profiles.
    - **User Experience**: Offline capability, push notifications.
    - **Dual-Role Support**: Users can be both a pod member and a pod leader simultaneously, with distinct dashboard views.
    - **Privacy Controls**: Pod leader details are hidden for guests, and fellow pod members' sensitive information (email, phone) is hidden.
    - **Member Leave Requests**: Structured workflow for members to request leaving a pod, with leader approval, billing cycle constraints, pending payment validation, and configurable exit timelines.
    - **Auto-Cancel Pending Requests**: When a join request is accepted, other pending requests from that user are automatically cancelled.
    - **Internal Messaging**: Pod leaders can send direct messages to individual members or broadcast group messages to all pod members. Members can view and reply to conversations. Unread message count badge shown in navigation.
    - **Smart Pod Matching**: AI-powered feature on the seeker dashboard. Users set preferences (region, city, ZIP, budget, membership type, desired amenities, custom notes) and get top-5 pod recommendations with a match score (0-100) and AI-generated explanation. Uses OpenAI via Replit AI Integrations. Component: `client/src/components/SmartPodMatcher.tsx`. API: `POST /api/ai/match-pods`.
- **Data Flow**: Structured for user onboarding, pod discovery, join request processing, and pod management.
- **Database Schema**: Includes tables for Users, Pods, Join Requests, Pod Members, Leave Requests, Conversations, and Messages.

### System Design Choices
- **Full-stack TypeScript**: Ensures type safety across the application.
- **Scalable Database**: PostgreSQL with Drizzle ORM.
- **Real-time Data**: TanStack Query for efficient server state.
- **Modular Project Structure**: Separated client, server, shared, and migrations folders.
- **Onboarding Flow**: Streamlined user onboarding with conditional redirects and protected routes.
- **Email Handling**: Robust notification system for various events (join requests, password resets, welcome emails, member removals).
- **Route Protection**: Comprehensive authentication guards and user type validation for sensitive routes and dashboards.
- **Business Rules Enforcement**:
    - **One Pod Per Leader**: Leaders can create only one active pod.
    - **Maximum 10 Members Per Pod**: Enforced at creation and editing, including the leader.
    - **Available Spots Calculation**: Automatically derived from total spots (total spots - 1 for the leader).
    - **Pod Leader Assignment**: Automatically assigned from the authenticated user.
    - **Platform Fee Admin-Only**: Only administrators can modify the platform fee percentage.
- **Profile Images**: User uploadable profile images stored via Replit object storage, with fallback to initials.

## External Dependencies

### Core Libraries
- `@neondatabase/serverless`: PostgreSQL connectivity.
- `drizzle-orm`: ORM for database operations.
- `@tanstack/react-query`: Server state management.
- `@radix-ui/react-***`: Accessible UI components.
- `wouter`: Client-side routing.
- `zod`: Runtime type validation.

### Third-Party Services
- **SendGrid**: Email notifications and templating.
- **Twilio**: SMS for phone number authentication and OTP.
- **Apple OAuth**: Sign in with Apple authentication.
- **Polar.sh**: Payment processing (Merchant of Record) for membership fees, including checkout sessions and webhook events for status updates.

### Membership Verification
- **Purpose**: Allows pod leaders to verify prospective members' Bay Club membership IDs.
- **Process**: Leaders initiate verification by sending an email to Bay Club; once confirmed, leaders can mark the request as verified before accepting or rejecting.

### Development Tools
- `Vite`: Build tool and development server.
- `TypeScript`: Static type checking.
- `Tailwind CSS`: Utility-first CSS framework.
- `ESBuild`: Production bundling.