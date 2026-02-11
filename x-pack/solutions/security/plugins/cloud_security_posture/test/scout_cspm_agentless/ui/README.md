# CSPM Agentless E2E Tests with Scout

## Overview

These Scout tests validate Cloud Security Posture Management (CSPM) agentless integrations using **Playwright's route interception** to capture and validate API request shapes.

## Approach: Request Shape Testing

Instead of running a mock server, tests use Playwright's `page.route()` to:

1. Intercept requests to the Fleet Agentless Policy API
2. Validate the request payload shape and content
3. Return mock responses to complete the UI flow

This approach focuses on testing that the UI sends correctly shaped requests.

---

## Quick Start

### Run Tests

```bash
# Stateful mode
node scripts/scout.js run-tests \
  --arch stateful \
  --domain classic \
  --config x-pack/solutions/security/plugins/cloud_security_posture/test/scout_cspm_agentless/ui/parallel.playwright.config.ts

# Serverless Security mode
node scripts/scout.js run-tests \
  --arch serverless \
  --domain security_complete \
  --config x-pack/solutions/security/plugins/cloud_security_posture/test/scout_cspm_agentless/ui/parallel.playwright.config.ts
```

> **Note:** Scout auto-detects the custom `cspm_agentless` config from the `scout_cspm_agentless` directory name.

Scout automatically:

1. Starts Elasticsearch
2. Starts Kibana (configured for agentless)
3. Runs Playwright tests
4. Stops Kibana and Elasticsearch

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Playwright Test                       │
│                                                          │
│  1. Setup: page.route() captures request data            │
│  2. Action: UI interactions trigger API call             │
│  3. Wait: poll() until request captured                  │
│  4. Assert: Validate request shape in main test body     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Route Handler (capture only, no assertions)    │    │
│  │  • Capture request body                          │    │
│  │  • Return mock response                          │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     Kibana UI                            │
│                                                          │
│  form.tsx → sendCreateAgentlessPolicy()                  │
│             ↓                                            │
│  POST /api/fleet/agentless_policies                      │
│             ↓                                            │
│  Request intercepted by Playwright                       │
└─────────────────────────────────────────────────────────┘
```

---

## How It Works

### Route Interception Pattern

Tests intercept the agentless policy API, capture request data, and validate shapes in the main test body:

```typescript
let capturedRequestBody: AgentlessPolicyRequestBody | null = null;

// Route handler ONLY captures data - no assertions here (avoids conditional expect)
await page.route(/\/api\/fleet\/agentless_policies/, async (route, request) => {
  if (request.method() === 'POST') {
    capturedRequestBody = request.postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ item: { id: 'mock-policy-id', ...capturedRequestBody } }),
    });
  } else {
    await route.continue();
  }
});

// ... UI interactions ...
await pageObjects.cspmIntegrationPage.saveIntegration();

// Wait for request to be captured
await expect.poll(() => capturedRequestBody, { timeout: 30000 }).not.toBeNull();

// ALL assertions in main test body (not inside route handler)
expect(capturedRequestBody).not.toBeNull();
validateAgentlessPolicyRequestShape(capturedRequestBody!);
expect(capturedRequestBody!.cloud_connector).toBeDefined();
expect(capturedRequestBody!.cloud_connector!.enabled).toBe(true);
```

> **Note:** Assertions are placed outside the route handler to avoid ESLint's "Avoid calling `expect` conditionally" error.

### Expected Request Shape

From `form.tsx` (lines 164-196), the agentless policy request uses the **legacy format** (with `?format=legacy` query param):

```typescript
interface AgentlessPolicyRequestBody {
  package: {
    name: string; // e.g., 'cloud_security_posture'
    version: string;
  };
  name: string; // Integration name
  description?: string;
  namespace: string;
  // Legacy format: inputs is an OBJECT keyed by input type (not an array)
  inputs: Record<
    string,
    {
      enabled: boolean;
      vars?: Record<string, unknown>;
      streams: Record<
        string,
        {
          enabled: boolean;
          vars?: Record<string, unknown>;
        }
      >;
    }
  >;
  vars?: Record<string, unknown>;
  // Cloud connector fields (when cloud connectors enabled)
  cloud_connector?: {
    enabled: boolean;
    cloud_connector_id?: string; // Present when reusing existing
    name?: string; // Present when creating new
  };
}
```

> **Note:** Use regex pattern `/\/api\/fleet\/agentless_policies/` to match URLs with space prefixes and query parameters.

---

## File Structure

```
x-pack/solutions/security/plugins/cloud_security_posture/test/scout_cspm_agentless/ui/
├── README.md                          ← This file
├── parallel.playwright.config.ts      ← Playwright config
└── parallel_tests/
    └── cloud_connectors/
        ├── create_cloud_connector.spec.ts
        ├── reuse_cloud_connector.spec.ts
        └── switch_setup_technology.spec.ts

