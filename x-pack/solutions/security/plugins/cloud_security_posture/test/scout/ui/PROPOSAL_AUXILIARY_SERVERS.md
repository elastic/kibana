# Proposal: Add Auxiliary Server Support to Scout

**Author:** Cloud Security Posture Team  
**Date:** December 10, 2025  
**Status:** Proposal  
**Target:** `@kbn/scout` package maintainers (@elastic/appex-qa)

## Executive Summary

Extend Scout's server management to support **auxiliary servers** (mock APIs, proxy servers, etc.) that start alongside Elasticsearch and Kibana during test execution.

## Problem Statement

Currently, Scout only manages Elasticsearch and Kibana servers. When tests require external services that the Kibana backend calls (not the browser), there's no built-in way to start/stop them as part of Scout's server lifecycle.

### Current Pain Points

1. **Manual process**: Developers must start mock servers in separate terminals
2. **Forgotten cleanup**: Servers left running after interrupted test runs
3. **CI complexity**: Requires complex orchestration scripts
4. **Inconsistent**: Each team creates different workarounds
5. **Not deployment-agnostic**: Hard to replicate across environments

### Example Use Case: Agentless API Mocking

The Cloud Security Posture plugin needs to test agentless integrations where:
- Frontend → Kibana backend → **External Agentless API**
- Tests need to mock the external API since:
  - Real API requires cloud credentials
  - Tests should be isolated and deterministic
  - `page.route()` doesn't work (it's backend → external, not browser → backend)

## Proposed Solution

Add `auxiliaryServers` configuration option that allows defining additional servers to start with the Scout server lifecycle.

---

## Implementation

### 1. Type Definition

**File:** `src/platform/packages/shared/kbn-scout/src/types/server_config.d.ts`

```typescript
import type { Server } from 'http';

/**
 * Configuration for auxiliary servers that start alongside ES/Kibana.
 * Examples: Mock APIs, proxy servers, test fixtures servers, etc.
 */
export interface AuxiliaryServerConfig {
  /** Unique name for the server (used in logs and process management) */
  name: string;
  
  /** Port number to listen on */
  port: number;
  
  /** Function that creates and returns a Node.js HTTP server instance */
  createServer: () => Server;
  
  /** Optional: HTTP path to check for readiness (e.g., '/health') */
  readyPath?: string;
  
  /** Optional: Timeout in ms to wait for server to start (default: 10000) */
  startTimeout?: number;
  
  /** Optional: Environment variables to set when this server is active */
  env?: Record<string, string>;
}

export interface ScoutServerConfig {
  // ... existing fields ...
  
  /**
   * Optional auxiliary servers to start alongside Elasticsearch and Kibana.
   * These servers start after Kibana and stop before Elasticsearch shuts down.
   */
  auxiliaryServers?: AuxiliaryServerConfig[];
}
```

### 2. Server Runner Implementation

**File:** `src/platform/packages/shared/kbn-scout/src/servers/run_auxiliary_servers.ts` (**NEW**)

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server } from 'http';
import type { ToolingLog } from '@kbn/tooling-log';
import axios from 'axios';
import type { AuxiliaryServerConfig } from '../types/server_config';

interface RunningAuxiliaryServer {
  config: AuxiliaryServerConfig;
  server: Server;
}

const runningServers: RunningAuxiliaryServer[] = [];

/**
 * Wait for an auxiliary server to become ready by polling a health endpoint.
 */
async function waitForServerReady(
  serverName: string,
  port: number,
  readyPath: string | undefined,
  timeout: number,
  log: ToolingLog
): Promise<void> {
  if (!readyPath) {
    // No readiness check, assume ready after brief delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  const startTime = Date.now();
  const url = `http://localhost:${port}${readyPath}`;

  log.debug(`[${serverName}] Waiting for server to be ready at ${url}...`);

  while (Date.now() - startTime < timeout) {
    try {
      await axios.get(url, { timeout: 1000 });
      log.info(`[${serverName}] Server is ready`);
      return;
    } catch (err) {
      // Server not ready yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(
    `[${serverName}] Server did not become ready within ${timeout}ms at ${url}`
  );
}

/**
 * Start all configured auxiliary servers and return a cleanup function.
 * 
 * @param configs - Array of auxiliary server configurations
 * @param log - Logger instance
 * @returns Cleanup function that stops all servers
 */
export async function runAuxiliaryServers(
  configs: AuxiliaryServerConfig[],
  log: ToolingLog
): Promise<() => Promise<void>> {
  if (!configs || configs.length === 0) {
    return async () => {}; // No-op cleanup
  }

  log.info(`Starting ${configs.length} auxiliary server(s)...`);

  for (const config of configs) {
    log.info(`[${config.name}] Starting on port ${config.port}...`);

    try {
      const server = config.createServer();

      await new Promise<void>((resolve, reject) => {
        server.listen(config.port, () => {
          log.success(
            `[${config.name}] Started successfully on http://localhost:${config.port}`
          );
          resolve();
        });

        server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log.error(
              `[${config.name}] Port ${config.port} is already in use. ` +
              `Kill the process with: lsof -ti:${config.port} | xargs kill -9`
            );
          } else {
            log.error(`[${config.name}] Failed to start: ${err.message}`);
          }
          reject(err);
        });
      });

      // Wait for server to be ready (if readiness check configured)
      await waitForServerReady(
        config.name,
        config.port,
        config.readyPath,
        config.startTimeout || 10000,
        log
      );

      runningServers.push({ config, server });
    } catch (err) {
      log.error(`[${config.name}] Failed to start auxiliary server`, err);
      throw err;
    }
  }

  // Return cleanup function
  return async () => {
    if (runningServers.length === 0) {
      return;
    }

    log.info('Stopping auxiliary servers...');
    
    for (const { config, server } of runningServers) {
      try {
        await new Promise<void>((resolve) => {
          server.close(() => {
            log.success(`[${config.name}] Stopped successfully`);
            resolve();
          });
        });
      } catch (err) {
        log.warning(`[${config.name}] Error during shutdown:`, err);
      }
    }
    
    runningServers.length = 0;
  };
}
```

### 3. Integration into `start_servers.ts`

**File:** `src/platform/packages/shared/kbn-scout/src/servers/start_servers.ts`

```diff
import { getExtraKbnOpts, runKibanaServer } from './run_kibana_server';
+import { runAuxiliaryServers } from './run_auxiliary_servers';

