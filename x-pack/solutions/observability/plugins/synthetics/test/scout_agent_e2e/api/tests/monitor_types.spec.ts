/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import {
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../scout/common/fixtures';
import {
  addMonitor,
  deleteMonitors,
  enableSynthetics,
  testNowMonitor,
} from '../../../scout/common/fixtures/monitors';
import {
  apiTest,
  buildMonitorPayload,
  isCheckUp,
  waitForSyntheticsCheck,
  type SyntheticsMonitorType,
} from '../fixtures';

const TEST_TIMEOUT = 10 * 60 * 1000;
const CHECK_TIMEOUT = 3 * 60 * 1000;
const MONITOR_TYPES: SyntheticsMonitorType[] = ['http', 'tcp', 'icmp', 'browser'];

/**
 * Real Elastic Agent + Fleet Server E2E: create each monitor type on a private
 * location, trigger test-now, and wait for the agent-written check document.
 *
 * Requires Docker and the `agent_e2e` Scout server config:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet agent_e2e
 *   node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/synthetics/test/scout_agent_e2e/api/playwright.config.ts
 */
apiTest.describe(
  'Synthetics real-agent monitor types',
  { tag: ['@local-stateful-classic'] },
  () => {
    let editorHeaders: Record<string, string>;
    const createdMonitorIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, apiClient, kbnClient, agentStack }) => {
      apiTest.setTimeout(TEST_TIMEOUT);
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      await enableSynthetics(apiClient, editorHeaders);
      expect(agentStack.privateLocation.id).not.toBe('');
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      if (createdMonitorIds.length > 0) {
        await deleteMonitors(apiClient, editorHeaders, createdMonitorIds).catch(() => undefined);
      }
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    });

    for (const type of MONITOR_TYPES) {
      apiTest(
        `runs a ${type} monitor on an enrolled agent`,
        async ({ apiClient, esClient, agentStack }) => {
          apiTest.setTimeout(TEST_TIMEOUT);
          const createRes = await addMonitor(
            apiClient,
            editorHeaders,
            buildMonitorPayload(type, agentStack)
          );
          const created = createRes.body as { id: string };
          createdMonitorIds.push(created.id);

          const testNowRes = await testNowMonitor(apiClient, editorHeaders, created.id);
          const testRunId = (testNowRes.body as { testRunId?: string }).testRunId;

          const check = await waitForSyntheticsCheck(esClient, {
            type,
            configId: created.id,
            testRunId,
            timeoutMs: CHECK_TIMEOUT,
          });

          expect(isCheckUp(check)).toBe(true);
        }
      );
    }
  }
);
