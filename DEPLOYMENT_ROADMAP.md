# VideoHub Hybrid Deployment Roadmap

**Deployment Strategy:** Vercel (Frontend) + VPS with HestiaCP (Backend)  
**Estimated Time:** 4-6 hours  
**Difficulty:** Intermediate  
**Cost:** $0/month (using existing resources)

---

## 📋 Table of Contents

1. [Prerequisites Checklist](#prerequisites-checklist)
2. [Phase 1: VPS Backend Setup](#phase-1-vps-backend-setup)
3. [Phase 2: Frontend Deployment to Vercel](#phase-2-frontend-deployment-to-vercel)
4. [Phase 3: Integration & Testing](#phase-3-integration--testing)
5. [Phase 4: Monitoring & Optimization](#phase-4-monitoring--optimization)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Rollback Plan](#rollback-plan)

---

## Prerequisites Checklist

### ✅ Resources Required

- [ ] VPS Access
  - IP: `45.83.122.61`
  - Domain: `server.porninblack.com`
  - OS: Debian 11
  - RAM: 4GB
  - CPU: 2 vCPU
  - HestiaCP installed and accessible

- [ ] Accounts & Services
  - [ ] GitHub account (for code repository)
  - [ ] Vercel account (free tier)
  - [ ] Supabase project (already configured)
  - [ ] UPnShare API token

- [ ] Development Environment
  - [ ] SSH client (Terminal, PuTTY, etc.)
  - [ ] Git installed locally
  - [ ] Node.js 18+ installed locally
  - [ ] Code editor (VS Code recommended)

- [ ] Credentials Ready
  - [ ] VPS root password
  - [ ] HestiaCP admin credentials
  - [ ] Supabase connection strings
  - [ ] UPnShare API token
  - [ ] Domain DNS access (if needed)

---

## Phase 1: VPS Backend Setup

**Duration:** 2-3 hours  
**Objective:** Deploy Express API with background tasks on VPS

### Step 1.1: SSH Access & Initial Setup

**Time:** 10 minutes

```bash
# Connect to your VPS
ssh root@45.83.122.61

# Update system packages
apt update && apt upgrade -y

# Install essential tools
apt install -y git curl build-essential
```

**Verification:**
```bash
# Check system info
uname -a
# Should show: Debian 11

free -h
# Should show: ~4GB RAM
```

---

### Step 1.2: Install Node.js via NVM

**Time:** 15 minutes

```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload bash profile
source ~/.bashrc

# Install Node.js 18 LTS
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version
# Should show: v18.x.x

npm --version
# Should show: 9.x.x or higher
```

**Verification:**
```bash
which node
# Should show: /root/.nvm/versions/node/v18.x.x/bin/node
```

---

### Step 1.3: Install PM2 Process Manager

**Time:** 5 minutes

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version

# Configure PM2 to start on system boot
pm2 startup systemd
# Copy and run the command it outputs
```

**Verification:**
```bash
pm2 list
# Should show empty list (no apps running yet)
```

---

### Step 1.4: Install HestiaCP Node.js Plugin

**Time:** 15 minutes

```bash
# Download the plugin
cd /tmp
git clone https://github.com/cristiancosano/hestiacp-nodejs.git
cd hestiacp-nodejs

# Make installer executable
chmod +x install.sh

# Install the plugin
sudo ./install.sh

# Verify installation
ls -la /usr/local/hestia/web/templates/nginx/php-fpm/
# Should see NodeJS.tpl and NodeJS.stpl files
```

**Troubleshooting:**
- If installation fails, check HestiaCP version: `v-list-sys-hestia-updates`
- Minimum HestiaCP version required: 1.4.0+

---

### Step 1.5: Configure HestiaCP User for SSH

**Time:** 5 minutes

**Via HestiaCP Web Interface:**

1. Login to HestiaCP: `https://45.83.122.61:8083`
2. Navigate to **Users** → Select your user (e.g., `admin`)
3. Click **Edit**
4. Scroll to **Advanced Options**
5. Set **SSH Access** to `bash` (not `nologin`)
6. Click **Save**

**Via CLI (alternative):**
```bash
# Replace 'admin' with your HestiaCP username
v-change-user-shell admin bash
```

**Verification:**
```bash
# Test SSH as HestiaCP user
ssh admin@45.83.122.61
# Should connect successfully
```

---

### Step 1.6: Setup API Subdomain

**Time:** 20 minutes

**Option A: Via HestiaCP Web Interface (Recommended)**

1. **Add Subdomain:**
   - Navigate to **Web** → **Add Domain**
   - Domain: `api.server.porninblack.com`
   - Web Template: `default`
   - Backend Template: `default`
   - Proxy Template: `default` (we'll change this later)
   - Enable **SSL** (Let's Encrypt)
   - Click **Save**

2. **Wait for SSL Certificate:**
   - HestiaCP will automatically request SSL certificate
   - Wait 2-3 minutes for Let's Encrypt validation
   - Check: `https://api.server.porninblack.com` (should show default page)

3. **Change Proxy Template to NodeJS:**
   - Go back to **Web** → Find `api.server.porninblack.com`
   - Click **Edit**
   - Change **Proxy Template** to `NodeJS`
   - Click **Save**

**Option B: Via CLI**

```bash
# Add domain
v-add-web-domain admin api.server.porninblank.com

# Enable SSL
v-add-letsencrypt-domain admin api.server.porninblack.com

# Change to NodeJS proxy template
v-change-web-domain-proxy-tpl admin api.server.porninblack.com NodeJS
```

**DNS Configuration (if not auto-configured):**

Add these records to your DNS provider:

```
Type: A
Name: api.server.porninblack.com
Value: 45.83.122.61
TTL: 3600
```

**Verification:**
```bash
# Check DNS resolution
nslookup api.server.porninblack.com
# Should return: 45.83.122.61

# Check SSL certificate
curl -I https://api.server.porninblack.com
# Should return: 200 or 404 (not SSL error)
```

---

### Step 1.7: Deploy Backend Code

**Time:** 30 minutes

```bash
# Switch to HestiaCP user
su - admin

# Navigate to nodeapp directory
cd /home/admin/web/api.server.porninblack.com/nodeapp

# Clone your repository (replace with your repo URL)
# Option 1: Clone from GitHub
git clone https://github.com/yourusername/videohub.git .

# Option 2: Upload via SCP from your local machine
# (Run this from your LOCAL machine, not VPS)
# scp -r /path/to/your/project/* admin@45.83.122.61:/home/admin/web/api.server.porninblack.com/nodeapp/

# Install dependencies
npm install --production

# Verify node_modules installed
ls -la node_modules
```

**Verification:**
```bash
# Check if main files exist
ls -la server/index.ts package.json
# Should list both files
```

---

### Step 1.8: Configure Environment Variables

**Time:** 15 minutes

```bash
# Still in nodeapp directory
cd /home/admin/web/api.server.porninblack.com/nodeapp

# Create .env file
nano .env
```

**Copy and paste this template (fill in your actual values):**

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Supabase Database (get from Supabase dashboard → Settings → Database)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# UPnShare API
UPNSHARE_API_TOKEN=your_upnshare_api_token_here

# Redis Cache (Optional - Upstash Redis)
# Get free tier at: https://upstash.com
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# CORS Configuration
ALLOWED_ORIGINS=https://videohub.vercel.app,https://videohub-git-*.vercel.app,https://*.vercel.app

# Background Tasks Configuration
REFRESH_INTERVAL=300000
LOG_RETENTION_DAYS=30
BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION_DAYS=7
BACKUP_DIR=./backups

# Optional: Logging
LOG_LEVEL=info
```

**Save and exit:** `Ctrl+X` → `Y` → `Enter`

**Security Check:**
```bash
# Set proper permissions (important!)
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (only owner can read/write)
```

---

### Step 1.9: Update package.json for Production

**Time:** 5 minutes

```bash
# Edit package.json
nano package.json
```

**Ensure these scripts exist:**

```json
{
  "scripts": {
    "start": "node --loader tsx server/index.ts",
    "build": "tsc",
    "dev": "tsx watch server/index.ts"
  }
}
```

**Alternative if tsx doesn't work in production:**

```bash
# Install TypeScript and ts-node for production
npm install --save-dev typescript ts-node

# Update start script in package.json to:
"start": "ts-node server/index.ts"
```

---

### Step 1.10: Test Backend Locally on VPS

**Time:** 10 minutes

```bash
# Still in nodeapp directory
# Test run the server
npm start

# You should see:
# ✅ Supabase Auth configured
# 🔧 Initializing database schemas...
# ✅ PostgreSQL connection pool created
# 🔄 Starting background tasks (traditional server mode)
# Server running on port 3000
```

**In another SSH session, test the API:**

```bash
# Test health endpoint
curl http://localhost:3000/api/ping

# Should return: {"message":"ping pong"}

# Test videos endpoint (may take time on first run)
curl http://localhost:3000/api/videos

# Should return JSON with videos array
```

**If successful, stop the test server:** `Ctrl+C`

---

### Step 1.11: Start Backend with PM2

**Time:** 10 minutes

```bash
# Still in nodeapp directory

# Start app with PM2
pm2 start npm --name "videohub-api" -- start

# Check status
pm2 status
# Should show: videohub-api | online

# View logs
pm2 logs videohub-api --lines 50

# Save PM2 configuration
pm2 save

# Setup PM2 to restart on system reboot
pm2 startup
# Follow the instructions it provides
```

**PM2 Useful Commands:**

```bash
# View logs
pm2 logs videohub-api

# Restart app
pm2 restart videohub-api

# Stop app
pm2 stop videohub-api

# Monitor resources
pm2 monit

# Show app info
pm2 show videohub-api
```

---

### Step 1.12: Configure HestiaCP Nginx Proxy

**Time:** 10 minutes

The HestiaCP NodeJS template should have automatically configured Nginx to proxy to your app. Let's verify:

```bash
# Check Nginx configuration
cat /home/admin/conf/web/api.server.porninblack.com/nginx.conf

# Should contain proxy_pass directives to unix socket or localhost:3000
```

**If proxy is not configured, manually restart proxy template:**

1. Go to HestiaCP → **Web** → `api.server.porninblack.com`
2. Click **Edit**
3. Change **Proxy Template** to `default`, click **Save**
4. Change **Proxy Template** back to `NodeJS`, click **Save**

**Restart Nginx:**

```bash
# As root user
systemctl restart nginx

# Check nginx status
systemctl status nginx
# Should show: active (running)
```

---

### Step 1.13: Test Public API Access

**Time:** 5 minutes

```bash
# From your LOCAL machine (not VPS)

# Test HTTPS endpoint
curl https://api.server.porninblack.com/api/ping

# Should return: {"message":"ping pong"}

# Test videos endpoint
curl https://api.server.porninblack.com/api/videos | jq '.videos | length'

# Should return: number of videos (e.g., 1704)
```

**Verification Checklist:**

- [ ] HTTPS works (no SSL errors)
- [ ] `/api/ping` returns 200 OK
- [ ] `/api/videos` returns video data
- [ ] Background tasks are running (check PM2 logs)

---

## Phase 2: Frontend Deployment to Vercel

**Duration:** 1-2 hours  
**Objective:** Deploy Vite/React frontend to Vercel CDN

### Step 2.1: Prepare Frontend Configuration

**Time:** 15 minutes

**On your LOCAL machine:**

```bash
# Navigate to your project
cd /path/to/videohub

# Create production environment file
nano .env.production
```

**Add these variables:**

```bash
# Backend API URL (your VPS)
VITE_API_URL=https://api.server.porninblack.com

# Supabase (Frontend needs these too)
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Save and commit:**

```bash
git add .env.production
git commit -m "Add production environment configuration"
git push origin main
```

---

### Step 2.2: Update API Client to Use Environment Variable

**Time:** 10 minutes

**Check/update your API client files:**

Search for hardcoded API URLs:

```bash
# Search for potential hardcoded URLs
grep -r "localhost:5000" client/
grep -r "http://localhost" client/
```

**Ensure API calls use environment variable:**

Common files to check:
- `client/lib/api.ts`
- `client/lib/supabase.ts`
- Any fetch/axios configuration files

**Example fix in `client/lib/api.ts`:**

```typescript
// BEFORE (hardcoded)
const API_URL = 'http://localhost:5000';

// AFTER (using env var)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

**Commit changes:**

```bash
git add .
git commit -m "Use environment variable for API URL"
git push origin main
```

---

### Step 2.3: Create Vercel Account & Install CLI

**Time:** 10 minutes

**Create Account:**

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended for easier deployment)
3. Authorize Vercel to access your repositories

**Install Vercel CLI:**

```bash
# Install globally
npm install -g vercel

# Login to Vercel
vercel login

# Follow the authentication flow
```

**Verification:**

```bash
vercel --version
# Should show: Vercel CLI version
```

---

### Step 2.4: Configure Vercel Project

**Time:** 15 minutes

**Option A: Deploy via CLI (Quick Start)**

```bash
# Navigate to your project
cd /path/to/videohub

# Deploy to Vercel (this creates the project)
vercel

# Follow the prompts:
# ? Set up and deploy "~/videohub"? [Y/n] y
# ? Which scope? [Your account]
# ? Link to existing project? [y/N] n
# ? What's your project's name? videohub
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n

# After successful deployment, deploy to production:
vercel --prod
```

**Option B: Deploy via GitHub Integration (Recommended)**

1. **Push code to GitHub:**
   ```bash
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **Import Git Repository**
   - Select your `videohub` repository
   - Click **Import**

3. **Configure Build Settings:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/spa` (check your vite.config.ts)
   - **Install Command:** `npm install`

4. **Add Environment Variables:**
   
   Click **Environment Variables**, add these:
   
   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_API_URL` | `https://api.server.porninblack.com` | Production, Preview, Development |
   | `VITE_SUPABASE_URL` | `https://[YOUR-REF].supabase.co` | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | `your_anon_key` | Production, Preview, Development |

5. **Deploy:**
   - Click **Deploy**
   - Wait 2-3 minutes for build to complete

---

### Step 2.5: Get Vercel Deployment URL

**Time:** 5 minutes

After deployment completes:

1. **Note your production URL:**
   - Will be something like: `https://videohub-abc123.vercel.app`
   - Or custom: `https://videohub.vercel.app`

2. **Test the deployment:**
   ```bash
   curl https://your-app.vercel.app
   # Should return HTML
   ```

3. **Open in browser:**
   - Visit your Vercel URL
   - Should see your VideoHub interface

---

### Step 2.6: Update CORS on Backend

**Time:** 10 minutes

**SSH back to VPS:**

```bash
ssh admin@45.83.122.61
cd /home/admin/web/api.server.porninblack.com/nodeapp

# Edit .env file
nano .env
```

**Update ALLOWED_ORIGINS with your actual Vercel URL:**

```bash
# Replace 'videohub' with your actual Vercel project name
ALLOWED_ORIGINS=https://videohub-abc123.vercel.app,https://videohub-git-*.vercel.app,https://*.vercel.app,https://videohub.vercel.app
```

**Save and restart PM2:**

```bash
pm2 restart videohub-api

# Check logs to confirm CORS is configured
pm2 logs videohub-api --lines 20
```

---

### Step 2.7: Configure Custom Domain (Optional)

**Time:** 20 minutes (if using custom domain)

**In Vercel Dashboard:**

1. Go to your project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain: `videohub.porninblack.com` (or whatever you want)
4. Vercel will provide DNS records

**In your DNS provider:**

Add the CNAME record Vercel provides:

```
Type: CNAME
Name: videohub (or @)
Value: cname.vercel-dns.com
TTL: 3600
```

**Wait for DNS propagation:** 5-30 minutes

**Update CORS again:**

```bash
# On VPS, update .env
ALLOWED_ORIGINS=https://videohub.porninblack.com,https://videohub-*.vercel.app

# Restart
pm2 restart videohub-api
```

---

## Phase 3: Integration & Testing

**Duration:** 1 hour  
**Objective:** Verify everything works together

### Step 3.1: Functional Testing

**Time:** 30 minutes

**Test these features from your Vercel frontend:**

1. **Homepage Loading:**
   - [ ] Page loads without errors
   - [ ] Videos display correctly
   - [ ] Thumbnails load
   - [ ] Folder filters work

2. **Video Playback:**
   - [ ] Click a video to open player
   - [ ] Video streams without buffering
   - [ ] Player controls work (play, pause, seek)
   - [ ] View count increments

3. **Search & Filters:**
   - [ ] Search bar filters videos
   - [ ] Tag filtering works
   - [ ] Folder filtering works
   - [ ] Pagination works

4. **Authentication (if implemented):**
   - [ ] Login redirects to Supabase
   - [ ] After login, redirects back to app
   - [ ] Protected routes work
   - [ ] Logout works

5. **Admin Features (if authenticated):**
   - [ ] Admin dashboard accessible
   - [ ] Can view analytics
   - [ ] Can manage videos
   - [ ] Can view logs

---

### Step 3.2: Performance Testing

**Time:** 15 minutes

**Check Performance Metrics:**

```bash
# Test API response time
time curl https://api.server.porninblack.com/api/videos > /dev/null

# Should complete in < 5 seconds (cached)
# First request might take 15-30 seconds (fetching from UPnShare)
```

**Browser Developer Tools:**

1. Open your Vercel site
2. Press `F12` → **Network** tab
3. Reload page
4. Check:
   - [ ] Page load time < 3 seconds
   - [ ] API calls complete successfully
   - [ ] No CORS errors
   - [ ] No 404 errors

**Lighthouse Audit:**

1. Press `F12` → **Lighthouse** tab
2. Run audit on Performance, Accessibility, Best Practices
3. Target scores:
   - Performance: > 70
   - Accessibility: > 80
   - Best Practices: > 80

---

### Step 3.3: Background Tasks Verification

**Time:** 15 minutes

**SSH to VPS and check PM2 logs:**

```bash
ssh admin@45.83.122.61

# View live logs
pm2 logs videohub-api

# Look for these messages:
# ✓ "Background refresh: Completed in XXXms"
# ✓ "Log cleanup completed: deleted X old logs"
# ✓ "Scheduled backup completed"
```

**Check database:**

```bash
# On VPS, check if logs table exists
# Install PostgreSQL client if not already:
sudo apt install postgresql-client

# Connect to Supabase database (use DATABASE_URL from .env)
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Run queries:
SELECT COUNT(*) FROM logs;
# Should return some rows

SELECT * FROM logs ORDER BY timestamp DESC LIMIT 5;
# Should show recent logs

\q
# Exit psql
```

**Verify backups:**

```bash
# Check backup directory
ls -lh /home/admin/web/api.server.porninblack.com/nodeapp/backups/

# Should see JSON files like:
# backup-2025-11-11T12-00-00-000Z.json
```

---

## Phase 4: Monitoring & Optimization

**Duration:** Ongoing  
**Objective:** Keep system healthy and performant

### Step 4.1: Setup Uptime Monitoring

**Time:** 15 minutes

**Use UptimeRobot (Free):**

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up for free account
3. Add monitors:
   - **Monitor 1:** `https://api.server.porninblack.com/api/ping` (every 5 min)
   - **Monitor 2:** `https://your-app.vercel.app` (every 5 min)
4. Setup email alerts for downtime

**Alternative: Healthchecks.io**

1. Go to [healthchecks.io](https://healthchecks.io)
2. Create check for API endpoint
3. Configure cron job to ping it

---

### Step 4.2: Configure Log Rotation

**Time:** 10 minutes

**On VPS:**

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/videohub-api
```

**Add this configuration:**

```
/home/admin/web/api.server.porninblack.com/nodeapp/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 admin admin
}
```

**Test logrotate:**

```bash
sudo logrotate -f /etc/logrotate.d/videohub-api
```

---

### Step 4.3: Setup PM2 Monitoring

**Time:** 10 minutes

**Install PM2 Plus (Optional - Free tier):**

```bash
# Register at pm2.io
pm2 link [secret-key] [public-key]

# Now you can monitor your app at pm2.io dashboard
```

**Or use built-in monitoring:**

```bash
# Real-time monitoring
pm2 monit

# Generate report
pm2 report
```

---

### Step 4.4: Setup Redis Cache (Optional)

**Time:** 20 minutes

**Get Upstash Redis (Free Tier):**

1. Go to [upstash.com](https://upstash.com)
2. Sign up and create database
3. Select region closest to your VPS
4. Get REST URL and Token

**Update .env on VPS:**

```bash
nano /home/admin/web/api.server.porninblack.com/nodeapp/.env

# Add:
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Save and restart
pm2 restart videohub-api
```

**Verify Redis is working:**

```bash
# Check logs
pm2 logs videohub-api --lines 50 | grep -i redis

# Should see: "Redis configured successfully" (not the warning)
```

---

### Step 4.5: Optimize VPS Performance

**Time:** 15 minutes

**Install and configure Node.js production optimizations:**

```bash
# On VPS, as root
ssh root@45.83.122.61

# Increase Node.js memory limit if needed
# Edit PM2 ecosystem file
su - admin
cd /home/admin/web/api.server.porninblack.com/nodeapp

# Create ecosystem.config.js
nano ecosystem.config.js
```

**Add this configuration:**

```javascript
module.exports = {
  apps: [{
    name: 'videohub-api',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=512'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

**Restart with new config:**

```bash
pm2 delete videohub-api
pm2 start ecosystem.config.js
pm2 save
```

---

## Troubleshooting Guide

### Issue 1: "502 Bad Gateway" on API Domain

**Symptoms:** `https://api.server.porninblack.com` returns 502 error

**Diagnosis:**

```bash
# Check if PM2 app is running
pm2 status

# Check app logs
pm2 logs videohub-api --err --lines 50

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

**Solutions:**

1. **App crashed:**
   ```bash
   pm2 restart videohub-api
   ```

2. **Port mismatch:**
   ```bash
   # Check PORT in .env matches Nginx proxy config
   cat /home/admin/web/api.server.porninblack.com/nodeapp/.env | grep PORT
   cat /home/admin/conf/web/api.server.porninblack.com/nginx.conf | grep proxy_pass
   ```

3. **Nginx not running:**
   ```bash
   sudo systemctl restart nginx
   ```

---

### Issue 2: CORS Errors in Browser Console

**Symptoms:** Browser shows: "Access to fetch at '...' has been blocked by CORS policy"

**Diagnosis:**

```bash
# Check ALLOWED_ORIGINS in .env
cat /home/admin/web/api.server.porninblack.com/nodeapp/.env | grep ALLOWED_ORIGINS
```

**Solutions:**

1. **Update ALLOWED_ORIGINS:**
   ```bash
   nano .env
   # Add your Vercel URL to ALLOWED_ORIGINS
   pm2 restart videohub-api
   ```

2. **Wildcard for preview deployments:**
   ```bash
   ALLOWED_ORIGINS=https://your-app-*.vercel.app,https://your-app.vercel.app
   ```

---

### Issue 3: Videos Not Loading

**Symptoms:** Frontend shows empty video list

**Diagnosis:**

```bash
# Test API directly
curl https://api.server.porninblack.com/api/videos

# Check for errors in response
```

**Solutions:**

1. **Missing API token:**
   ```bash
   nano .env
   # Verify UPNSHARE_API_TOKEN is set
   pm2 restart videohub-api
   ```

2. **Cache is empty:**
   ```bash
   # Trigger manual refresh
   curl -X POST https://api.server.porninblack.com/api/refresh/now
   
   # Wait 1 minute, then check again
   curl https://api.server.porninblack.com/api/videos | jq '.videos | length'
   ```

---

### Issue 4: Background Tasks Not Running

**Symptoms:** No refresh logs, backups not created

**Diagnosis:**

```bash
# Check PM2 logs
pm2 logs videohub-api --lines 100 | grep -i "background\|refresh\|backup"
```

**Solutions:**

1. **Serverless mode detected:**
   ```bash
   # Make sure VERCEL env var is NOT set
   cat .env | grep VERCEL
   # Should return nothing
   
   # If it exists, remove it:
   nano .env
   # Delete the VERCEL line
   pm2 restart videohub-api
   ```

2. **Check intervals:**
   ```bash
   # Verify intervals in .env
   cat .env | grep INTERVAL
   ```

---

### Issue 5: SSL Certificate Errors

**Symptoms:** "Your connection is not private" on api.server.porninblack.com

**Diagnosis:**

```bash
# Check SSL certificate
curl -vI https://api.server.porninblack.com 2>&1 | grep -i "ssl\|certificate"
```

**Solutions:**

1. **Renew Let's Encrypt certificate:**
   ```bash
   # As root
   v-add-letsencrypt-domain admin api.server.porninblack.com
   ```

2. **Check auto-renewal:**
   ```bash
   # Verify cron job exists
   sudo crontab -l | grep letsencrypt
   ```

---

### Issue 6: Out of Memory Errors

**Symptoms:** PM2 shows app as "errored", logs show "JavaScript heap out of memory"

**Solutions:**

1. **Increase memory limit:**
   ```bash
   # Edit ecosystem.config.js
   nano ecosystem.config.js
   
   # Increase max_memory_restart:
   max_memory_restart: '1G'
   
   # Add to env:
   NODE_OPTIONS: '--max-old-space-size=1024'
   
   # Restart
   pm2 reload ecosystem.config.js
   ```

2. **Monitor memory usage:**
   ```bash
   pm2 monit
   # Watch memory column
   ```

---

### Issue 7: Database Connection Errors

**Symptoms:** Logs show "Failed to connect to database"

**Solutions:**

1. **Verify DATABASE_URL:**
   ```bash
   # Test connection manually
   psql "$(cat .env | grep DATABASE_URL | cut -d '=' -f2)"
   ```

2. **Check Supabase IP allowlist:**
   - Supabase may require VPS IP whitelisting
   - Add `45.83.122.61` to allowed IPs in Supabase dashboard

---

## Rollback Plan

### If VPS Deployment Fails

**Option 1: Revert to Replit**

1. Keep using current Replit deployment
2. Point Vercel back to Replit API (if you configured it)

**Option 2: Use Vercel Serverless Functions (Temporary)**

1. Move critical endpoints to Vercel serverless functions
2. Accept timeout limitations for now
3. Retry VPS setup later

### If Frontend Deployment Fails

**Vercel Issues:**

1. Roll back to previous deployment in Vercel dashboard
2. Or temporarily use Replit webview

### Complete Rollback Steps

```bash
# On Vercel dashboard
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

# On VPS
pm2 stop videohub-api

# Update frontend .env.production to old API URL
# Redeploy to Vercel
```

---

## Post-Deployment Checklist

### Day 1: Immediate Checks

- [ ] Frontend loads on Vercel URL
- [ ] API responds on VPS
- [ ] Videos display correctly
- [ ] Video playback works
- [ ] No CORS errors in console
- [ ] PM2 app shows "online"
- [ ] Background refresh runs successfully

### Week 1: Monitoring

- [ ] Check PM2 logs daily
- [ ] Verify backups are being created
- [ ] Monitor VPS resource usage (CPU, RAM, disk)
- [ ] Check uptime monitor reports
- [ ] Test from different devices/locations

### Month 1: Optimization

- [ ] Review API response times
- [ ] Optimize slow endpoints
- [ ] Review and clean up logs
- [ ] Check backup sizes and retention
- [ ] Consider adding Redis if not already done

---

## Maintenance Schedule

### Daily (Automated)

- Log cleanup (via background task)
- Video cache refresh (every 5 minutes)

### Weekly (Manual - 10 minutes)

```bash
# SSH to VPS
ssh admin@45.83.122.61

# Check PM2 status
pm2 status

# Review logs for errors
pm2 logs videohub-api --err --lines 50

# Check disk space
df -h

# Check memory usage
free -h
```

### Monthly (Manual - 30 minutes)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /home/admin/web/api.server.porninblack.com/nodeapp
npm outdated
npm update

# Restart app
pm2 restart videohub-api

# Review and download backups
ls -lh backups/

# Clean old backups (older than 30 days)
find backups/ -name "*.json" -mtime +30 -delete
```

### Quarterly (Manual - 1 hour)

- Review and optimize database queries
- Audit SSL certificates
- Review security updates
- Load test API endpoints
- Consider upgrading VPS resources if needed

---

## Performance Benchmarks

### Expected Metrics

**API Response Times:**
- `/api/ping`: < 50ms
- `/api/videos` (cached): < 500ms
- `/api/videos` (fresh): 15-30 seconds (first time)
- `/api/videos/:id`: < 100ms

**Frontend Load Times:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Total Page Load: < 4s

**VPS Resource Usage:**
- CPU: 10-30% average
- RAM: 500MB - 1GB
- Disk I/O: < 20 MB/s

---

## Security Best Practices

### Implemented

- [x] HTTPS on both frontend and backend
- [x] Environment variables for secrets
- [x] CORS properly configured
- [x] SSH access restricted
- [x] Firewall enabled on VPS
- [x] Let's Encrypt SSL auto-renewal

### Recommended Additional Steps

```bash
# Install and configure UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8083/tcp  # HestiaCP
sudo ufw enable

# Install fail2ban (prevent brute force)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Setup automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Support & Resources

### Documentation

- HestiaCP: https://docs.hestiacp.com
- Vercel: https://vercel.com/docs
- PM2: https://pm2.keymetrics.io/docs
- Supabase: https://supabase.com/docs

### Community

- HestiaCP Forum: https://forum.hestiacp.com
- Vercel Community: https://github.com/vercel/vercel/discussions

### Monitoring Tools

- UptimeRobot: https://uptimerobot.com
- PM2 Plus: https://pm2.io
- Upstash Redis: https://upstash.com

---

## Success Criteria

Your deployment is successful when:

✅ Frontend loads from Vercel CDN globally  
✅ API responds from your VPS with < 1s latency  
✅ Videos load and play without errors  
✅ Background tasks run automatically (refresh, cleanup, backups)  
✅ No timeout errors on video data fetching  
✅ HTTPS works on both frontend and backend  
✅ Uptime > 99.5% over 30 days  
✅ Zero cost deployment (using free tiers)  

---

## Estimated Total Time

- **Phase 1 (VPS):** 2-3 hours
- **Phase 2 (Vercel):** 1-2 hours  
- **Phase 3 (Testing):** 1 hour
- **Phase 4 (Optimization):** Ongoing

**Total initial setup:** 4-6 hours  
**Monthly maintenance:** ~1 hour

---

**Good luck with your deployment! 🚀**

*Last updated: 2025-11-11*
