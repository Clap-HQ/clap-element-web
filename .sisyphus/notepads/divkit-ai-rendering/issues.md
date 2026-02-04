# Issues - divkit-ai-rendering

Problems, gotchas, and workarounds encountered during execution.

---

## E2E Test Execution Blocker (2026-02-04)

### Issue: Docker Container Runtime Not Available

**Error**: `Could not find a working container runtime strategy`

**Context**:
- Created Playwright E2E test: `playwright/e2e/messages/divkit-ai-messages.spec.ts`
- Test file is syntactically correct (TypeScript passes)
- Test execution requires Docker to run Matrix homeserver containers
- Docker is not running on the current machine

**Impact**:
- Cannot execute E2E tests locally
- Tests will run in CI/CD environment (GitHub Actions)
- Manual QA in browser still required

**Workaround**:
1. Start Docker Desktop: `open -a Docker`
2. Wait for Docker to start
3. Run tests: `yarn test:playwright playwright/e2e/messages/divkit-ai-messages.spec.ts`

**Alternative**:
- Run manual QA in dev server: `yarn start`
- Tests will run automatically in CI/CD pipeline

**Status**: BLOCKED (환경 문제, 코드 문제 아님)

