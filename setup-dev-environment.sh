#!/bin/bash

# Me A Story - Development Environment Setup
# This script sets up all CLI tools and authenticates with external services

echo "🚀 Setting up Me A Story Development Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if tools are installed
check_tools() {
    print_status "Checking installed tools..."
    
    local missing_tools=()
    
    if ! command -v gh &> /dev/null; then
        missing_tools+=("GitHub CLI (gh)")
    fi
    
    if ! command -v netlify &> /dev/null; then
        missing_tools+=("Netlify CLI (netlify)")
    fi
    
    if ! command -v supabase &> /dev/null; then
        missing_tools+=("Supabase CLI (supabase)")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools:"
        printf '  - %s\n' "${missing_tools[@]}"
        print_status "Please install missing tools and run this script again."
        exit 1
    fi
    
    print_success "All required tools are installed!"
}

# Setup GitHub
setup_github() {
    print_status "Setting up GitHub..."
    
    # Check if already authenticated
    if gh auth status &> /dev/null; then
        print_success "GitHub CLI already authenticated"
        return
    fi
    
    echo "GitHub CLI Authentication Options:"
    echo "1. Web browser authentication (recommended)"
    echo "2. Personal Access Token"
    echo "3. Skip GitHub setup for now"
    
    read -p "Choose authentication method (1-3): " choice
    
    case $choice in
        1)
            print_status "Opening web browser for GitHub authentication..."
            gh auth login --hostname github.com --web
            ;;
        2)
            read -p "Enter your GitHub Personal Access Token: " -s token
            echo
            echo "$token" | gh auth login --with-token
            ;;
        3)
            print_warning "Skipping GitHub setup"
            return
            ;;
        *)
            print_error "Invalid choice"
            return
            ;;
    esac
    
    if gh auth status &> /dev/null; then
        print_success "GitHub CLI authenticated successfully"
    else
        print_error "GitHub authentication failed"
    fi
}

# Setup Netlify
setup_netlify() {
    print_status "Setting up Netlify..."
    
    # Check if already authenticated
    if netlify status &> /dev/null; then
        print_success "Netlify CLI already authenticated"
        return
    fi
    
    print_status "Authenticating with Netlify..."
    netlify login
    
    if netlify status &> /dev/null; then
        print_success "Netlify CLI authenticated successfully"
    else
        print_error "Netlify authentication failed"
    fi
}

# Setup Supabase
setup_supabase() {
    print_status "Setting up Supabase..."
    
    # Check if already authenticated
    if supabase projects list &> /dev/null; then
        print_success "Supabase CLI already authenticated"
        return
    fi
    
    print_status "Authenticating with Supabase..."
    supabase login
    
    if supabase projects list &> /dev/null; then
        print_success "Supabase CLI authenticated successfully"
    else
        print_error "Supabase authentication failed"
    fi
}

# Create GitHub repository
create_github_repo() {
    print_status "Creating GitHub repository..."
    
    # Check if remote already exists
    if git remote get-url origin &> /dev/null; then
        print_warning "Git remote 'origin' already exists"
        return
    fi
    
    read -p "Enter repository name (default: meastory): " repo_name
    repo_name=${repo_name:-meastory}
    
    read -p "Make repository private? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        visibility="--private"
    else
        visibility="--public"
    fi
    
    print_status "Creating repository: $repo_name"
    gh repo create $repo_name $visibility --description "Me A Story - Live video storytelling for families"
    
    if [ $? -eq 0 ]; then
        print_success "GitHub repository created successfully"
        
        # Add remote and push
        print_status "Setting up git remote and pushing code..."
        git remote add origin "https://github.com/create-meastory/$repo_name.git"
        git branch -M main
        git push -u origin main
        
        if [ $? -eq 0 ]; then
            print_success "Code pushed to GitHub successfully"
        else
            print_error "Failed to push code to GitHub"
        fi
    else
        print_error "Failed to create GitHub repository"
    fi
}

# Main setup function
main() {
    echo
    print_status "Me A Story Development Environment Setup"
    print_status "=========================================="
    
    check_tools
    
    echo
    read -p "Do you want to setup GitHub? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_github
    fi
    
    echo
    read -p "Do you want to setup Netlify? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_netlify
    fi
    
    echo
    read -p "Do you want to setup Supabase? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_supabase
    fi
    
    echo
    read -p "Do you want to create GitHub repository and push code? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_github_repo
    fi
    
    echo
    print_success "Development environment setup complete!"
    print_status "You can now:"
    echo "  - Run 'npm run dev' in apps/read/ to start development"
    echo "  - Deploy to Netlify: 'netlify deploy'"
    echo "  - Manage Supabase: 'supabase status'"
    echo "  - Push changes: 'git push'"
}

# Run main function
main
