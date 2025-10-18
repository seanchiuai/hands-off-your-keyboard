# Environment Setup and Security Guide

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Environment Separation](#environment-separation)
3. [Security Best Practices](#security-best-practices)
4. [Key Rotation Guide](#key-rotation-guide)
5. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### 1. Local Development Environment

**Step 1: Copy environment template**
```bash
cp .env.example .env.local
```

**Step 2: Verify .env.local is ignored**
```bash
git status | grep .env.local
# Should return nothing (file is ignored)
```

**Step 3: Initialize Convex**
```bash
npx convex login
npx convex dev
```
This will auto-populate `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` in your `.env.local`.

**Step 4: Configure Clerk**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create or select your application
3. Navigate to **API Keys**
4. Copy **Publishable Key** → paste into `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
5. Copy **Secret Key** → paste into `CLERK_SECRET_KEY`

**Step 5: Set up Clerk JWT Template for Convex**
1. In Clerk Dashboard, go to **JWT Templates**
2. Click **New Template** → name it `convex`
3. Copy the **Issuer** domain → paste into `CLERK_JWT_ISSUER_DOMAIN`
4. Also add to Convex:
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-clerk-instance.clerk.accounts.dev"
   ```

**Step 6: Configure third-party API keys**

**Google Gemini API:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create new API key
3. Paste into `GOOGLE_GENERATIVE_AI_API_KEY`
4. Set usage quotas and alerts in Google Cloud Console

**SerpAPI:**
1. Go to [SerpAPI Dashboard](https://serpapi.com/manage-api-key)
2. Copy your API key
3. Paste into `SERPAPI_KEY`
4. Set usage limits in SerpAPI dashboard

**Pipecat Server:**
1. Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```
2. Add to `.env.local` as `PIPECAT_SERVER_SECRET`
3. Add the SAME value to `pipecat/.env` as `PIPECAT_SERVER_SECRET`

**Step 7: Start development server**
```bash
npm run dev
```

---

## Environment Separation

### Development vs Production

**CRITICAL:** Never use the same environment variables across environments.

### Development Environment
- **Location:** `.env.local` (local file, never committed)
- **Clerk:** Use TEST keys (`pk_test_*`, `sk_test_*`)
- **Convex:** Use development deployment (`dev:project-name`)
- **Third-party APIs:** Use development/test keys with rate limits

### Production Environment
- **Location:** Deployment platform environment variables (Vercel, Netlify, etc.)
- **Clerk:** Use PRODUCTION keys (`pk_live_*`, `sk_live_*`)
- **Convex:** Use production deployment (`prod:project-name`)
- **Third-party APIs:** Use production keys with monitoring and alerts

### Setting up Production Environment Variables

#### Vercel
1. Go to Project Settings → Environment Variables
2. Add each variable:
   - `NEXT_PUBLIC_CONVEX_URL` → Production Convex URL
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → Production publishable key
   - `CLERK_SECRET_KEY` → Production secret key (mark as Secret)
   - `CLERK_JWT_ISSUER_DOMAIN` → Production JWT issuer
   - `GOOGLE_GENERATIVE_AI_API_KEY` → Production API key (mark as Secret)
   - `PIPECAT_SERVER_SECRET` → Production secret (mark as Secret)
   - `SERPAPI_KEY` → Production API key (mark as Secret)
3. Select environment scope: Production, Preview, or Development

#### Convex Production Deployment
```bash
# Switch to production deployment
npx convex deploy --prod

# Set environment variables in Convex production
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-production-domain.com" --prod
```

#### Environment-specific Configuration Checklist

- [ ] Separate Clerk applications for dev and prod
- [ ] Separate Convex deployments for dev and prod
- [ ] Different API keys for all third-party services
- [ ] JWT issuer domain matches environment (dev vs prod)
- [ ] Production secrets never stored in files, only in secret managers
- [ ] All production keys have monitoring and alerts enabled
- [ ] Rate limits configured appropriately per environment

---

## Security Best Practices

### 1. Secret Storage

**DO:**
- ✅ Use deployment platform secret managers for production
- ✅ Use `.env.local` for local development only
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use `.env.example` with placeholder values for documentation
- ✅ Rotate keys immediately if exposure is suspected

**DON'T:**
- ❌ Commit `.env.local` to Git
- ❌ Share secrets via email, Slack, or other insecure channels
- ❌ Use production keys in development
- ❌ Hard-code secrets in source code
- ❌ Use the same secrets across multiple projects

### 2. NEXT_PUBLIC_ Variables

**IMPORTANT:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

**Safe for NEXT_PUBLIC_:**
- ✅ `NEXT_PUBLIC_CONVEX_URL` (publicly accessible API endpoint)
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (designed to be public)

**NEVER use NEXT_PUBLIC_ for:**
- ❌ Secret keys (Clerk secret, API keys)
- ❌ Authentication tokens
- ❌ Database credentials
- ❌ Internal service URLs

### 3. Monitoring and Alerts

**For all third-party APIs, set up:**
1. **Usage quotas** to prevent unexpected costs
2. **Usage alerts** to detect anomalies
3. **IP restrictions** where supported
4. **Rate limiting** appropriate to your use case

**Google Gemini API:**
- Set daily request quotas in Google Cloud Console
- Enable billing alerts
- Monitor usage in Google AI Studio

**SerpAPI:**
- Set monthly search limits
- Enable email alerts for high usage
- Monitor usage in SerpAPI dashboard

**Clerk:**
- Set up webhook alerts for suspicious auth events
- Monitor MAU (Monthly Active Users) usage
- Review security logs regularly

### 4. Key Rotation Schedule

**Recommended rotation schedule:**
- **Critical secrets** (auth, database): Every 90 days or immediately if suspected exposure
- **Third-party API keys**: Every 6 months or per service recommendation
- **Development keys**: After each major security incident or personnel change

### 5. Access Control

**Who should have access to production secrets?**
- Only team members who absolutely need them
- Use role-based access control (RBAC) in your secret manager
- Audit access logs regularly
- Remove access immediately when team members leave

---

## Key Rotation Guide

### When to Rotate Keys

**Immediate rotation required:**
- ❌ Key accidentally committed to Git
- ❌ Key shared via insecure channel
- ❌ Suspicious activity detected in usage logs
- ❌ Team member with access leaves the organization
- ❌ Security breach or compromise detected

**Scheduled rotation:**
- 🔄 Every 90 days for critical auth keys
- 🔄 Every 6 months for third-party API keys
- 🔄 After major security audits

### How to Rotate Keys

#### 1. Clerk Secret Key

**Step 1:** Generate new key
1. Go to Clerk Dashboard → API Keys
2. Click "Regenerate Secret Key"
3. Copy the new key immediately

**Step 2:** Update environments
1. Update `.env.local` locally
2. Update production secret manager (Vercel, etc.)
3. Restart application servers

**Step 3:** Verify
1. Test authentication flows
2. Check for errors in logs
3. Monitor for 24 hours

**Step 4:** Revoke old key (if supported)

#### 2. Google Gemini API Key

**Step 1:** Create new key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create new API key
3. Copy immediately

**Step 2:** Update environments
1. Update `.env.local`
2. Update production secret manager
3. Redeploy application

**Step 3:** Test functionality
1. Test all Gemini-dependent features
2. Monitor error logs

**Step 4:** Delete old key
1. Return to Google AI Studio
2. Delete the old key

#### 3. SerpAPI Key

**Step 1:** Create new key (if multiple keys supported)
1. Go to SerpAPI dashboard
2. Generate new key

**Step 2:** Update environments
1. Update all `.env.local` files
2. Update production
3. Redeploy

**Step 3:** Test search functionality
1. Verify product searches work
2. Check usage limits

**Step 4:** Delete old key

#### 4. Pipecat Server Secret

**Step 1:** Generate new secret
```bash
openssl rand -base64 32
```

**Step 2:** Update both services
1. Update `.env.local` (Next.js)
2. Update `pipecat/.env` (Python server)
3. Restart both services

**Step 3:** Verify communication
1. Test voice chat functionality
2. Check Pipecat server logs
3. Verify Convex httpAction authentication

#### 5. Convex Deployment (migration)

**For changing deployments:**
```bash
# Create new deployment
npx convex deploy --prod

# Update environment variables
npx convex env set CLERK_JWT_ISSUER_DOMAIN "..." --prod

# Update .env.local with new deployment URL
# Update production environment variables
```

### Post-Rotation Checklist

After rotating any key:
- [ ] Updated all environments (dev, staging, prod)
- [ ] Redeployed all affected services
- [ ] Tested all affected functionality
- [ ] Verified no errors in logs
- [ ] Updated team documentation
- [ ] Deleted/revoked old key
- [ ] Monitored for 24-48 hours
- [ ] Documented rotation in security log

---

## Troubleshooting

### Issue: Clerk authentication fails after deployment

**Possible causes:**
1. JWT issuer domain mismatch
2. Wrong Clerk keys for environment
3. Convex environment not configured

**Solution:**
```bash
# Verify JWT issuer matches between Clerk and Convex
npx convex env list | grep CLERK_JWT_ISSUER_DOMAIN

# Should match your Clerk JWT template issuer
# Update if needed:
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-clerk-instance.clerk.accounts.dev"
```

### Issue: "Invalid API key" errors for third-party services

**Possible causes:**
1. Key not properly set in environment
2. Key has been revoked or expired
3. Wrong environment (dev key in prod)

**Solution:**
1. Verify key exists: `echo $GOOGLE_GENERATIVE_AI_API_KEY` (locally)
2. Check deployment platform environment variables
3. Rotate key if necessary
4. Redeploy application

### Issue: NEXT_PUBLIC_ variables not available in browser

**Possible causes:**
1. Variable added after build
2. Build cache issue

**Solution:**
```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run build
npm run start
```

### Issue: Environment variables not loading

**Possible causes:**
1. `.env.local` not in root directory
2. Syntax errors in `.env.local`
3. Wrong environment file for environment

**Solution:**
1. Verify file location: `ls -la .env.local`
2. Check for syntax errors (no spaces around `=`)
3. Restart dev server: `npm run dev`

### Issue: Convex deployment URL mismatch

**Possible causes:**
1. Multiple Convex deployments
2. Stale environment variables

**Solution:**
```bash
# Check current deployment
npx convex env list

# Verify NEXT_PUBLIC_CONVEX_URL matches the deployment
# Update .env.local if needed
```

---

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Google AI Studio](https://ai.google.dev/tutorials/setup)
- [SerpAPI Documentation](https://serpapi.com/docs)

---

## Security Contacts

If you discover a security vulnerability:
1. **DO NOT** create a public GitHub issue
2. Rotate affected keys immediately
3. Contact team security lead
4. Document incident for post-mortem
