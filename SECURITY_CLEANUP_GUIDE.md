# Security Cleanup Guide

## Overview

This guide provides instructions for removing sensitive files from Git history and preventing future secret exposure across all repositories.

## Issues Addressed

### Current Repository: `hands-off-your-keyboard`

1. ✅ **Google API Key** in `test-gemini-search.js` - FIXED (key revoked, new key in use)
2. ✅ **Python venv directory** with test credentials - FIXED (removed from tracking)
3. ✅ **API keys in .env files** - FIXED (updated with new keys)

### Other Repository: `personal-assistant`

8. ⚠️ **JSON Web Token** in `frontend/.env` - Requires attention (see instructions below)

### Other Repository: `orange1.0`

3. ⚠️ **Username Password** in `orange-api/venv/` - Requires attention (see instructions below)

---

## Step 1: Commit Current Changes (This Repo)

First, commit the changes that remove venv from tracking and update security settings:

```bash
git add .gitignore CLAUDE.md
git commit -m "security: remove venv from tracking and enhance API key security

- Remove voice_agent/venv/ from git tracking (contains test credentials from packages)
- Add test-*.js and test-*.ts patterns to .gitignore
- Update CLAUDE.md with API key security best practices
- Prevent future hardcoded credential exposure

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Step 2: Clean Git History (This Repo)

The venv directory and test files still exist in git history. To completely remove them:

### Option A: Using BFG Repo-Cleaner (Recommended - Faster)

1. **Install BFG**:
   ```bash
   brew install bfg  # macOS
   # Or download from: https://rtyley.github.io/bfg-repo-cleaner/
   ```

2. **Create a fresh clone** (for safety):
   ```bash
   cd ~/Desktop
   git clone --mirror https://github.com/seanchiuai/hands-off-your-keyboard.git
   cd hands-off-your-keyboard.git
   ```

3. **Remove sensitive directories**:
   ```bash
   bfg --delete-folders venv
   bfg --delete-files test-gemini-search.js
   ```

4. **Clean up and push**:
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

### Option B: Using git filter-repo (More Control)

1. **Install git-filter-repo**:
   ```bash
   brew install git-filter-repo  # macOS
   ```

2. **Create backup** (important!):
   ```bash
   cd /Users/seanchiu/Desktop/hands-off-your-keyboard
   git clone . ../hands-off-your-keyboard-backup
   ```

3. **Remove venv directory from history**:
   ```bash
   git filter-repo --path voice_agent/venv --invert-paths
   ```

4. **Remove test file from history**:
   ```bash
   git filter-repo --path test-gemini-search.js --invert-paths
   ```

5. **Force push to remote**:
   ```bash
   git push origin --force --all
   ```

### Option C: Simple Approach (If you don't care about history)

If you don't need to preserve git history:

1. **Delete .git and start fresh**:
   ```bash
   cd /Users/seanchiu/Desktop/hands-off-your-keyboard
   rm -rf .git
   git init
   git add .
   git commit -m "chore: clean repository start"
   git remote add origin https://github.com/seanchiuai/hands-off-your-keyboard.git
   git push -u origin main --force
   ```

**⚠️ Warning**: This approach deletes all commit history!

---

## Step 3: Fix `personal-assistant` Repository

The `frontend/.env` file in your `personal-assistant` repo contains a JWT token.

### Immediate Actions

1. **Navigate to the repository**:
   ```bash
   cd ~/path/to/personal-assistant
   ```

2. **Verify the issue**:
   ```bash
   git log --all -- frontend/.env
   ```

3. **Check if .env is tracked**:
   ```bash
   git ls-files | grep '\.env$'
   ```

4. **If .env is tracked, remove it**:
   ```bash
   git rm --cached frontend/.env
   ```

5. **Update .gitignore**:
   ```bash
   echo -e "\n# Environment files\n.env\n.env.*\n!.env.example" >> .gitignore
   ```

6. **Commit the changes**:
   ```bash
   git add .gitignore
   git commit -m "security: remove .env from tracking and update .gitignore"
   git push
   ```

7. **Rotate the JWT secret**:
   - If this is a JWT signing secret, generate a new one
   - Update your production environment with the new secret
   - The old JWT secret in git history is now invalid

### Clean History (personal-assistant)

Use the same methods as Step 2 above, but target `frontend/.env`:

```bash
# Using BFG
bfg --delete-files .env

# Using git-filter-repo
git filter-repo --path frontend/.env --invert-paths

