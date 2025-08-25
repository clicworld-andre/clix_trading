#!/bin/bash

echo "🔍 Checking for all possible API endpoints being called..."
echo

echo "📄 Files that import from service.ts:"
grep -r "from.*service" . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v debug-auth.js

echo
echo "📡 All fetch() calls in components:"
grep -r "fetch(" . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v debug-auth.js | grep -v test-

echo
echo "🔑 JWT token usage patterns:"
grep -r "jwt\|JWT\|Bearer" . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v debug-auth.js | head -10

echo
echo "🌐 All API base URLs defined:"
grep -r "BASE_URL\|base_url\|baseUrl" . --include="*.ts" --include="*.tsx" | grep -v node_modules

echo
echo "📋 LocalStorage token keys:"
grep -r "localStorage.*jwt\|localStorage.*token" . --include="*.ts" --include="*.tsx" | grep -v node_modules | head -10
