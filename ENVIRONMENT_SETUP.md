# Me A Story - Environment Setup Guide

## 🎯 Current Status
✅ **Local Development**: Complete - React app running on `http://localhost:5177`  
✅ **Git Repository**: Initialized and committed  
✅ **CLI Tools**: GitHub, Netlify, Supabase CLIs installed  
❌ **Remote Services**: Need authentication  

## 🚀 Next Steps

### 1. GitHub Repository Setup
**Option A: Use the automated script**
```bash
# First, authenticate GitHub CLI
gh auth login --web
# or
gh auth login --with-token  # (paste your Personal Access Token)

# Then run the setup script
./setup-github-repo.sh
```

**Option B: Manual setup**
1. Go to https://github.com/new
2. Create repository: `meastory`
3. Run: `git remote add origin https://github.com/create-meastory/meastory.git`
4. Run: `git push -u origin main`

### 2. Service Authentication
Once GitHub is set up, run the comprehensive setup script:
```bash
./setup-dev-environment.sh
```

This will authenticate:
- ✅ GitHub CLI (already done)
- 🔄 Netlify CLI
- 🔄 Supabase CLI

### 3. Environment Variables
Create `.env` files for each service:

**apps/read/.env**
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

## 🔧 Manual Authentication (if needed)

### GitHub Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `workflow`
4. Copy token and run: `gh auth login --with-token`

### Netlify
```bash
netlify login
# Follow browser authentication
```

### Supabase
```bash
supabase login
# Follow browser authentication
```

## 📊 What Gets Set Up

### GitHub Repository
- Remote repository: `https://github.com/create-meastory/meastory`
- Branch protection rules
- GitHub Actions workflows
- Issue templates
- Pull request templates

### Netlify Deployment
- Automatic deployments from `main` branch
- Preview deployments for pull requests
- Custom domain setup (read.meastory.com)
- Environment variables configuration

### Supabase Database
- Project initialization
- Database schema setup
- Authentication configuration
- Real-time subscriptions setup

## 🎯 Development Workflow

Once everything is set up, your workflow will be:

1. **Develop locally**: `npm run dev` in `apps/read/`
2. **Commit changes**: `git add . && git commit -m "feat: description"`
3. **Push to GitHub**: `git push`
4. **Automatic deployment**: Netlify deploys automatically
5. **Monitor**: Check GitHub Actions and Netlify dashboard

## 🔍 Troubleshooting

### GitHub Issues
```bash
# Check authentication
gh auth status

# Check remote
git remote -v

# Force push if needed
git push -u origin main --force
```

### Netlify Issues
```bash
# Check status
netlify status

# List sites
netlify sites:list

# Check build logs
netlify logs
```

### Supabase Issues
```bash
# Check status
supabase status

# List projects
supabase projects list

# Check database
supabase db diff
```

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the service dashboards (GitHub, Netlify, Supabase)
3. Check the terminal output for error messages
4. Refer to the project documentation in `docs/`

---

*Ready to proceed with authentication and deployment! 🚀*
