# Read Me A Story — Production App

The production version of Read Me A Story, built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Zustand
- **Backend**: Supabase (Database + Auth + Realtime)
- **Hosting**: Netlify
- **CI/CD**: GitHub Actions

## Project Structure

```
src/
├── components/     # Reusable UI components
├── hooks/         # Custom React hooks
├── lib/           # Utilities, Supabase client
├── pages/         # Route-based pages
├── stores/        # Zustand state management
├── types/         # TypeScript definitions
├── styles/        # Global styles, design tokens
└── stories/       # Story engine (Phase 2+)
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Supabase setup:**
   - Create a new Supabase project
   - Copy the URL and anon key to `.env`
   - Run the database schema (see Phase 1A documentation)

4. **Development:**
   ```bash
   npm run dev
   ```

5. **Build:**
   ```bash
   npm run build
   ```

## Development Workflow

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests (when implemented)

### Code Quality

- ESLint for code linting
- TypeScript for type checking
- Prettier for code formatting (when configured)

## Architecture Overview

### State Management
- **Room Store**: Manages room state, participants, current story
- **UI Store**: Manages interface state, modes, loading states
- **Auth Store**: User authentication (Phase 4)

### Component Architecture
- Feature-based organization
- Shared components in `/components`
- Page components in `/pages`
- Custom hooks in `/hooks`

### Data Flow
1. User actions trigger store updates
2. Stores update via Zustand
3. Components react to store changes
4. Supabase handles data persistence and realtime updates

## Development Phases

See `/docs/project-management/` for detailed phase documentation:

- **Phase 1A**: Foundation & Migration (Current)
- **Phase 2**: Enhanced Storytelling
- **Phase 3**: Visual Enhancement
- **Phase 4**: Business Features

## Contributing

1. Follow the established project structure
2. Use TypeScript for all new code
3. Write tests for new functionality
4. Update documentation as needed
5. Follow the existing coding patterns

## Deployment

### Netlify Configuration
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables set in Netlify dashboard

### CI/CD
GitHub Actions will handle:
- Automated testing
- Build verification
- Deployment to staging/production

---

For more details, see the project documentation in `/docs/`.
