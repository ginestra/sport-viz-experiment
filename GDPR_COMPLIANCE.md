# GDPR Compliance Documentation

This document outlines the GDPR compliance features implemented in the That Lab collaborative writing platform.

## Overview

The platform is designed to be fully GDPR-compliant, implementing all required user rights and data protection measures.

## Implemented GDPR Features

### 1. Right to Access (Article 15)
- **Implementation**: Users can export all their personal data in JSON format
- **Location**: Account Settings → Export Data button
- **What's included**: Account information, threads created, participations, posts, and metadata

### 2. Right to Rectification (Article 16)
- **Implementation**: Users can update their account information
- **Location**: Account Settings page
- **Note**: Email changes may require re-verification through Supabase

### 3. Right to Erasure / "Right to be Forgotten" (Article 17)
- **Implementation**: Complete account deletion functionality
- **Location**: Account Settings → Danger Zone → Delete Account
- **Process**:
  1. User must type "DELETE" to confirm
  2. System deletes all user data in correct order:
     - User's posts
     - Thread participations
     - Threads created (if no other participants)
     - Authentication account
  3. All data is permanently removed
- **API Endpoint**: `/api/collaborative/delete-account.js` (uses service role key for secure deletion)

### 4. Right to Data Portability (Article 20)
- **Implementation**: One-click data export in JSON format
- **Location**: Account Settings → Export Data
- **Format**: Machine-readable JSON with all user data
- **Includes**: Account info, threads, participations, posts with timestamps

### 5. Right to Object (Article 21)
- **Implementation**: Users can withdraw consent by deleting their account
- **Process**: Account deletion removes all data and stops all processing

### 6. Right to Restrict Processing (Article 18
- **Implementation**: Account deletion effectively restricts all processing
- **Alternative**: Users can contact support for specific restrictions

### 7. Consent Management (Article 7)
- **Implementation**: Explicit consent checkbox during registration
- **Requirements**:
  - Users must check consent box to create account
  - Links to Privacy Policy and Terms of Service
  - Clear statement that consent can be withdrawn
- **Location**: Registration form

### 8. Privacy by Design (Article 25)
- **Implementation**:
  - Minimal data collection (only necessary data)
  - Data encryption in transit (HTTPS/TLS)
  - Data encryption at rest (Supabase)
  - Row Level Security (RLS) policies
  - Secure password hashing
  - Session management

### 9. Data Protection Impact Assessment (DPIA)
- **Data Collected**:
  - Email address (required for account)
  - Password (hashed, never stored in plain text)
  - User-generated content (threads, posts, sources)
  - Technical data (IP, browser, device - via Supabase/Vercel)
- **Data Processing**:
  - Authentication and authorization
  - Service provision
  - Real-time collaboration
  - Security and fraud prevention
- **Data Retention**: Until account deletion (user-controlled)

### 10. Privacy Policy
- **Location**: `/privacy` route
- **Content**: Comprehensive privacy policy covering:
  - Data collection and use
  - Legal basis for processing
  - User rights
  - Data security measures
  - Third-party services
  - International data transfers
  - Contact information

### 11. Terms of Service
- **Location**: `/terms` route
- **Content**: Terms covering:
  - User responsibilities
  - Content ownership
  - Plagiarism policy
  - Service availability
  - Termination rights

## Security Measures

### Authentication & Authorization
- Supabase Auth with secure password hashing
- JWT token-based sessions
- OAuth integration (Google, GitHub)
- Email verification required

### Data Security
- HTTPS/TLS encryption (Vercel default)
- Database encryption at rest (Supabase)
- Row Level Security (RLS) policies
- Input validation and sanitization
- Rate limiting (to be implemented in API routes)

### Access Control
- Users can only access their own data
- RLS policies enforce data isolation
- API endpoints verify JWT tokens

## User Data Flow

1. **Registration**: User provides email, password, and consent
2. **Data Storage**: Data stored in Supabase with encryption
3. **Data Access**: Users can view and export their data
4. **Data Deletion**: Users can delete all data via account settings

## Third-Party Services

### Supabase
- **Purpose**: Database and authentication
- **GDPR Compliance**: Yes (see [Supabase Privacy Policy](https://supabase.com/privacy))
- **Data Location**: EU/US (configurable)
- **SCCs**: Standard Contractual Clauses in place

### Vercel
- **Purpose**: Hosting and deployment
- **GDPR Compliance**: Yes (see [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy))
- **Data Location**: Global CDN

## Compliance Checklist

- [x] Privacy Policy published
- [x] Terms of Service published
- [x] Consent management (explicit consent required)
- [x] Right to access (data export)
- [x] Right to rectification (account settings)
- [x] Right to erasure (account deletion)
- [x] Right to data portability (JSON export)
- [x] Right to object (via account deletion)
- [x] Data minimization (only necessary data collected)
- [x] Security measures (encryption, RLS, validation)
- [x] Privacy by design
- [x] Clear user communication

## Environment Variables Required

For full GDPR compliance, ensure these environment variables are set:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only, for account deletion
```

## Account Deletion API

The account deletion endpoint (`/api/collaborative/delete-account.js`) requires:
- Valid JWT token in Authorization header
- Service role key for Supabase admin operations
- Proper error handling and logging

## Future Enhancements

Consider implementing:
- Data retention policies (automatic deletion after inactivity)
- Audit logs for data access
- Cookie consent banner (if analytics added)
- Data breach notification system
- Regular security audits

## Contact

For GDPR-related inquiries, users can:
1. Access Account Settings for data management
2. Export or delete their account
3. Contact support through the platform

## Legal Basis for Processing

Under GDPR Article 6, we process data based on:
- **Consent** (Article 6(1)(a)): User explicitly consents during registration
- **Contract** (Article 6(1)(b)): Processing necessary to provide requested services
- **Legitimate Interest** (Article 6(1)(f)): Security, fraud prevention, platform improvement

## Data Subject Rights Summary

| Right | Implementation | Location |
|-------|---------------|----------|
| Access | Data export | Account Settings |
| Rectification | Account settings | Account Settings |
| Erasure | Account deletion | Account Settings |
| Portability | JSON export | Account Settings |
| Object | Account deletion | Account Settings |
| Restrict | Account deletion | Account Settings |
| Withdraw Consent | Account deletion | Account Settings |

## Notes

- All user data deletion is permanent and irreversible
- Users are clearly warned before deletion
- Data export includes all user data in machine-readable format
- Privacy Policy and Terms are easily accessible
- Consent is explicit and can be withdrawn at any time

