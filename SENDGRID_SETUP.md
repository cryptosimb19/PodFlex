# SendGrid + Squarespace Domain Setup Guide

## Overview
This guide will help you connect your Squarespace domain with SendGrid so FlexPod can send professional email notifications when users request to join pods.

## Step 1: Domain Authentication in SendGrid

### 1.1 Access SendGrid Dashboard
1. Log into your SendGrid account at https://app.sendgrid.com
2. Navigate to **Settings** → **Sender Authentication**
3. Click **Authenticate Your Domain**

### 1.2 Configure Domain Authentication
1. Enter your Squarespace domain (e.g., `yourdomain.com`)
2. Choose **Use automated security** (recommended)
3. Select **No** for "Would you like to brand the links for this domain?"
4. Click **Next**

### 1.3 Get DNS Records
SendGrid will provide you with DNS records that look like this:
```
Type: CNAME
Host: s1._domainkey
Value: s1.domainkey.u12345.wl134.sendgrid.net

Type: CNAME  
Host: s2._domainkey
Value: s2.domainkey.u12345.wl134.sendgrid.net
```

## Step 2: Add DNS Records in Squarespace

### 2.1 Access Squarespace DNS Settings
1. Log into your Squarespace account
2. Go to **Settings** → **Domains**
3. Click on your domain name
4. Click **DNS Settings**

### 2.2 Add CNAME Records
For each CNAME record from SendGrid:
1. Click **Add Record**
2. Select **CNAME**
3. Enter the **Host** value (e.g., `s1._domainkey`)
4. Enter the **Data** value (e.g., `s1.domainkey.u12345.wl134.sendgrid.net`)
5. Click **Save**

### 2.3 Verify Setup
1. Return to SendGrid dashboard
2. Click **Verify** to check domain authentication
3. This may take up to 48 hours to fully propagate

## Step 3: Create API Key

### 3.1 Generate API Key
1. In SendGrid, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Choose **Restricted Access**
4. Name it "FlexPod Notifications"

### 3.2 Set Permissions
Grant these permissions:
- **Mail Send**: Full Access
- **Sender Authentication**: Read Access
- **Template Engine**: Read Access

### 3.3 Save API Key
1. Click **Create & View**
2. **IMPORTANT**: Copy the API key immediately (you won't see it again)
3. Store it securely

## Step 4: Set Up Sender Email

### 4.1 Create From Email
Choose your sender email address:
- `noreply@yourdomain.com` (recommended)
- `notifications@yourdomain.com`
- `flexpod@yourdomain.com`

### 4.2 Verify Single Sender (Alternative)
If domain authentication takes too long:
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter your chosen email address
4. Fill out the form with your information
5. Check your email and click the verification link

## Step 5: Configure FlexPod

### 5.1 Add Environment Variables
You'll need to provide these secrets to FlexPod:
- `SENDGRID_API_KEY`: The API key you created
- `FROM_EMAIL`: Your sender email address (e.g., `noreply@yourdomain.com`)

### 5.2 Test Email Notifications
Once configured, test by:
1. Creating a test pod in FlexPod
2. Submitting a join request
3. Checking that the pod leader receives an email notification

## Troubleshooting

### Common Issues
1. **Domain not verified**: Wait up to 48 hours for DNS propagation
2. **Authentication failed**: Double-check CNAME records in Squarespace
3. **Emails not sending**: Verify API key permissions and FROM_EMAIL address

### DNS Propagation Check
Use online tools like whatsmydns.net to check if your CNAME records have propagated globally.

### Contact Support
- SendGrid Support: https://support.sendgrid.com
- Squarespace Support: https://support.squarespace.com

## Email Template Preview

When a user requests to join a pod, the pod leader will receive a professional email that includes:
- FlexPod branding with purple gradient header
- Pod name and details
- Applicant's name and email
- Direct link to review the request
- Clean, mobile-friendly design

The email will come from your domain (e.g., `noreply@yourdomain.com`) giving it a professional appearance.