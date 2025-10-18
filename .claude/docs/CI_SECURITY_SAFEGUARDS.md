# CI/CD Security Safeguards

This document outlines automated security safeguards to prevent accidental secret exposure and maintain security best practices.

---

## Table of Contents
1. [Pre-commit Hooks](#pre-commit-hooks)
2. [GitHub Actions Security Checks](#github-actions-security-checks)
3. [ESLint Security Rules](#eslint-security-rules)
4. [Secret Scanning](#secret-scanning)
5. [Implementation Guide](#implementation-guide)

---

## Pre-commit Hooks

Pre-commit hooks run locally before each commit to catch issues early.

### Setup with Husky

**1. Install Husky:**
```bash
npm install --save-dev husky
npx husky init
```

**2. Create pre-commit hook:**
```bash
# .husky/pre-commit
#!/bin/sh

# Check for .env.local in staging area
if git diff --cached --name-only | grep -q "\.env\.local"; then
  echo "❌ ERROR: Attempting to commit .env.local"
  echo "This file contains secrets and should never be committed."
  echo "Run: git reset HEAD .env.local"
  exit 1
fi

# Check for any .env files except .env.example
if git diff --cached --name-only | grep -E "\.env$|\.env\..*$" | grep -v "\.env\.example"; then
  echo "❌ ERROR: Attempting to commit .env file"
  echo "Only .env.example should be committed."
  exit 1
fi

# Check for hardcoded secrets in staged files
if git diff --cached -p | grep -iE "(CLERK_SECRET_KEY|GOOGLE_GENERATIVE_AI_API_KEY|SERPAPI_KEY|PIPECAT_SERVER_SECRET)=.{10,}"; then
  echo "❌ ERROR: Hardcoded secret detected in staged files"
  echo "Remove secrets from code and use environment variables instead."
  exit 1
fi

# Check for NEXT_PUBLIC_ misuse with sensitive keywords
if git diff --cached -p | grep -iE "NEXT_PUBLIC_(SECRET|KEY|PASSWORD|TOKEN|AUTH)"; then
  echo "⚠️  WARNING: Suspicious NEXT_PUBLIC_ variable detected"
  echo "NEXT_PUBLIC_ variables are exposed to the browser."
  echo "Ensure this is intentional and the value is safe to expose."
  read -p "Continue commit? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "✅ Pre-commit security checks passed"
```

**3. Make executable:**
```bash
chmod +x .husky/pre-commit
```

### Setup with Lint-staged (Alternative)

**1. Install:**
```bash
npm install --save-dev lint-staged
```

**2. Configure in package.json:**
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*": [
      "scripts/check-secrets.sh"
    ]
  }
}
```

**3. Create secret checker script:**
```bash
# scripts/check-secrets.sh
#!/bin/bash

# Check if file is .env.local
if [[ "$1" == *".env.local"* ]]; then
  echo "❌ ERROR: .env.local should not be committed"
  exit 1
fi

# Check for hardcoded secrets
if grep -iE "(sk_test_|sk_live_|AIza[0-9A-Za-z_-]{35})" "$1"; then
  echo "❌ ERROR: Hardcoded secret detected in $1"
  exit 1
fi

exit 0
```

---

## GitHub Actions Security Checks

### 1. Secret Scanning Workflow

Create `.github/workflows/security-scan.yml`:

```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  secret-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for scanning

      # Check for .env.local in repository
      - name: Check for .env.local
        run: |
          if git ls-files | grep -q "\.env\.local"; then
            echo "❌ ERROR: .env.local found in repository"
            exit 1
          fi
          echo "✅ No .env.local found"

      # Check for hardcoded secrets in code
      - name: Check for hardcoded secrets
        run: |
          if git grep -iE "(sk_test_|sk_live_|AIza[0-9A-Za-z_-]{35}|[0-9a-f]{64})" -- "*.ts" "*.tsx" "*.js" "*.jsx"; then
            echo "❌ ERROR: Potential hardcoded secrets found"
            exit 1
          fi
          echo "✅ No hardcoded secrets detected"

      # Trufflehog for secret scanning
      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug --only-verified

      # Check NEXT_PUBLIC_ usage
      - name: Check NEXT_PUBLIC_ usage
        run: |
          # Define allowed NEXT_PUBLIC_ variables
          ALLOWED_PUBLIC_VARS=(
            "NEXT_PUBLIC_CONVEX_URL"
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
          )

          # Find all NEXT_PUBLIC_ variables in code
          FOUND_VARS=$(git grep -h "NEXT_PUBLIC_" -- "*.ts" "*.tsx" "*.js" "*.jsx" | grep -oE "NEXT_PUBLIC_[A-Z_]+" | sort -u)

          # Check each found variable
          for var in $FOUND_VARS; do
            if [[ ! " ${ALLOWED_PUBLIC_VARS[@]} " =~ " ${var} " ]]; then
              echo "⚠️  WARNING: Unapproved NEXT_PUBLIC_ variable: $var"
              echo "Add to ALLOWED_PUBLIC_VARS if this is intentional"
            fi
          done

  dependency-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # npm audit for known vulnerabilities
      - name: Run npm audit
        run: npm audit --audit-level=moderate

      # Check for outdated packages
      - name: Check outdated packages
        run: npm outdated || true
```

### 2. Environment Variable Validation

Create `.github/workflows/env-validation.yml`:

```yaml
name: Environment Variable Validation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  validate-env:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Validate .env.example has all required variables
      - name: Validate .env.example
        run: |
          REQUIRED_VARS=(
            "NEXT_PUBLIC_CONVEX_URL"
            "CONVEX_DEPLOYMENT"
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
            "CLERK_SECRET_KEY"
            "CLERK_JWT_ISSUER_DOMAIN"
            "GOOGLE_GENERATIVE_AI_API_KEY"
            "PIPECAT_SERVER_SECRET"
            "SERPAPI_KEY"
          )

          for var in "${REQUIRED_VARS[@]}"; do
            if ! grep -q "^$var=" .env.example; then
              echo "❌ ERROR: Missing $var in .env.example"
              exit 1
            fi
          done

          echo "✅ All required variables present in .env.example"

      # Ensure no real values in .env.example
      - name: Check .env.example has placeholders
        run: |
          # Check for real-looking Clerk keys
          if grep -E "pk_test_[A-Za-z0-9]{40,}|sk_test_[A-Za-z0-9]{40,}" .env.example; then
            echo "❌ ERROR: Real Clerk keys found in .env.example"
            exit 1
          fi

          # Check for real-looking Google API keys
          if grep -E "AIza[0-9A-Za-z_-]{35}" .env.example; then
            echo "❌ ERROR: Real Google API key found in .env.example"
            exit 1
          fi

          # Check for convex.cloud URLs (should be placeholder)
          if grep -E "https://[a-z-]+-[a-z-]+-[0-9]+\.convex\.cloud" .env.example; then
            echo "❌ ERROR: Real Convex URL found in .env.example"
            exit 1
          fi

          echo "✅ .env.example uses placeholder values"
```

---

## ESLint Security Rules

### 1. Install ESLint Security Plugin

```bash
npm install --save-dev eslint-plugin-security
```

### 2. Update .eslintrc.json

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:security/recommended"
  ],
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-possible-timing-attacks": "warn",

    // Custom rules for this project
    "no-console": ["warn", { "allow": ["warn", "error"] }],

    // Prevent hardcoded secrets (basic check)
    "no-secrets/no-secrets": ["error", {
      "patterns": [
        "sk_test_",
        "sk_live_",
        "pk_live_",
        "AIza[0-9A-Za-z_-]{35}",
        "[0-9a-f]{64}"
      ]
    }]
  }
}
```

### 3. Create Custom ESLint Rule for NEXT_PUBLIC_

Create `.eslintrc.js`:

```javascript
module.exports = {
  // ... other config
  rules: {
    // Custom rule to check NEXT_PUBLIC_ usage
    'next-public-check': ['error', {
      allowed: [
        'NEXT_PUBLIC_CONVEX_URL',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
      ]
    }]
  }
};
```

---

## Secret Scanning

### GitHub Secret Scanning (Native)

GitHub automatically scans for known secret formats. To enable:

1. Go to repository Settings → Security → Code security and analysis
2. Enable "Secret scanning"
3. Enable "Push protection" to prevent commits with secrets

### Additional Tools

#### 1. TruffleHog (Local)

```bash
# Install
brew install trufflesecurity/trufflehog/trufflehog

# Scan repository
trufflehog git file://. --only-verified

# Scan before commit
trufflehog git file://. --since-commit HEAD
```

#### 2. GitGuardian (Service)

Free for public repos:
1. Install GitGuardian GitHub App
2. Configure in repository settings
3. Monitors all commits for secrets

#### 3. git-secrets (AWS)

```bash
# Install
brew install git-secrets

# Setup in repo
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'sk_test_[A-Za-z0-9]+'
git secrets --add 'sk_live_[A-Za-z0-9]+'
git secrets --add 'AIza[0-9A-Za-z_-]{35}'
```

---

## Implementation Guide

### Quick Start (Recommended)

**1. Add pre-commit hooks:**
```bash
npm install --save-dev husky
npx husky init
```

Copy the pre-commit hook from above to `.husky/pre-commit`.

**2. Enable GitHub secret scanning:**
- Go to repository Settings → Security
- Enable "Secret scanning" and "Push protection"

**3. Add GitHub Actions:**
Copy the workflow files above to `.github/workflows/`.

**4. Update ESLint:**
```bash
npm install --save-dev eslint-plugin-security
```

Update `.eslintrc.json` with security rules.

### Full Implementation Checklist

- [ ] Husky pre-commit hooks installed
- [ ] Pre-commit script checks for .env files
- [ ] Pre-commit script checks for hardcoded secrets
- [ ] GitHub Actions secret scanning workflow added
- [ ] GitHub Actions env validation workflow added
- [ ] GitHub secret scanning enabled
- [ ] Push protection enabled
- [ ] ESLint security plugin installed
- [ ] ESLint configured with security rules
- [ ] TruffleHog or similar tool installed locally
- [ ] Team trained on security practices
- [ ] Documentation updated
- [ ] CI/CD pipeline validates environment variables
- [ ] Automated alerts for security issues configured

### Testing Your Setup

**Test pre-commit hooks:**
```bash
# Try to commit .env.local (should fail)
touch .env.local
git add .env.local
git commit -m "test"  # Should be blocked

# Try to commit hardcoded secret (should fail)
echo 'const key = "sk_test_1234567890"' > test.ts
git add test.ts
git commit -m "test"  # Should be blocked
```

**Test GitHub Actions:**
```bash
# Create a branch and push
git checkout -b test-security-scan
git push origin test-security-scan

# Check Actions tab for workflow results
```

---

## Maintenance

### Weekly
- [ ] Review security alerts from GitHub
- [ ] Check CI/CD logs for warnings

### Monthly
- [ ] Update security scanning tools
- [ ] Review and update allowed NEXT_PUBLIC_ variables list
- [ ] Audit access to secrets in deployment platforms

### Quarterly
- [ ] Review all secret patterns in hooks
- [ ] Update ESLint security rules
- [ ] Team security training refresher
- [ ] Test disaster recovery (key rotation drill)

---

## Additional Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [TruffleHog Documentation](https://github.com/trufflesecurity/trufflehog)
- [Husky Documentation](https://typicode.github.io/husky/)
- [ESLint Security Plugin](https://github.com/eslint-community/eslint-plugin-security)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
