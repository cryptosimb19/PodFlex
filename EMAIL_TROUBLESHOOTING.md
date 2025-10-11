# Email Troubleshooting Guide - FlexPod

## Current Email Configuration

The app uses MailerSend to send email notifications when users request to join pods.

### Configuration Status
- ✅ MAILERSEND_API_KEY is configured
- ✅ FROM_EMAIL is configured
- ✅ Email service is initialized successfully

## Common Email Sending Issues

### 1. **Trial Account Limitations** (Most Likely Issue)
MailerSend trial accounts have restrictions:
- **Sender Domain Verification Required**: The FROM_EMAIL domain must be verified in MailerSend
- **Recipient Restrictions**: Can only send to admin/verified email addresses
- **Solution**: 
  - Verify your sender domain in MailerSend dashboard
  - Add recipient email addresses to your verified list
  - Or upgrade to a paid MailerSend account

### 2. **Unverified Sender Email**
If the FROM_EMAIL address is not verified:
- MailerSend will reject the email
- **Solution**: Verify the FROM_EMAIL domain in MailerSend settings

### 3. **Invalid Recipient Email**
If the pod leader's email is:
- Not a valid email format
- Doesn't exist
- Blocked by MailerSend
- **Solution**: Check that pod leader email addresses are valid

### 4. **Rate Limiting**
Too many emails sent in a short time period
- **Solution**: Check MailerSend quota and upgrade if needed

## How to Debug Email Issues

### Check Server Logs
Email errors are logged in the server console. Look for:
```
MailerSend email error: [error details]
```

### Test Email Sending
1. Go to Pod Leader Dashboard
2. Create a test pod
3. Have another user request to join
4. Check server logs for email errors

### Verify MailerSend Configuration
1. Log into MailerSend dashboard
2. Check domain verification status
3. Verify sender email is approved
4. Check API key permissions
5. Review sending quotas and limits

## Email Templates

The app sends three types of emails:

1. **Join Request Notification** - Sent to pod leader when someone requests to join
2. **Join Request Accepted** - Sent to applicant when request is approved
3. **Join Request Rejected** - Sent to applicant when request is declined

All use the FROM_EMAIL environment variable and FlexPod branding.

## Production Recommendations

For production use:
1. ✅ Verify your sender domain in MailerSend
2. ✅ Upgrade from trial account if needed
3. ✅ Set up proper DNS records (SPF, DKIM, DMARC)
4. ✅ Monitor email delivery rates in MailerSend dashboard
5. ✅ Update hardcoded domain in email templates from "https://your-domain.com" to your actual domain
