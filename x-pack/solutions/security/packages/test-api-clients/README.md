# @kbn/security-solution-test-api-clients

Auto-generated API clients for Security Solution testing.

This package contains Supertest API clients generated from OpenAPI schemas for use in Security Solution integration tests.

## Usage example

Add a service to your test services configuration
```typescript
import { SecuritySolutionApiProvider } from '@kbn/security-solution-test-api-clients/supertest/detections.gen';

export const services = {
  detectionsApi: SecuritySolutionApiProvider,
  // ... other services
};
```

Then use the service in your test
```typescript
export default ({ getService }: FtrProviderContext): void => {
  const detectionsApi = getService('detectionsApi');

  // ...

  detectionsApi.findRules({ query: {} }).expect(200);
```
