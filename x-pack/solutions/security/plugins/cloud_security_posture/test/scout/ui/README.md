# CSPM Agentless E2E Tests with Scout

## Overview

These Scout tests validate Cloud Security Posture Management (CSPM) agentless integrations using a **declaratively configured mock Agentless API server**.

## ✅ What's New: Declarative Auxiliary Servers

Scout now supports **auxiliary servers** declared in configs! The mock Agentless API server is automatically started and stopped by Scout - no manual terminal management needed.

---

## Quick Start

### Run Tests (Single Command!)

```bash
node scripts/scout.js run-tests \
  --stateful \
  --config-dir=cspm_agentless \
  --config x-pack/solutions/security/plugins/cloud_security_posture/test/scout/ui/parallel.playwright.config.ts \
  --testTarget=local
```

**That's it!** Scout automatically:

1. Starts Elasticsearch
2. Starts Kibana (configured to use mock API)
3. **Starts mock-agentless-api on port 8089**
4. Runs tests
5. **Stops mock-agentless-api**
6. Stops Kibana and Elasticsearch

---

## Architecture

```
┌─────────────┐
│  Playwright │
│   Tests     │
└──────┬──────┘
       │
       ▼
┌─────────────┐      HTTP       ┌──────────────────┐
│   Kibana    │ ───────────────► │  Mock Agentless  │
│   Server    │  (port 8089)     │   API Server     │
└─────────────┘                  └──────────────────┘
       │                          (Scout-managed)
       ▼
┌─────────────┐
│Elasticsearch│
└─────────────┘
```

- **Playwright**: Controls browser, interacts with Kibana UI
- **Kibana**: Makes API calls to mock Agentless API
- **Mock Server**: Automatically started by Scout from config
- **Tests**: Validate cloud connector functionality

---

## How It Works

### 1. Mock Server Implementation

**File:** `helpers/mock_agentless_api.ts`

```typescript
export const setupMockAgentlessServer = () => {
  return http.createServer((req, res) => {
    // Handle POST /api/v1/ess/deployments
    if (req.method === 'POST' && req.url === '/api/v1/ess/deployments') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }
    // ... more handlers
  });
};
```

### 2. Scout Config Declaration

**File:** `src/platform/packages/shared/kbn-scout/src/servers/configs/custom/cspm_agentless/stateful/stateful.config.ts`

```typescript
// Mock server logic inlined in config to avoid import issues
const setupMockAgentlessServer = () => {
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/v1/ess/deployments') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }
    // ... more handlers
  });
};

export const servers: ScoutServerConfig = {
  ...defaultConfig,

  // Declare auxiliary server - Scout handles lifecycle
  auxiliaryServers: [
    {
      name: 'mock-agentless-api',
      port: 8089,
      createServer: setupMockAgentlessServer,
    },
  ],

  kbnTestServer: {
    serverArgs: [
      '--xpack.fleet.agentless.enabled=true',
      '--xpack.fleet.agentless.api.url=http://localhost:8089', // Points to mock
      // ... more config
    ],
  },
};
```

### 3. Tests (No Setup Needed!)

**File:** `parallel_tests/cloud_connectors/create_cloud_connector.spec.ts`

```typescript
import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('Cloud Connectors', { tag: ['@ess'] }, () => {
  // No beforeAll/afterAll needed!
  // Mock server automatically running via Scout

  spaceTest('create AWS CSPM integration', async ({ page, pageObjects }) => {
    // Test code - Kibana calls hit mock server on port 8089
  });
});
```

---

## Expected Output

When running `node scripts/scout.js run-tests ...`:

```
Starting 1 auxiliary server(s)...
[mock-agentless-api] Starting on port 8089...
[mock-agentless-api] Started successfully on http://localhost:8089

Elasticsearch and Kibana are ready for functional testing.
Auxiliary servers: mock-agentless-api

[Mock Agentless API] POST /api/v1/ess/deployments
[Mock Agentless API] ✅ Handling POST /api/v1/ess/deployments

... tests run ...

Stopping auxiliary servers...
[mock-agentless-api] Stopped successfully
```