# Then force push
git push origin --force --all
```

---

## Step 4: Fix `orange1.0` Repository

The `orange-api/venv/` directory contains test credentials from Python packages.

### Immediate Actions

1. **Navigate to the repository**:
   ```bash
   cd ~/path/to/orange1.0
   ```

2. **Check if venv is tracked**:
   ```bash
   git ls-files | grep 'venv/'
   ```

3. **Remove venv from tracking**:
   ```bash
   git rm -r --cached orange-api/venv/
   ```

4. **Update .gitignore**:
   ```bash
   cat >> .gitignore << 'EOF'

# Python virtual environments
venv/
env/
ENV/
*.pyc
__pycache__/
EOF
   ```

5. **Commit the changes**:
   ```bash
   git add .gitignore
   git commit -m "security: remove Python venv from tracking"
   git push
   ```

6. **Clean history** (same as Step 2):
   ```bash
   # Using BFG
   bfg --delete-folders venv

   # Using git-filter-repo
   git filter-repo --path orange-api/venv --invert-paths

   # Force push
   git push origin --force --all
   ```

---

## Step 5: Prevent Future Issues

### A. Create `.gitignore` Template

Add this to all your projects:

```gitignore
# Environment Variables
.env
.env.*
!.env.example

# Python
venv/
env/
ENV/
*.pyc
__pycache__/
*.pyo
*.pyd

# Node.js
node_modules/
.env.local
.env.*.local

# Test files with potential credentials
test-*.js
test-*.ts
scratch.*

# IDE
.vscode/
.idea/
.cursor/

# OS
.DS_Store
Thumbs.db
```

### B. Use Pre-commit Hooks

Install `gitleaks` to scan for secrets before commits:

```bash
# Install gitleaks
brew install gitleaks

# Add to .git/hooks/pre-commit
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
gitleaks protect --staged --verbose
EOF

chmod +x .git/hooks/pre-commit
```

### C. GitHub Secret Scanning

Enable GitHub's secret scanning alerts:

1. Go to repository Settings → Security & Analysis
2. Enable "Secret scanning"
3. Enable "Push protection" (prevents pushes with secrets)

### D. Use Environment Variable Managers

Instead of `.env` files in repos:

- **Local Development**: Use `.env.local` (always gitignored)
- **Production**: Use platform-specific secrets:
  - Vercel: Environment Variables in dashboard
  - Convex: `npx convex env set KEY value`
  - AWS: Parameter Store / Secrets Manager
  - Railway: Environment variables in dashboard

---

## Step 6: Verify Cleanup

After cleaning history, verify the secrets are gone:

### Check Git History

```bash
# Search for API keys
git log --all -S "AIzaSy" --source --all

# Search for specific filenames
git log --all --full-history -- "**/venv/**"
git log --all --full-history -- "**/.env"

# If these return no results, you're clean!
```

### Check GitHub Security Alerts

1. Go to repository → Security → Secret scanning alerts
2. All alerts should show as "Resolved" or "Revoked"
3. If they persist, the secrets may still be in history

---

## Step 7: Notify Collaborators

If you force-push to shared repositories:

```bash
# Send this message to your team:
```

**Important: Repository history has been rewritten**

I've cleaned sensitive data from git history. Please update your local clone:

```bash
# Backup any local changes first!
git fetch origin
git reset --hard origin/main
# Or clone fresh:
git clone https://github.com/yourusername/repo.git
```

---

## Checklist

### For `hands-off-your-keyboard` repo:
- [x] Remove venv from tracking
- [x] Update .gitignore
- [x] Update API keys to new values
- [x] Add security documentation
- [ ] Commit changes
- [ ] Clean git history (optional, since keys are revoked)
- [ ] Force push (if history cleaned)

### For `personal-assistant` repo:
- [ ] Remove .env from tracking
- [ ] Update .gitignore
- [ ] Rotate JWT secret
- [ ] Commit changes
- [ ] Clean git history
- [ ] Force push

### For `orange1.0` repo:
- [ ] Remove venv from tracking
- [ ] Update .gitignore
- [ ] Commit changes
- [ ] Clean git history
- [ ] Force push

---

## Important Notes

1. **Force Pushing**: Force pushing rewrites history. Notify all collaborators.

2. **Revoke All Exposed Secrets**: Even after cleaning history, the secrets were exposed:
   - ✅ Google API Key: Already revoked and replaced
   - ⚠️ JWT Secret: Needs rotation
   - ⚠️ Any other credentials in venv: These are likely test credentials from packages (false positives)

3. **venv Credentials**: The credentials in Python venv directories are typically from:
   - Test files in installed packages (e.g., `httpx`, `pydantic`, `aiohttp`)
   - These are NOT your actual secrets
   - But they trigger GitHub's scanners as false positives
   - Solution: Never commit venv directories

4. **Backup First**: Always create backups before rewriting git history

5. **Monitor**: Enable GitHub secret scanning to catch future issues

---

## Resources

- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Removing Sensitive Data from Git](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
