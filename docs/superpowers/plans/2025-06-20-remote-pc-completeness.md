# Remote PC Control Enhancement Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Remote PC Control application production-ready with comprehensive testing, error handling, and user experience improvements.

**Architecture:** Extend existing .NET 8 backend with new services and add missing frontend components while implementing full test coverage. Maintain current token auth and LAN architecture.

**Tech Stack:** .NET 8, React 18, Vitest, C#, TypeScript, Tailwind CSS

**Spec:** README.md - Remote PC Control documentation and requirements

## Global Constraints
- Token must remain 6-character alphanumeric format
- Port must stay 5000 for compatibility
- All API endpoints require Bearer token authentication
- Frontend must validate IP format before API calls
- Android build must work with Capacitor
- All new code must have corresponding tests

## Review Focus
- IP validation prevents connection attempts to invalid addresses
- Token regeneration doesn't break existing active sessions
- App discovery handles case variations and partial matches gracefully
- Process operations provide feedback when commands take longer than expected
- Error responses are user-friendly and actionable
- Network timeouts are handled gracefully instead of hanging
- Missing token shows clear UI warning instead of silent failure
- App closing validates that processes are actually terminated

---

<!-- Todas las tareas deben colocarse AQUÍ - al final del archivo -->


### Task 1: Backend Unit Test Foundation
**Files:** Create `backend/PCControl.Api.Tests/ProcessServiceTests.cs`
**Interfaces:** Consumes `IProcessService`, Produces test coverage for power/app operations
- [ ] Write failing test for shutdown process call verification
- [ ] Run tests to confirm failure
- [ ] Implement minimal verification in ProcessService
- [ ] Verify test passes
- [ ] Commit

### Task 2: Frontend AppList Component Implementation
**Files:** Create `frontend/src/components/AppList.tsx` and test file
**Interfaces:** Consumes `useSettings`, Produces app management UI
- [ ] Write failing test for empty app list rendering
- [ ] Run test to confirm failure
- [ ] Implement AppList with search and open/close actions
- [ ] Verify component renders and calls API
- [ ] Commit

### Task 3: IP Validation and Connection Error Handling
**Files:** Modify `frontend/src/hooks/useSettings.ts`
**Interfaces:** Produces IP validation and error state
- [ ] Write failing test for invalid IP format
- [ ] Run test to confirm failure
- [ ] Implement regex-based IP validation
- [ ] Verify validation works in form
- [ ] Commit

### Task 4: Enhanced Process Service with App Discovery
**Files:** Modify `ProcessService.cs`, create `AppDiscoveryTests.cs`
**Interfaces:** Produces case-insensitive partial app matching
- [ ] Write failing test for partial name matching
- [ ] Run test to confirm failure
- [ ] Implement search across process names and titles
- [ ] Verify discovery finds apps by partial/case variations
- [ ] Commit

### Task 5: Frontend Error Handling and User Feedback
**Files:** Modify PowerButtons/AppList, add toast notifications
**Interfaces:** Produces error state display and loading states
- [ ] Write failing test for API error display
- [ ] Run test to confirm failure
- [ ] Implement error boundary and toast system
- [ ] Verify errors show user-friendly messages
- [ ] Commit

### Task 6: OpenAPI/Swagger Documentation
**Files:** Create `backend/PCControl.Api/docs/swagger.json`, modify Program.cs
**Interfaces:** Produces API documentation at /swagger
- [ ] Write failing test for swagger endpoint
- [ ] Run test to confirm failure
- [ ] Add SwaggerGen middleware
- [ ] Verify documentation loads
- [ ] Commit

### Task 7: Enhanced Health Endpoint with System Info
**Files:** Create `HealthEndpoints.cs` and `HealthTests.cs`
**Interfaces:** Produces enhanced health with CPU/uptime info
- [ ] Write failing test for extended health data
- [ ] Run test to confirm failure
- [ ] Implement health with system metrics
- [ ] Verify endpoint returns enriched data
- [ ] Commit

### Task 8: Token Refresh Mechanism
**Files:** Modify `TokenService.cs`, create `TokenServiceTests.cs`
**Interfaces:** Produces token refresh without restart
- [ ] Write failing test for token refresh
- [ ] Run test to confirm failure
- [ ] Implement refresh method and persistence
- [ ] Verify new token works with API
- [ ] Commit

### Task 9: Settings Modal Validation Integration
**Files:** Modify `SettingsModal.tsx`
**Interfaces:** Consumes IP validation, Produces validated settings
- [ ] Write failing test for validation in modal
- [ ] Run test to confirm failure
- [ ] Add validation feedback to settings form
- [ ] Verify save only allowed with valid IP
- [ ] Commit

### Task 10: Network Timeout Handling
**Files:** Modify `api.ts` with timeout wrapper
**Interfaces:** Produces timeout protection and retry logic
- [ ] Write failing test for timeout scenario
- [ ] Run test to confirm failure
- [ ] Implement AbortController timeout wrapper
- [ ] Verify requests timeout gracefully
- [ ] Commit

### Task 11: Process Operation Feedback
**Files:** Add feedback to `ProcessService`
**Interfaces:** Produces status for long operations
- [ ] Write failing test for operation feedback
- [ ] Run test to confirm failure
- [ ] Implement async operation wrapper
- [ ] Verify feedback returns for long tasks
- [ ] Commit

### Task 12: Documentation and Final QA
**Files:** Create `docs/usage.md`, update README
**Interfaces:** Produces complete user documentation
- [ ] Create usage guide with new features
- [ ] Update README with enhancements
- [ ] Run full test suite
- [ ] Verify Android build
- [ ] Final commit and tag v2.0.0