---

## File Structure

```
x-pack/solutions/security/plugins/cloud_security_posture/test/scout/ui/
├── README.md                          ← This file
├── PROPOSAL_AUXILIARY_SERVERS.md      ← Full proposal document
├── IMPLEMENTATION_GUIDE.md            ← Implementation details
├── helpers/
│   └── mock_agentless_api.ts         ← Mock HTTP server implementation
├── parallel.playwright.config.ts      ← Playwright config
└── parallel_tests/
    └── cloud_connectors/
        ├── create_cloud_connector.spec.ts
        ├── reuse_cloud_connector.spec.ts
        └── switch_setup_technology.spec.ts

Scout Config:
src/platform/packages/shared/kbn-scout/src/servers/configs/custom/cspm_agentless/
└── stateful/
    └── stateful.config.ts             ← Declares auxiliary server
```

---

## Benefits

### Before (Manual)

```bash
# Terminal 1: Start mock server manually
node mock_server.js

# Terminal 2: Run tests
node scripts/scout.js run-tests ...

# Don't forget to stop mock server!
```

### After (Automatic)

```bash
# Single command, single terminal
node scripts/scout.js run-tests --stateful --config-dir=cspm_agentless ...
```

### Advantages

- ✅ **No manual steps**: Scout manages everything
- ✅ **Automatic cleanup**: No orphaned processes
- ✅ **Works in CI**: No orchestration scripts needed
- ✅ **Consistent**: Same command everywhere

---

## Troubleshooting

### Port Already in Use

**Symptom:**

```
[mock-agentless-api] Port 8089 is already in use
```

**Solution:**

```bash
lsof -ti:8089 | xargs kill -9
```

### Mock Server Not Starting

**Check:**

1. Does `setupMockAgentlessServer` exist and export correctly?
2. Are there TypeScript compilation errors?

**Debug:**

```bash
# Verify mock server file exists
ls helpers/mock_agentless_api.ts

# Check config imports it
grep "setupMockAgentlessServer" src/platform/packages/shared/kbn-scout/src/servers/configs/custom/cspm_agentless/stateful/stateful.config.ts
```

### Kibana Not Connecting

**Symptom:**

```
ECONNREFUSED http://localhost:5620
```

**Solution:** Use `run-tests` (not `start-server`):

```bash
node scripts/scout.js run-tests \
  --stateful \
  --config-dir=cspm_agentless
```

### Tests Failing

**Verify mock server responds:**

```bash
curl http://localhost:8089/api/v1/ess/deployments
```

Should return `{"error":"Not found"}` (404 is fine - means server is running)

---

## Test Coverage

These tests validate:

- ✅ Creating cloud connectors for AWS and Azure
- ✅ Reusing existing cloud connectors across integrations
- ✅ Switching between agent-based and agentless setup
- ✅ Package policy attributes with cloud connector metadata
- ✅ Integration with Fleet's agentless API

---

## CI/CD Integration

No special setup needed! Same command works:

```yaml
- name: Run CSPM Agentless Tests
  run: |
    node scripts/scout.js run-tests \
      --stateful \
      --config-dir=cspm_agentless \
      --config x-pack/solutions/security/plugins/cloud_security_posture/test/scout/ui/parallel.playwright.config.ts
```

Scout handles server lifecycle automatically.

---

## Related Documentation

- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Technical details
- [Proposal](./PROPOSAL_AUXILIARY_SERVERS.md) - Full feature proposal
- [Scout Documentation](../../../../../../../../../src/platform/packages/shared/kbn-scout/README.md)
- [Playwright Documentation](https://playwright.dev)

---

## For Other Teams

Want to mock external APIs in your Scout tests? This pattern is now available!

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for how to use auxiliary servers in your plugin.

**Summary:**

1. Create mock server in `<your-plugin>/test/scout/ui/helpers/`
2. Declare in Scout config at `configs/custom/<your-plugin>/stateful/`
3. Run tests with `--config-dir=<your-plugin>`

That's it! Scout handles the rest. 🚀
