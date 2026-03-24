# Fleet Extensions Testing - AI Agent Instructions

## MANDATORY: Read TESTING.md Before Creating Tests

**File**: `TESTING.md` in this directory (944 lines)

## Quick Reference

**Testing Approach**: Integration testing with mocked child components (Azure pattern = gold standard)

**Core Patterns**:

- Mock child components that have their own tests
- Use `jest.requireMock()` to connect mocked functions
- Import test subjects from `@kbn/cloud-security-posture-common`
- Use `queryBy*` for negative assertions, `getBy*` for positive
- Every test must have meaningful expectations (not just "renders without crashing")

**TESTING.md Contains**:

- Complete Azure testing example (gold standard)
- Mock configuration patterns with real examples
- Lessons learned from AWS, Azure, GCP refactoring
- Test composition strategies
- Common pitfalls and solutions

**Run Tests**:

```bash
yarn test:jest --config x-pack/solutions/security/packages/kbn-cloud-security-posture/jest.config.js
```
