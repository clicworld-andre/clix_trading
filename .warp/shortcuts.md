# CLIX Trading Platform - Warp Command Shortcuts

## 🚀 Quick Start Commands

### Development Server
```bash
# Start development server (runs on port 3000 in background)
npm run dev &

# Check if server is running
lsof -i :3000

# Stop development server
lsof -ti:3000 | xargs kill -9

# Restart development server
lsof -ti:3000 | xargs kill -9 && npm run dev &
```

### Build & Deploy
```bash
# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Clean build cache
rm -rf .next node_modules/.cache
```

## 📊 Project Navigation

### Key Directories
```bash
# Navigate to main app directory
cd app/

# Navigate to components
cd components/

# Navigate to LC (Letter of Credit) components
cd components/lc/

# Navigate to API routes
cd app/api/

# Navigate to lib utilities
cd lib/

# Navigate to documentation
cd docs/
```

### File Shortcuts
```bash
# Open main page
open app/page.tsx

# Open main layout
open app/layout.tsx

# Open LC dashboard component
open components/lc/lc-dashboard.tsx

# Open LC creation panel
open components/lc/lc-creation-panel.tsx

# Open modern chat view
open components/modern-chat-view.tsx

# Open package.json
open package.json

# Open tailwind config
open tailwind.config.js
```

## 🔧 Development Tools

### Testing Commands
```bash
# Test authentication
node test-auth-fix.js

# Test wallet connection
node test-wallet-connection.js

# Test Matrix signin
node test-signin.js

# Test service endpoints
node test-service.js

# Check API endpoints
bash check-endpoints.sh

# Verify authorization fix
node verify-authorization-fix.js

# Verify wallet fix
node verify-wallet-fix.js
```

### Debug Commands
```bash
# Debug authorization
node debug-authorization.js

# Debug authentication
node debug-auth.js

# Debug Matrix calls
node debug-matrix-calls.js

# Debug LinkOTC
node debug-linkotc.js
```

### Log Management
```bash
# View development logs
tail -f dev.log

# View server logs
tail -f dev_server.log

# View clix trading logs
tail -f clix-trading.log

# View all logs
tail -f *.log

# Clear logs
> dev.log && > dev_server.log && > clix-trading.log
```

## 🌐 Web & API Access

### Application URLs
```bash
# Main application
open http://localhost:3000

# LC Dashboard (after login)
open http://localhost:3000/#lc-dashboard

# Admin panel
open http://localhost:3000/admin

# API documentation
open "API Docs/Clic Wallet API doc.pdf"
```

### API Endpoints Testing
```bash
# Test LC list endpoint
curl -X GET http://localhost:3000/api/lc/list

# Test LC creation endpoint
curl -X POST http://localhost:3000/api/lc/create \
  -H "Content-Type: application/json" \
  -d '{"title": "Test LC"}'

# Test user endpoint
curl -X GET http://localhost:3000/api/users

# Test health check
curl http://localhost:3000/api/health
```

## 📋 Letter of Credit (LC) Workflows

### LC Management
```bash
# Navigate to LC components
cd components/lc/

# View LC types
cat lib/lc/types.ts

# View LC service
cat lib/lc/lc-service.ts

# Check LC API routes
ls app/api/lc/

# Open LC creation form
open components/lc/lc-creation-panel.tsx

# Open LC dashboard
open components/lc/lc-dashboard.tsx
```

### LC Development Tasks
```bash
# Add new LC component
touch components/lc/new-lc-component.tsx

# Add new LC API route
mkdir -p app/api/lc/new-endpoint && touch app/api/lc/new-endpoint/route.ts

# Update LC types
open lib/lc/types.ts

# Test LC functionality
open http://localhost:3000 && echo "Navigate to LC tab"
```

## 🔗 Blockchain & Integration

### Stellar Integration
```bash
# View Stellar trading service
open lib/stellar-trading.ts

# Check Stellar API routes
ls app/api/stellar/

# View Soroban integration
open lib/soroban-integration.ts

# Test Stellar endpoints
curl http://localhost:3000/api/stellar/getTokens
```

