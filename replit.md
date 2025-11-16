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
- **Authentication**: Email magic links and Google OAuth, session management, password reset functionality.
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
- **Email Handling**: Robust email notification system with status tracking and resend capabilities for join requests, password reset emails with secure token-based authentication.
- **Route Protection**: Comprehensive authentication guards using ProtectedRoute component that redirects unauthenticated users to login page, with dual-layer protection for dashboards (authentication check + user type validation) and onboarding requirement checks for sensitive routes.
- **Business Rules Enforcement**:
  - **One Pod Per Leader**: Pod leaders can only create one active pod. Backend validates via `getPodsByLeaderId()` which filters out deleted pods (`deletedAt IS NULL`). If a leader already has a pod, creation returns 400 with descriptive error message.
  - **Maximum 8 Members Per Pod**: Enforced on both pod creation (POST /api/pods) and editing (PATCH /api/pods/:id). Backend validates `totalSpots <= 8` and returns 400 if exceeded. Frontend forms include `max="8"` attribute for immediate user feedback.
  - **Pod Leader Assignment**: When creating a pod, `leadId` is automatically set from the authenticated user's ID (`req.user.id`), ensuring pods are correctly associated with their leaders and appear on the leader dashboard.

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

### Development Tools
- `Vite`: Build tool and development server.
- `TypeScript`: Static type checking.
- `Tailwind CSS`: Utility-first CSS framework.
- `ESBuild`: Production bundling.