Scout Config (auto-detected from 'scout_cspm_agentless' directory name):
src/platform/packages/shared/kbn-scout/src/servers/configs/custom/cspm_agentless/
├── stateful/
│   └── stateful.config.ts             ← Kibana config for stateful mode
└── serverless/
    └── security.serverless.config.ts  ← Kibana config for serverless security mode
```

---

## Test Coverage

These tests validate request shapes for:

- **Creating cloud connectors**: New connector with AWS/Azure credentials
- **Reusing cloud connectors**: Existing connector ID passed instead of name
- **Switching credential types**: Switch from cloud connectors to direct access keys (AWS) or service principal (Azure)
- **Agent-based mode**: Validates no agentless API calls and no cloud connector fields

### Key Assertions

| Scenario                | API Endpoint                    | Key Assertions                                                                                                                                            |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New AWS connector       | `/api/fleet/agentless_policies` | `cloud_connector.enabled === true`, `cloud_connector.name` defined                                                                                        |
| Reuse AWS connector     | `/api/fleet/agentless_policies` | `cloud_connector.cloud_connector_id` defined, `cloud_connector.name` undefined                                                                            |
| AWS direct access keys  | `/api/fleet/agentless_policies` | `cloud_connector` undefined, `aws.supports_cloud_connectors` not in stream vars                                                                           |
| Azure service principal | `/api/fleet/agentless_policies` | `cloud_connector` undefined, `azure.credentials.type === 'service_principal_with_client_secret'`                                                          |
| AWS agent-based         | `/api/fleet/package_policies`   | No POST to agentless API, `cloud_connector` undefined, `supports_cloud_connectors` undefined, `aws.supports_cloud_connectors` not `true` in stream vars   |
| Azure agent-based       | `/api/fleet/package_policies`   | No POST to agentless API, `cloud_connector` undefined, `supports_cloud_connectors` undefined, `azure.supports_cloud_connectors` not `true` in stream vars |

### Stream Var Keys for Cloud Connectors

| Provider | Stream Var Key                    | Description                                                                        |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| AWS      | `aws.supports_cloud_connectors`   | Boolean flag for cloud connector support                                           |
| AWS      | `aws.credentials.type`            | Credential type (e.g., `cloud_connectors`, `direct_access_keys`)                   |
| AWS      | `aws.credentials.external_id`     | External ID for assume role                                                        |
| Azure    | `azure.supports_cloud_connectors` | Boolean flag for cloud connector support                                           |
| Azure    | `azure.credentials.type`          | Credential type (e.g., `cloud_connectors`, `service_principal_with_client_secret`) |
| Azure    | `azure.credentials.tenant_id`     | Azure tenant ID                                                                    |
| Azure    | `azure.credentials.client_id`     | Azure client ID                                                                    |

---

## Benefits

- **No external dependencies**: No mock servers to manage
- **Fast execution**: In-browser interception
- **Clear validation**: Request shape assertions are explicit
- **Works in CI**: No port management needed
- **Linter-friendly**: Assertions in main test body avoid conditional `expect` errors

---

## Troubleshooting

### Request Not Intercepted

**Check:** Route pattern matches the actual request URL

```typescript
// Debug: Log all requests
await page.on('request', (req) => console.log(req.url()));
```

### Validation Failing

**Check:** The request body structure may have changed

1. Enable debug logging in Kibana
2. Check the actual request payload in browser dev tools
3. Update validation assertions accordingly

---

## Related Documentation

- [Scout Documentation](../../../../../../../../../src/platform/packages/shared/kbn-scout/README.md)
- [Playwright Route Interception](https://playwright.dev/docs/network#modify-requests)
- [Fleet Agentless API](x-pack/platform/plugins/shared/fleet/common/constants/routes.ts)