export async function startServers(log: ToolingLog, options: StartServerOptions) {
  const runStartTime = Date.now();
  const reportTime = getTimeReporter(log, 'scripts/scout_start_servers');

  await withProcRunner(log, async (procs) => {
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const configRootDir = getConfigRootDir(defaultPlaywrightPath, options.mode, options.configDir);
    const config = await loadServersConfig(options.mode, log, configRootDir);
    const pwGrepTag = getPlaywrightGrepTag(options.mode);

    const shutdownEs = await runElasticsearch({
      config,
      log,
      esFrom: options.esFrom,
      logsDir: options.logsDir,
    });

    await runKibanaServer({
      procs,
      config,
      installDir: options.installDir,
      extraKbnOpts: getExtraKbnOpts(options.installDir, config.get('serverless')),
    });

+   // Start auxiliary servers if configured
+   let shutdownAuxiliaryServers: (() => Promise<void>) | undefined;
+   const auxiliaryServers = config.get('auxiliaryServers');
+   if (auxiliaryServers && auxiliaryServers.length > 0) {
+     shutdownAuxiliaryServers = await runAuxiliaryServers(auxiliaryServers, log);
+   }

    reportTime(runStartTime, 'ready', {
      success: true,
      ...options,
    });

    await silence(log, 5000);

    log.success(
      '\n\n' +
        dedent`
          Elasticsearch and Kibana are ready for functional testing.
          Use 'npx playwright test --project local --grep ${pwGrepTag} --config <path_to_Playwright.config.ts>' to run tests'
        ` +
        '\n\n'
    );

    await procs.waitForAllToStop();
+   
+   // Stop auxiliary servers before shutting down ES
+   if (shutdownAuxiliaryServers) {
+     await shutdownAuxiliaryServers();
+   }
+   
    await shutdownEs();
  });
}
```

Similar changes needed in `run_tests.ts` for the `runLocalServersAndTests` function.

---

## 4. Example Usage

### Plugin's Custom Scout Config

**File:** `src/platform/packages/shared/kbn-scout/src/servers/configs/custom/cspm_agentless/stateful/stateful.config.ts`

```typescript
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../../default/stateful/base.config';

