# @kbn/test-api-clients

Auto-generated API clients for Security Solution testing.

This package contains Supertest API clients generated from OpenAPI schemas for use in Security Solution integration tests.

## Usage

```typescript
import { SecuritySolutionApiProvider } from '@kbn/test-api-clients';

// Use in your test services configuration
export const services = {
  securitySolutionApi: SecuritySolutionApiProvider,
  // ... other services
};
```