### Matrix Protocol
```bash
# View Matrix client
open lib/matrix-client.ts

# View Matrix context
open lib/matrix-context.tsx

# View Matrix utilities
open lib/matrix-utils.ts

# View chat components
open components/modern-chat-view.tsx
```

## 🎨 UI/UX Development

### Component Development
```bash
# Navigate to UI components
cd components/ui/

# View theme provider
open components/theme-provider.tsx

# View site header
open components/site-header.tsx

# Check Tailwind config
open tailwind.config.js

# View global styles
open app/globals.css
```

### Design System
```bash
# View shadcn/ui config
open components.json

# Add new UI component
npx shadcn-ui@latest add <component-name>

# View color scheme (CLIX brand colors)
grep -n "#F08C28\|#FFBF3F\|#A64B2A" **/*.css **/*.tsx
```

## 📦 Package Management

### Dependencies
```bash
# Install dependencies
npm install

# Update dependencies
npm update

# Add new dependency
npm install <package-name>

# Add dev dependency
npm install -D <package-name>

# Remove dependency
npm uninstall <package-name>

# Check outdated packages
npm outdated

# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix
```

### Package Scripts
```bash
# View all available scripts
npm run

# Run postinstall script
npm run postinstall

# Check package info
npm list --depth=0
```

## 🔍 Code Search & Navigation

### Find Files
```bash
# Find TypeScript files
find . -name "*.ts" -o -name "*.tsx" | head -20

# Find components
find components/ -name "*.tsx"

# Find API routes
find app/api/ -name "route.ts"

# Find LC related files
find . -path "./node_modules" -prune -o -name "*lc*" -print
```

### Search Code
```bash
# Search for LC related code
grep -r "Letter of Credit" --include="*.ts" --include="*.tsx" .

# Search for Matrix integration
grep -r "matrix" --include="*.ts" --include="*.tsx" components/ lib/

# Search for Stellar integration
grep -r "stellar" --include="*.ts" --include="*.tsx" .

# Search for API endpoints
grep -r "api/" --include="*.ts" --include="*.tsx" .
```

## 🔄 Git Workflow

### Daily Git Commands
```bash
# Quick status
git status --short

# Stage all changes
git add .

# Commit with message
git commit -m "Your commit message"

# Push to main
git push origin main

# Pull latest changes
git pull origin main

# View recent commits
git log --oneline -10

# View changes
git diff

# Create new branch
git checkout -b feature/new-feature
```

### Git Shortcuts
```bash
# Save and commit (function)
save() { git add . && git commit -m "$1"; }

# Usage: save "Your commit message"
# Push after save
save-push() { save "$1" && git push; }
```

## 🛠️ Advanced Development

### Database & Storage
```bash
# Check for database files
find . -name "*.db" -o -name "*.sqlite*"

# View environment variables
cat .env.local 2>/dev/null || echo "No .env.local found"

# Check for storage directories
ls -la | grep -E "storage|data|db"
```

### Performance Monitoring
```bash
# Monitor Next.js build
time npm run build

# Check bundle size
du -sh .next/

# Monitor memory usage
top -p $(pgrep -f "next")

# Check port usage
netstat -tulpn | grep :3000
```

### Debugging Tools
```bash
# Enable Next.js debug mode
DEBUG=* npm run dev

# Check Node.js version
node --version

# Check npm version
npm --version

# Check TypeScript version
npx tsc --version
```

---

## 💡 Pro Tips

1. **Always run dev server in background**: `npm run dev &`
2. **Use tail -f for real-time logs**: `tail -f *.log`
3. **Quick server restart**: `lsof -ti:3000 | xargs kill -9 && npm run dev &`
4. **Search efficiently**: Use `grep -r "pattern" --include="*.tsx" .`
5. **Git shortcuts**: Create functions for common git operations
6. **Component navigation**: Use `cd components/lc/` for LC development
7. **API testing**: Use curl commands to test endpoints quickly
8. **Clean builds**: Regular `rm -rf .next node_modules/.cache`

## 🔗 External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Matrix Protocol](https://matrix.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/primitives)
- [shadcn/ui](https://ui.shadcn.com/)

---

*These shortcuts are optimized for the CLIX Trading Platform development workflow.*