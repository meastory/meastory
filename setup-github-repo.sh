#!/bin/bash

# Quick GitHub Repository Setup for Me A Story

echo "🚀 Setting up GitHub Repository for Me A Story"
echo "============================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gh CLI is authenticated
if ! gh auth status &> /dev/null; then
    print_warning "GitHub CLI not authenticated."
    echo
    echo "Please authenticate with one of these methods:"
    echo "1. Run: gh auth login --web"
    echo "2. Run: gh auth login --with-token (then paste your token)"
    echo "3. Or create the repository manually at https://github.com/new"
    echo
    read -p "Have you authenticated GitHub CLI? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Please authenticate GitHub CLI first, then run this script again."
        exit 1
    fi
fi

# Create repository
print_status "Creating GitHub repository..."

REPO_NAME="meastory"
REPO_DESCRIPTION="Me A Story - Live video storytelling for families"

# Check if repository already exists (try both usernames)
if gh repo view "meastory/$REPO_NAME" &> /dev/null; then
    print_warning "Repository 'meastory/$REPO_NAME' already exists"
    
    # Check if remote is already set
    if git remote get-url origin &> /dev/null; then
        print_warning "Git remote 'origin' already exists"
        print_status "Repository setup appears to be complete"
        exit 0
    else
        print_status "Setting up git remote for existing repository..."
        git remote add origin "https://github.com/meastory/$REPO_NAME.git"
    fi
else
    print_status "Creating new repository: $REPO_NAME"
    gh repo create "$REPO_NAME" --public --description "$REPO_DESCRIPTION"
    
    if [ $? -eq 0 ]; then
        print_success "GitHub repository created successfully"
        git remote add origin "https://github.com/meastory/$REPO_NAME.git"
    else
        print_error "Failed to create GitHub repository"
        exit 1
    fi
fi

# Push code
print_status "Pushing code to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    print_success "Code pushed to GitHub successfully!"
    print_status "Repository URL: https://github.com/meastory/$REPO_NAME"
    print_status "You can now:"
    echo "  - View your code: https://github.com/meastory/$REPO_NAME"
    echo "  - Set up GitHub Actions for CI/CD"
    echo "  - Enable branch protection rules"
    echo "  - Configure repository settings"
else
    print_error "Failed to push code to GitHub"
    print_status "You can try pushing manually:"
    echo "  git push -u origin main"
    exit 1
fi
