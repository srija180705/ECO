# Email Configuration Guide

## Current Status

By default, the app **logs** email intent to the server console instead of actually sending emails. Join events will show as successful, but no email is sent unless you configure SMTP.

## To Enable Real Email Sending

Edit `server/.env` file and add your email configuration:

### Option 1: Gmail (Recommended)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**Steps:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Create an [App Password](https://myaccount.google.com/apppasswords)
4. Use that app password in `SMTP_PASS`

### Option 2: Other Email Providers

| Provider | SMTP Host | Port | Secure |
|----------|-----------|------|--------|
| Outlook | smtp-mail.outlook.com | 587 | false |
| SendGrid | smtp.sendgrid.net | 587 | false |
| Mailgun | smtp.mailgun.org | 587 | false |

## Testing

After configuring SMTP:
1. Start the backend: `npm run dev` (in `/server`)
2. Start the frontend: `npm run dev` (in root)
3. Create an event and join it
4. Check your email inbox for the thank-you message with the clickable Google Maps link

## Current Behavior Without SMTP

- ✅ Join button shows success feedback
- ✅ Backend logs: `[EMAIL] Email would be sent to user@example.com`
- ⚠️ No actual email is delivered
- 📝 Server console shows what email would have been sent

## Debugging

Check `server/.env` exists and has correct values:
```bash
cat server/.env | grep SMTP
```

Server logs will show:
- `[EMAIL] No SMTP configured...` - if not configured (normal)
- `[EMAIL ERROR]` - if there's a configuration error
- `[EMAIL] Email sent successfully` - if email sent successfully
