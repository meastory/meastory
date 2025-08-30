# Me A Story

Live, interactive storytelling over video calls for families.

### Status
- Phase 1 (MVP) planning complete. Building `tell.meastory.com` as a static site on Netlify with vanilla HTML/CSS/JS and WebRTC.

### Quick Links
- PRD: `docs/PRD.md`
- Architecture: `docs/ARCHITECTURE.md`
- Roadmap: `docs/ROADMAP.md`
- Safety/Privacy/Compliance: `docs/SAFETY_PRIVACY_COMPLIANCE.md`
- Brand Guide: `docs/BRAND_GUIDE.md`
- Testing & QA: `docs/TESTING_QA.md`
- Deployment & Ops: `docs/DEPLOYMENT_OPS.md`
- Story Data Spec: `docs/STORY_DATA_SPEC.md`

### Repo Layout (initial)
```
meastory/
  docs/
  apps/
    tell/
      public/
      src/
      stories/
      netlify.toml
```

### Getting Started (Phase 1)
- Host on Netlify pointing to `apps/tell`
- No build step required initially; open `apps/tell/index.html` to develop locally
- Stories live under `apps/tell/stories/*.json`
- Background images under `apps/tell/public/backgrounds/*`

### Contributing
- Feature branches with clear, small PRs
- Use Netlify deploy previews for QA
- Follow safety and content guidelines for any story contributions

### License
- TBA 