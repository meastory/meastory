#!/bin/bash

echo "🔍 Me A Story - Build Validation Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    elif [ "$status" = "error" ]; then
        echo -e "${RED}❌ $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Track overall status
OVERALL_STATUS="success"

# Check if we're in the right directory
if [ ! -f "apps/read/package.json" ]; then
    print_status "error" "Not in project root directory. Run from /meastory/"
    exit 1
fi

print_status "info" "Starting build validation..."

# 1. Check for uncommitted changes
echo ""
print_status "info" "1. Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_status "warning" "You have uncommitted changes. Consider committing them first."
else
    print_status "success" "Working directory is clean"
fi

# 2. Check environment variables
echo ""
print_status "info" "2. Checking environment variables..."
if [ -f "apps/read/.env" ]; then
    if grep -q "VITE_SUPABASE_URL" apps/read/.env && grep -q "VITE_SUPABASE_ANON_KEY" apps/read/.env; then
        print_status "success" "Environment variables configured"
    else
        print_status "error" "Missing required environment variables"
        OVERALL_STATUS="error"
    fi
else
    print_status "error" "Environment file (apps/read/.env) not found"
    OVERALL_STATUS="error"
fi

# 3. Run TypeScript type checking
echo ""
print_status "info" "3. Running TypeScript type check..."
if (cd apps/read && npx tsc --noEmit --skipLibCheck) 2>/dev/null; then
    print_status "success" "TypeScript compilation successful"
else
    print_status "error" "TypeScript errors found"
    OVERALL_STATUS="error"
fi

# 4. Test production build
echo ""
print_status "info" "4. Testing production build..."
if (cd apps/read && npm run build) >/dev/null 2>&1; then
    # Check bundle size
    if [ -f "apps/read/dist/assets/index-*.js" ]; then
        BUNDLE_SIZE=$(ls -lh apps/read/dist/assets/index-*.js | awk '{print $5}')
        print_status "success" "Production build successful (Bundle: $BUNDLE_SIZE)"
    else
        print_status "success" "Production build successful"
    fi
else
    print_status "error" "Production build failed"
    OVERALL_STATUS="error"
fi

# 5. Check for common issues
echo ""
print_status "info" "5. Checking for common issues..."

# Check for console.log statements
if grep -r "console\." apps/read/src --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    print_status "warning" "Console statements found in production code"
else
    print_status "success" "No console statements in production code"
fi

# Check for TODO comments
if grep -r "TODO\|FIXME" apps/read/src --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    print_status "warning" "TODO/FIXME comments found"
else
    print_status "success" "No TODO/FIXME comments"
fi

# 6. Summary
echo ""
echo "========================================"
if [ "$OVERALL_STATUS" = "success" ]; then
    print_status "success" "🎉 All checks passed! Ready to commit and deploy."
    echo ""
    print_status "info" "Next steps:"
    echo "  1. Commit your changes: git add . && git commit -m 'feat: your feature'"
    echo "  2. Push to deploy: git push"
    echo "  3. Monitor build: https://app.netlify.com/sites/read-meastory"
else
    print_status "error" "❌ Validation failed. Please fix the issues above before committing."
    exit 1
fi

echo ""
