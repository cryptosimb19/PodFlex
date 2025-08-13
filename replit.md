# FlexPod - Gym Membership Pod Sharing Platform

## Overview
FlexPod is a mobile-first web application that facilitates sharing high-end gym memberships, starting with Bay Club, to make them more affordable. It replaces manual coordination with a secure, streamlined platform for discovering, joining, and managing shared membership "pods." The project aims to solve the problem of scattered pod information, unclear pricing, and manual trust/payment handling by providing a centralized app where users can find the right pod, request to join, and manage their shared membership. This offers significant value to pod seekers looking for lower fees and pod leads needing to fill their shared accounts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom CSS variables
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter
- **PWA Features**: Service worker, manifest, and offline capabilities

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **API Design**: RESTful endpoints with Express routing

### Project Structure
- `client/`: Frontend React application
- `server/`: Express backend server
- `shared/`: Shared TypeScript schemas and types
- `migrations/`: Database migration files

### Key Components
- **Authentication System**: Email magic links and Google OAuth integration, session management.
- **Pod Discovery Engine**: Region-based filtering (e.g., Bay Club campuses), membership type categorization (Single-Club, Multi-Club, Family), advanced filtering by price/amenities/availability, search functionality.
- **Membership Management**: Pod creation/management for leads, join request workflow with approval, member tracking, rich pod profiles.
- **User Experience**: Mobile-first responsive design, offline capability, push notifications, accessibility features.

### Data Flow
- **User Onboarding**: Preference collection, local storage, server sync.
- **Pod Discovery**: Search/filter, API request, results rendering.
- **Join Request**: User selection, request creation, lead notification.
- **Pod Management**: Lead approval, member update, status sync.

### Database Schema
- **Users**: Profile, preferences, membership details.
- **Pods**: Membership info, availability, pricing, amenities.
- **Join Requests**: User-pod connections, approval status.

### Functional Requirements Summary
- **User Management**: Registration (Pod Seeker vs Pod Leader), profile management, role-based access, authentication.
- **Pod Discovery & Management**: Pod creation, search/filtering by location/type/amenities, regional organization based on authentic Bay Club data, rich pod listings.
- **Membership Coordination**: Join request system (approval/rejection), member management, status tracking.
- **Dashboard Systems**: User Dashboard (active pods, requests), Pod Leader Dashboard (join requests, pod members, my pods, analytics).
- **Data Integration**: Authentic Bay Club location data, membership tiers, pricing, and location-based features.
- **User Experience**: Mobile-first, modern UI (purple-branded, animations, glass effects), WCAG-compliant accessibility, Progressive Web App (PWA).
- **Technical Architecture**: Full-stack TypeScript, TanStack Query for real-time data, secure RESTful API, scalable PostgreSQL with Drizzle ORM.

## External Dependencies

### Core Dependencies
- `@neondatabase/serverless`: PostgreSQL database connectivity
- `drizzle-orm`: Type-safe database operations
- `@tanstack/react-query`: Server state management
- `@radix-ui/react-***`: Accessible UI components
- `wouter`: Lightweight routing
- `zod`: Runtime type validation

### Development Tools
- `Vite`: Build tool and development server
- `TypeScript`: Static type checking
- `Tailwind CSS`: Utility-first styling
- `ESBuild`: Production bundling

### Third-Party Services
- **SendGrid**: For email notifications (e.g., join requests).