// Import your mock server setup function
// Note: This creates a circular dependency that needs to be handled
function createMockAgentlessServer() {
  const http = require('http');
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/v1/ess/deployments') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
}

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  
  // Define auxiliary servers
  auxiliaryServers: [
    {
      name: 'mock-agentless-api',
      port: 8089,
      createServer: createMockAgentlessServer,
      readyPath: '/api/v1/ess/deployments',
      startTimeout: 5000,
    },
  ],
  
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.fleet.agentless.enabled=true',
      '--xpack.fleet.agentless.api.url=http://localhost:8089',
      // ... rest of config
    ],
  },
};
```

### Tests - No Changes Needed!

```typescript
import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('Cloud Connectors', { tag: ['@ess'] }, () => {
  // No beforeAll/afterAll needed - server is already running!
  
  spaceTest('create agentless integration', async ({ page, pageObjects }) => {
    await page.goto('/app/integrations');
    // Test runs - mock server intercepts Kibana → Agentless API calls
  });
});
```

---

## Benefits

### For Test Authors
- ✅ **Zero boilerplate**: No setup/teardown code in tests
- ✅ **Automatic lifecycle**: Scout manages server start/stop
- ✅ **Works everywhere**: Local, CI, cloud deployments
- ✅ **Clean failures**: Servers properly cleaned up on test failure

### For Scout Framework
- ✅ **Extensible**: Plugins can define custom auxiliary servers
- ✅ **Reusable**: Pattern can be used by any plugin
- ✅ **Consistent**: Same approach as ES/Kibana server management
- ✅ **Documented**: Clear pattern for future use cases

### For CI/CD
- ✅ **Reliable**: No manual steps to forget
- ✅ **Portable**: Same config works locally and in CI
- ✅ **Clean**: No orphaned processes between runs

---

## Alternatives Considered

### ❌ Playwright's `globalSetup`/`globalTeardown`
**Why rejected:** Scout's split runner architecture (kbn/test for servers, playwright/test for tests) means Playwright hooks don't run at the right time.

### ❌ Worker Fixtures with `auto: true`
**Why rejected:** 
- Workers start in parallel, causing race conditions on port binding
- Requires complex file-system locking
- Doesn't integrate with Scout's server management lifecycle

### ❌ `beforeAll()`/`afterAll()` Test Hooks
**Why rejected:**
- Runs per test file, not globally
- With parallel workers, multiple files try to start servers on same port
- Not cleaned up if tests fail before `afterAll()` runs

### ❌ Manual Two-Terminal Approach
**Why rejected:**
- Requires manual coordination
- Error-prone (forgetting to start/stop)
- Doesn't work in CI without complex scripts
- Poor developer experience

---

## Implementation Checklist

- [ ] Add `AuxiliaryServerConfig` interface to `server_config.d.ts`
- [ ] Create `run_auxiliary_servers.ts` with start/stop logic
- [ ] Modify `start_servers.ts` to integrate auxiliary servers
- [ ] Modify `run_tests.ts` (runLocalServersAndTests) to integrate auxiliary servers
- [ ] Add unit tests for `run_auxiliary_servers.ts`
- [ ] Update Scout documentation with auxiliary servers example
- [ ] Add error handling for port conflicts
- [ ] Consider health check retry logic

---

## Open Questions

1. **Import paths**: How should custom configs import mock server code from plugin test directories? (Circular dependency concerns)
   - **Suggestion**: Allow `createServer` to be a module path string that Scout dynamically requires

2. **Shutdown order**: Should auxiliary servers stop before or after Kibana?
   - **Suggestion**: After Kibana (in case Kibana needs to call them during shutdown)

3. **Parallel support**: Should auxiliary servers be shared across parallel workers or one per worker?
   - **Suggestion**: Shared (one instance for all workers) to avoid port conflicts

4. **Config validation**: Should Scout validate that auxiliaryServers don't conflict with Kibana/ES ports?
   - **Suggestion**: Yes, add validation in config loader

---

## Example: CSPM Agentless Tests

### Before (Manual)

```bash
# Terminal 1
node mock_server.js

# Terminal 2  
node scripts/scout.js run-tests ...
```

### After (Automatic)

```bash
# Single command
node scripts/scout.js run-tests --stateful --config-dir=cspm_agentless ...
```

**Config:**
```typescript
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  auxiliaryServers: [
    {
      name: 'mock-agentless-api',
      port: 8089,
      createServer: () => setupMockAgentlessServer(),
    },
  ],
  kbnTestServer: {
    serverArgs: [
      '--xpack.fleet.agentless.api.url=http://localhost:8089',
    ],
  },
};
```

**Test:** (No changes needed!)
```typescript
spaceTest('test agentless', async ({ page }) => {
  // Mock server is running automatically
});
```

---

## Migration Path

### Phase 1: Core Implementation
- Add auxiliary server support to Scout
- Document with examples
- Use in CSPM tests as pilot

### Phase 2: Adopt in Other Plugins
- Security Solution tests requiring external mocks
- Observability tests with external APIs
- Platform tests with mock services

### Phase 3: Enhance
- Add templating for common mock server patterns
- Support Docker-based auxiliary services
- Add debugging tools for auxiliary servers

---

## Success Criteria

- ✅ CSPM agentless tests run with single Scout command
- ✅ No manual server management required
- ✅ Works in local dev, CI, and cloud test environments
- ✅ Other teams can use pattern for their mock servers
- ✅ Zero orphaned processes after test failures

---

## Timeline Estimate

- **Design review**: 1-2 days
- **Implementation**: 2-3 days
- **Testing & documentation**: 1-2 days
- **Total**: ~1 week

---

## Related Issues/PRs

- [#244518](https://github.com/elastic/kibana/pull/244518) - UIAM Scout API tests example
- Current workaround: Manual mock server in separate terminal

---

## Contact

- **Proposed by:** Cloud Security Posture Team (@elastic/cloud-security-posture)
- **Maintainers:** @elastic/appex-qa
- **Slack:** #appex-qa

---

## Appendix: Real-World Implementation Reference

This proposal stems from the need to test Agentless API integrations in Cloud Security Posture. The complete implementation details including the mock server setup can be found in:

- Mock server implementation: `x-pack/solutions/security/plugins/cloud_security_posture/test/scout/ui/helpers/mock_agentless_api.ts`
- Custom Scout config: `src/platform/packages/shared/kbn-scout/src/servers/configs/custom/cspm_agentless/stateful/stateful.config.ts`
- Test examples: `x-pack/solutions/security/plugins/cloud_security_posture/test/scout/ui/parallel_tests/cloud_connectors/*.spec.ts`

