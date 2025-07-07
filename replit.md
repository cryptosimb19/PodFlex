# FlexAccess - Gym Membership Pod Sharing Platform

## Overview

FlexAccess is a mobile-first web application designed to make high-end gym memberships (starting with Bay Club) more affordable by connecting people who want to share membership costs. The platform replaces ad-hoc WhatsApp coordination with a secure, streamlined experience for discovering and joining membership "pods."

**Core Problem**: Pods (shared memberships) are scattered across chats, pricing is unclear, and trust/payment handling is manual.

**Primary Users**: 
- Pod seekers who want lower monthly fees
- Pod leads who own a primary account and need members  
- Fitness enthusiasts who value tennis, multi-club access, or family plans

**Value Proposition**: Discover the right pod, request to join in two taps, and manage the shared membership—all in one app.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **PWA Features**: Service worker, manifest, and offline capabilities

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **API Design**: RESTful endpoints with Express routing
- **Development**: Hot module replacement with Vite integration

### Project Structure
```
├── client/          # Frontend React application
├── server/          # Express backend server
├── shared/          # Shared TypeScript schemas and types
├── migrations/      # Database migration files
└── attached_assets/ # Project documentation and specs
```

## Key Components

### Authentication System
- Planned: Email magic links and Google OAuth integration
- User preferences stored locally with server sync
- Session management for secure API access

### Pod Discovery Engine
- Region-based filtering (e.g., San Jose → Courtside)
- Membership type categorization (Single-Club, Multi-Club, Family)
- Advanced filtering by price, amenities, and availability
- Search functionality with real-time results

### Membership Management
- Pod creation and management dashboard for leads
- Join request workflow with approval system
- Member tracking and status management
- Rich pod profiles with detailed information

### User Experience Features
- Mobile-first responsive design
- Offline capability with service worker
- Push notifications for status updates
- Accessibility features and WCAG compliance

## Data Flow

1. **User Onboarding**: Preference collection → Local storage → Server sync
2. **Pod Discovery**: Search/filter → API request → Results rendering
3. **Join Request**: User selection → Request creation → Lead notification
4. **Pod Management**: Lead approval → Member update → Status sync

### Database Schema
- **Users**: Profile, preferences, membership details
- **Pods**: Membership info, availability, pricing, amenities
- **Join Requests**: User-pod connections, approval status
- **Accessibility Features**: Comprehensive accessibility metadata

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components
- **wouter**: Lightweight routing
- **zod**: Runtime type validation

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Production bundling

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- Local PostgreSQL or Neon development database
- Environment variable configuration

### Production Build
- Vite build for optimized frontend assets
- ESBuild for Node.js server bundling
- Static asset serving through Express
- PostgreSQL database migrations

### Environment Configuration
- `NODE_ENV`: Development/production mode switching
- `DATABASE_URL`: PostgreSQL connection string
- PWA manifest and service worker registration

## Changelog

```
Changelog:
- July 07, 2025. Initial setup
- July 07, 2025. Integrated authentic Bay Club location data from official website
  - Added real Bay Club locations across all campuses (CA, WA, OR)
  - Updated pod descriptions with accurate club details and amenities
  - Enhanced region filtering with authentic Bay Club campus structure
  - Implemented realistic pricing based on Bay Club membership tiers
- July 07, 2025. Updated branding with vibrant, fun logo design
  - Replaced dumbbell icon with lightning bolt (Zap) icon
  - Added purple-to-pink gradient backgrounds for all logo instances
  - Updated favicon and app icons to match new lightning bolt design
  - Changed theme colors to vibrant purple (#8B5CF6)
  - Enhanced with shadow effects for modern, polished appearance
  - Updated PWA manifest with new branding
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```