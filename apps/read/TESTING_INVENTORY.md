# Testing Inventory - Video Reading Screen Layout

This file tracks all temporary testing files created for the video reading screen layout optimization.

## Created Files

### Test Pages
- ✅ `src/pages/LayoutTest.tsx` - Main layout testing playground
- ✅ `src/components/testing/MockVideoContainer.tsx` - Mock video component for testing
- ✅ `src/components/testing/MockStoryOverlay.tsx` - Mock story overlay for testing  
- ✅ `src/components/testing/MockControls.tsx` - Mock control elements
- ✅ `src/data/testStoryContent.ts` - Sample story content for testing

### Test Styles
- ✅ `src/styles/testing.css` - Testing-specific CSS classes

### Test Data
- ✅ `src/data/testStoryContent.ts` - Sample story data for testing

## Router Changes

### Modified Files
- ✅ `src/main.tsx` - Added `/layout-test` route (TEMPORARY)
- ✅ `src/styles/index.css` - Added testing.css import (TEMPORARY)

## Testing URLs

- `/layout-test` - Main layout testing page
- `/layout-test?scenario=mobile-reading` - Mobile reading state
- `/layout-test?scenario=mobile-choices` - Mobile choice state  
- `/layout-test?scenario=tablet-reading` - Tablet reading state
- `/layout-test?scenario=desktop-reading` - Desktop reading state

## Cleanup Checklist

When layout work is complete, remove:

### Files to Delete
- [ ] `src/pages/LayoutTest.tsx`
- [ ] `src/components/testing/` (entire directory)
- [ ] `src/styles/testing.css`
- [ ] `src/data/testStoryContent.ts`
- [ ] `src/data/jack-beanstalk-sample.json`
- [ ] `TESTING_INVENTORY.md` (this file)

### Code to Remove
- [ ] Layout test route from `src/main.tsx`
- [ ] Import statement for LayoutTest from `src/main.tsx`
- [ ] Testing CSS import from `src/styles/index.css`

## Development Notes

- All test files are prefixed with "Mock" or placed in `/testing` directories
- Test-specific CSS classes are prefixed with `.test-` or `.mock-`
- No production code dependencies on test files
- Test files use existing component interfaces where possible

## Status

- [x] Initial setup complete
- [x] Mobile layout optimized
- [x] Video feed order swapped (remote priority)
- [x] Unified story component implemented
- [x] Story title moved to top-left
- [x] Menu system replaced with popup design
- [x] Hide/show story functionality added
- [x] Text scaling controls integrated
- [x] Fullscreen button moved to bottom-left
- [x] Old components archived
- [x] Production implementation complete
- [ ] Testing files cleaned up
