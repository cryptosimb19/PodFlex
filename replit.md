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

## Functional Requirements Summary

### Core User Management
- **User Registration & Onboarding**: Multi-step registration flow with user type selection (Pod Seeker vs Pod Leader)
- **Profile Management**: Complete user profiles with contact information, membership details, and preferences
- **Role-Based Access**: Separate dashboards and features for regular users vs pod leaders
- **Authentication**: User session management with localStorage persistence

### Pod Discovery & Management
- **Pod Creation**: Full pod creation workflow for leaders with detailed information capture
- **Pod Search & Filtering**: Search by location, membership type, amenities, and pricing
- **Regional Organization**: Authentic Bay Club campus and club structure with real locations
- **Pod Listings**: Rich pod cards with images, descriptions, pricing, and availability

### Membership Coordination
- **Join Request System**: Complete workflow for requesting to join pods with approval/rejection
- **Request Management**: Pod leaders can review, approve, or reject join requests with detailed applicant information
- **Member Management**: View and manage current pod members with detailed profiles
- **Status Tracking**: Real-time status updates for join requests and membership changes

### Dashboard Systems
- **User Dashboard**: Personal overview with active pods, join request history, and profile management
- **Pod Leader Dashboard**: Comprehensive management interface with three main sections:
  - Join Requests: Review and manage pending applications
  - Pod Members: View and manage current members across all pods
  - My Pods: Overview and management of created pods
- **Analytics**: Statistics on active pods, total members, pending requests, and revenue

### Data Integration
- **Authentic Bay Club Data**: Complete integration of real Bay Club locations across 10 campuses
- **Membership Tiers**: Accurate membership levels and pricing from official Bay Club structure
- **Location-Based Features**: Campus-specific membership options and regional filtering

### User Experience
- **Mobile-First Design**: Responsive design optimized for mobile devices
- **Modern UI**: Purple-branded design with smooth animations and glass effects
- **Accessibility**: WCAG-compliant design with proper focus states and keyboard navigation
- **Progressive Web App**: PWA capabilities with offline functionality

### Technical Architecture
- **Full-Stack TypeScript**: End-to-end type safety with shared schemas
- **Real-Time Data**: TanStack Query for server state management and caching
- **Secure API**: RESTful endpoints with proper validation and error handling
- **Scalable Storage**: PostgreSQL with Drizzle ORM for type-safe database operations

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
- July 07, 2025. Implemented comprehensive user registration flow
  - Created welcome page with animated features and value proposition
  - Added user type selection: "Join a Pod" vs "Fill Your Pod"
  - Built 4-step pod leader registration with progress tracking
  - Customized onboarding flow based on user type (seeker vs lead)
  - Integrated form validation and comprehensive member requirements
- July 07, 2025. Integrated authentic Bay Club membership types by location with real pricing
  - Dynamic membership options based on selected club location
  - Club location drives available membership tiers (Single Site, Campus, Executive levels)
  - Authentic Bay Club pricing from $227/mo to $445/mo based on membership tier
  - Location-specific membership options reflecting real Bay Club structure
- July 07, 2025. Updated membership page structure to new 4-field format
  - Primary Campus → Primary Club → Membership Level → Bay Club Membership ID (optional)
  - Hierarchical campus-club-membership selection with authentic Bay Club data
  - Membership ID field made optional for users without existing memberships
  - Simplified onboarding flow by consolidating membership info into single step
- July 07, 2025. Integrated complete authentic Bay Club membership data across all 10 campuses
  - Updated club names to match official Bay Club naming (removed "Bay Club" prefix)
  - Added San Francisco campus with 4 locations (Financial District, Gateway, San Francisco, South San Francisco)
  - Expanded to include all authentic membership levels per location from official data
  - Added new membership types: Executive Club LA, Executive Club Southern CA, Campus (Washington)
  - Removed promotional messaging from welcome and user selection pages for cleaner UX
- July 09, 2025. Built comprehensive user dashboard with full account management
  - Created dashboard showing user profile, active pods, and join request history
  - Added phone number field to onboarding with validation
  - Implemented prepopulated join request forms with user data from localStorage
  - Updated navigation to include dashboard access
  - Added API endpoints for user join request tracking and pod membership status
  - Enhanced onboarding flow to redirect to dashboard after completion
- July 09, 2025. Created comprehensive pod leader dashboard with management capabilities
  - Built pod leader dashboard with stats, join request management, and pod overview
  - Added join request approval/rejection workflow with detailed applicant information
  - Implemented stats tracking for active pods, total members, pending requests, and monthly revenue
  - Created tabbed interface for managing join requests and viewing pod details
  - Added modal dialogs for reviewing join request details and applicant contact information
  - Enhanced navigation to route pod leaders to appropriate dashboard after registration
- July 09, 2025. Enhanced UI polish and improved role-based dashboard navigation
  - Updated primary color to vibrant purple (#8B5CF6) with smooth animations throughout
  - Added hover effects, gradient text, glass effects, and staggered animations
  - Enhanced pod cards with better visual hierarchy and modern transitions
  - Improved welcome page and user type selection with polished button interactions
  - Added custom scrollbar styling and focus states for accessibility
  - Removed pod leader dashboard link from regular user dashboard for cleaner role separation
- July 12, 2025. Implemented comprehensive pod members management system
  - Added "Pod Members" tab to pod leader dashboard with three-tab interface
  - Created pod selection interface for viewing members by specific pod
  - Built member cards with contact information and membership details
  - Implemented detailed member profile modal with full contact and membership information
  - Enhanced backend with pod member endpoints that include complete user data
  - Added sample member data across all pods for realistic testing
  - Integrated member management with existing pod leadership workflow
- July 15, 2025. Updated sample pod data with authentic Bay Club membership levels
  - Replaced generic "Multi-Club/Single-Club/Family" with real Bay Club membership tiers
  - Updated all 10 sample pods with location-specific membership levels
  - Applied Executive Club South Bay, East Bay Campus, Single Site, etc. based on location
  - Changed "Your Membership Dashboard" to "Your Account" in dashboard header
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```