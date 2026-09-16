# @kbn/security-solution-test-api-clients

Auto-generated API clients for Security Solution testing.

This package contains API clients generated from OpenAPI schemas for use in Security Solution tests:

- `supertest/*.gen.ts` — Supertest clients for FTR integration tests.
- `scout/*.gen.ts` — clients wrapping the Scout `apiClient` fixture for Scout API and UI tests.

## FTR usage example

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

## Scout usage example

`scout/index.ts` exposes the generated clients as worker fixtures named after the FTR services (`detectionsApi`, `exceptionsApi`, `listsApi`, `timelinesApi`, `entityAnalyticsApi`, `endpointManagementApi`, `endpointExceptionsApi`, `osqueryApi`, `discoveriesApi`). Merge them into your module's test type:

```typescript
// <module-root>/test/scout/api/fixtures/index.ts
import { apiTest as baseApiTest, mergeTests } from '@kbn/scout-security';
import { securitySolutionApiFixture } from '@kbn/security-solution-test-api-clients/scout';

export const apiTest = mergeTests(baseApiTest, securitySolutionApiFixture);
```

The clients wrap the unauthenticated `apiClient` fixture and set `kbn-xsrf`, `elastic-api-version` and `x-elastic-internal-origin` for you, so pass credentials through `options.headers`:

```typescript
apiTest('creates a rule', async ({ detectionsApi, requestAuth }) => {
  const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

  const response = await detectionsApi.createRule({ body: rule }, { headers: apiKeyHeader });

  expect(response).toHaveStatusCode(200);
});
```

Use `options.kibanaSpace` to target a non-default space and `options.responseType` for non-JSON payloads such as NDJSON exports.

Because this package depends on `@kbn/security-solution-plugin` for the request and response types, TypeScript project references stop the plugin itself (and `@kbn/scout-security`, which the plugin references) from depending on this package. Scout tests that live inside the plugin's `tsconfig.json` therefore cannot import these clients yet.
