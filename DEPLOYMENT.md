# Deployment Guide

This guide covers deploying the AI Voice Shopping Assistant to production environments.

## Table of Contents

- [Overview](#overview)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Backend Deployment (Convex)](#backend-deployment-convex)
- [Voice Agent Deployment](#voice-agent-deployment)
- [Environment Variables](#environment-variables)
- [Production Checklist](#production-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

The application consists of three main components that need to be deployed:

1. **Frontend (Next.js)** → Vercel or similar
2. **Backend (Convex)** → Convex Cloud (auto-deployed)
3. **Voice Agent (Python/Pipecat)** → Your server (VPS, Cloud Run, etc.)

### Architecture in Production

```
Internet
    ↓
┌─────────────────────────────────────────┐
│  CDN/Edge (Vercel)                      │
│  - Next.js Frontend                     │
│  - Static Assets                        │
└─────────────┬───────────────────────────┘
              │
              ├─→ Convex Cloud (Serverless)
              │   - Database
              │   - Serverless Functions
              │   - Real-time Sync
              │
              └─→ Your Server (Voice Agent)
                  - WebSocket Server
                  - Pipecat Pipeline
                  - Gemini Integration
```

---

## Frontend Deployment (Vercel)

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- All environment variables ready

### Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel will auto-detect Next.js configuration

### Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-production.convex.cloud

# Clerk (Production Keys - not test keys!)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Important**: Use production/live keys, not test keys!

### Step 4: Configure Build Settings

Vercel should auto-detect these, but verify:

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 18.x or higher

### Step 5: Deploy

Click "Deploy" and Vercel will:
1. Install dependencies
2. Build your Next.js app
3. Deploy to global CDN
4. Provide a production URL (e.g., `your-app.vercel.app`)

### Step 6: Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate auto-provisioned

### Continuous Deployment

Vercel automatically deploys when you push to:
- `main` branch → Production
- Other branches → Preview deployments

---

## Backend Deployment (Convex)

Convex deploys automatically when you push to your main branch.

### Step 1: Configure Production Environment

In [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables:

```env
# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_production_gemini_key

# Pipecat Authentication
PIPECAT_SERVER_SECRET=your_secure_production_secret

# Clerk JWT Configuration
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

### Step 2: Configure Production Clerk Settings

1. In Clerk Dashboard, ensure your production application is configured
2. Verify JWT template "convex" exists with correct issuer
3. Copy your production Clerk domain to Convex environment variables

### Step 3: Connect GitHub (Recommended)

1. Convex Dashboard → Settings → Deploy Settings
2. Connect your GitHub repository
3. Select branch to auto-deploy (usually `main`)

### Step 4: Manual Deploy (Alternative)

```bash
npx convex deploy --prod
```

This deploys your:
- Database schema
- Queries, mutations, actions
- HTTP routes
- Scheduled functions

### Step 5: Verify Deployment

```bash
# Test a query
npx convex run queries:list --prod

# Check dashboard
# Visit dashboard.convex.dev to see production logs
```

### Database Migrations

Convex handles schema migrations automatically:
1. Change `schema.ts`
2. Push to GitHub (or run `npx convex deploy --prod`)
3. Convex applies changes safely

---

## Voice Agent Deployment

The Python Pipecat agent needs to run on a server with persistent connections.

### Option 1: Cloud VM (GCP, AWS, DigitalOcean)

#### Step 1: Provision Server

**Recommended Specs**:
- CPU: 2 cores minimum
- RAM: 4GB minimum
- OS: Ubuntu 22.04 LTS
- Network: Good bandwidth, low latency

```bash
# Example: Google Cloud Platform
gcloud compute instances create voice-agent \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=e2-medium \
  --zone=us-central1-a
```

#### Step 2: Install Dependencies

```bash
# SSH into server
ssh your-server

# Install Python and dependencies
sudo apt update
sudo apt install -y python3.10 python3-pip python3-venv git

# Clone repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo/pipecat

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Step 3: Configure Environment

```bash
# Create .env file
nano .env

# Add production values:
GOOGLE_API_KEY=your_production_key
CONVEX_HTTP_URL=https://your-production.convex.cloud
PIPECAT_SERVER_SECRET=your_production_secret
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

#### Step 4: Setup Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/voice-agent.service
```

```ini
[Unit]
Description=Voice Shopping Agent
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/your-repo/pipecat
Environment="PATH=/home/your-username/your-repo/pipecat/venv/bin"
ExecStart=/home/your-username/your-repo/pipecat/venv/bin/python agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable voice-agent
sudo systemctl start voice-agent

# Check status
sudo systemctl status voice-agent

# View logs
sudo journalctl -u voice-agent -f
```

#### Step 5: Configure Firewall

```bash
# Allow WebSocket port
sudo ufw allow 8000/tcp

# If using nginx (recommended)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

#### Step 6: Setup Reverse Proxy (Nginx)

```bash
# Install nginx
sudo apt install -y nginx

# Configure
sudo nano /etc/nginx/sites-available/voice-agent
```

```nginx
upstream voice_agent {
    server localhost:8000;
}

server {
    listen 80;
    server_name voice.yourdomain.com;

    location / {
        proxy_pass http://voice_agent;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/voice-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 7: Setup SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d voice.yourdomain.com

# Auto-renewal is configured automatically
```

### Option 2: Docker Deployment

#### Create Dockerfile

```dockerfile
# pipecat/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run agent
CMD ["python", "agent.py"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  voice-agent:
    build: ./pipecat
    ports:
      - "8000:8000"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - CONVEX_HTTP_URL=${CONVEX_HTTP_URL}
      - PIPECAT_SERVER_SECRET=${PIPECAT_SERVER_SECRET}
      - SERVER_HOST=0.0.0.0
      - SERVER_PORT=8000
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: Google Cloud Run

```bash
# Build container
cd pipecat
gcloud builds submit --tag gcr.io/your-project/voice-agent

# Deploy
gcloud run deploy voice-agent \
  --image gcr.io/your-project/voice-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your_key,CONVEX_HTTP_URL=your_url,PIPECAT_SERVER_SECRET=your_secret
```

**Note**: Cloud Run may have limitations with long-lived WebSocket connections.

---

## Environment Variables

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | `https://prod.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key (PRODUCTION) | `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk secret key (PRODUCTION) | `sk_live_...` |

### Backend (Convex Dashboard)

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key | `AIza...` |
| `PIPECAT_SERVER_SECRET` | Shared secret with Pipecat | `secure_random_string` |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk JWT issuer | `https://app.clerk.accounts.dev` |

### Voice Agent (Server)

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Gemini API key | `AIza...` |
| `CONVEX_HTTP_URL` | Convex HTTP endpoint | `https://prod.convex.cloud` |
| `PIPECAT_SERVER_SECRET` | Shared secret | `same_as_convex` |
| `SERVER_HOST` | Bind address | `0.0.0.0` |
| `SERVER_PORT` | Port number | `8000` |

---

## Production Checklist

### Pre-Deployment

- [ ] All environment variables configured for production
- [ ] Using production API keys (not test/development keys)
- [ ] Database schema finalized and tested
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Rate limiting considered
- [ ] Security review completed
- [ ] Load testing performed

### Post-Deployment

- [ ] Verify frontend loads correctly
- [ ] Test user authentication flow
- [ ] Verify Convex functions work
- [ ] Test WebSocket connection to voice agent
- [ ] Verify voice conversation end-to-end
- [ ] Check error logs for issues
- [ ] Monitor performance metrics
- [ ] Test on multiple devices/browsers

### Security

- [ ] HTTPS enabled on all endpoints
- [ ] API keys stored securely (not in code)
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Authentication required for sensitive operations
- [ ] WebSocket authentication implemented
- [ ] Regular security updates scheduled

### Monitoring

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Performance monitoring (Vercel Analytics, etc.)
- [ ] Log aggregation (CloudWatch, Datadog)
- [ ] Alert notifications configured

---

## Monitoring & Maintenance

### Logs

**Frontend (Vercel)**:
- Dashboard → Logs
- Real-time function execution logs
- Error tracking integration

**Backend (Convex)**:
- Dashboard → Logs
- Query/mutation execution
- Action logs with console output

**Voice Agent**:
```bash
# Systemd logs
sudo journalctl -u voice-agent -f

# Docker logs
docker-compose logs -f voice-agent
```

### Metrics to Monitor

1. **Response Times**
   - Frontend page load: < 2s
   - API responses: < 500ms
   - Voice round-trip: < 2s

2. **Error Rates**
   - Frontend errors: < 0.1%
   - Backend errors: < 1%
   - Voice agent errors: < 5%

3. **Resource Usage**
   - Voice agent memory: < 80%
   - Voice agent CPU: < 70%
   - Database size

4. **Business Metrics**
   - Active sessions
   - Products searched
   - Items saved
   - User registrations

### Scaling

**Frontend**: Auto-scales with Vercel

**Backend**: Auto-scales with Convex

**Voice Agent**:
- Horizontal scaling: Run multiple instances behind load balancer
- Use session affinity (sticky sessions)
- Consider Redis for session state sharing

### Backup & Recovery

**Database**:
- Convex handles automatic backups
- Export data periodically: Convex Dashboard → Export

**Code**:
- GitHub repository is source of truth
- Tag releases: `git tag -a v1.0.0 -m "Release 1.0.0"`

### Updates

```bash
# Update dependencies
npm update
pip install --upgrade -r requirements.txt

# Deploy updates
git push origin main  # Vercel and Convex auto-deploy

# Update voice agent
ssh your-server
cd your-repo
git pull
sudo systemctl restart voice-agent
```

---

## Troubleshooting

### Frontend Not Loading

1. Check Vercel deployment logs
2. Verify environment variables
3. Check browser console for errors
4. Verify Convex URL is correct

### Authentication Failing

1. Verify Clerk keys are production keys
2. Check JWT template configuration
3. Verify Clerk domain in Convex matches

### Voice Agent Not Responding

1. Check if service is running: `sudo systemctl status voice-agent`
2. Check logs: `sudo journalctl -u voice-agent -f`
3. Verify WebSocket port is accessible
4. Check firewall rules
5. Verify environment variables

### Database Errors

1. Check Convex Dashboard logs
2. Verify schema is deployed
3. Check authentication tokens
4. Review function implementations

---

## Cost Estimation

### Monthly Costs (Approximate)

**Vercel** (Hobby): $0/month
- Free tier includes 100GB bandwidth
- Upgrade to Pro if needed: $20/month

**Convex** (Free/Starter): $0-25/month
- Free tier: 1GB storage, 1M reads
- Starter: $25/month for more capacity

**Voice Agent Server**: $10-50/month
- DigitalOcean Droplet: $12/month (2GB RAM)
- GCP e2-medium: ~$25/month
- AWS t3.medium: ~$30/month

**APIs**:
- Clerk: Free tier (10K MAUs)
- Gemini: ~$5-20/month (depending on usage)
- Google TTS: ~$4-16/million characters

**Total**: ~$30-100/month for moderate usage

---

## Support

For deployment issues:
- Check [SETUP.md](./SETUP.md) for configuration help
- Review [README.md](./README.md) for architecture overview
- Open an issue on GitHub

---

**Happy deploying! 🚀**

