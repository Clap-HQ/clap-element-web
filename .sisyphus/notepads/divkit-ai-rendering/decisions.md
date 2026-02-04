# Decisions - divkit-ai-rendering

Architectural choices and technical decisions made during implementation.

---

## Task 1: @divkitframework/divkit Installation (2025-02-04)

### CSS Import Strategy Decision

**Decision**: Defer CSS import to Task 2 (ClapAIDivKit utility component)

**Rationale**:

- DivKit requires CSS from `@divkitframework/divkit/dist/client.css` (required for proper rendering)
- CSS import location should be determined based on usage pattern:
    - **Global import** (in `src/index.tsx` or main app entry): If DivKit is used across multiple AI message components
    - **Component-level import** (in ClapAIDivKit component): If DivKit is isolated to a single utility component
- Current decision: Import CSS in ClapAIDivKit component (component-level) to keep DivKit dependency isolated
- This approach allows future removal or replacement of DivKit without affecting global styles

### Installation Verification Results

✓ Package installed: `@divkitframework/divkit@32.35.0`
✓ TypeScript compatibility: No import errors
✓ Runtime verification: `render` function accessible and functional
✓ Available exports: Gesture, SizeProvider, createGlobalVariablesController, createVariable, lottieExtensionBuilder, markdownExtensionBuilder, render

### Package Details

- **Version**: 32.35.0
- **Size**: 82.8KB (minified+brotli)
- **Main export**: `@divkitframework/divkit/client`
- **CSS file**: `@divkitframework/divkit/dist/client.css`
- **React 19 compatibility**: ✓ Confirmed (no peer dependency conflicts)
