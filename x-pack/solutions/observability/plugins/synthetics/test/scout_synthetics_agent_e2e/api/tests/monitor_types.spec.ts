/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { mergeSyntheticsApiHeaders } from '../../../scout/common/fixtures';
import {
  addMonitor,
  deleteMonitors,
  enableSynthetics,
  testNowMonitor,
} from '../../../scout/common/fixtures/monitors';
import {
  apiTest,
  BROWSER_STEP_NAME,
  buildDownHttpMonitorPayload,
  buildMonitorPayload,
  isCheckDown,
  isCheckUp,
  waitForBrowserStep,
  waitForSyntheticsCheck,
  type AgentStack,
  type SyntheticsCheckDoc,
  type SyntheticsMonitorType,
} from '../fixtures';

const TEST_TIMEOUT = 10 * 60 * 1000;
const CHECK_TIMEOUT = 3 * 60 * 1000;
const MONITOR_TYPES: SyntheticsMonitorType[] = ['http', 'tcp', 'icmp', 'browser'];

const createAndRunMonitor = async (
  apiClient: ApiClientFixture,
  editorHeaders: Record<string, string>,
  createdMonitorIds: string[],
  payload: Record<string, unknown>
): Promise<{ id: string; testRunId?: string }> => {
  const createRes = await addMonitor(apiClient, editorHeaders, payload);
  const created = createRes.body as { id: string };
  createdMonitorIds.push(created.id);

  const testNowRes = await testNowMonitor(apiClient, editorHeaders, created.id);
  const testRunId = (testNowRes.body as { testRunId?: string }).testRunId;
  return { id: created.id, testRunId };
};

const assertUpCheckShape = (
  type: SyntheticsMonitorType,
  check: SyntheticsCheckDoc,
  target: AgentStack['target']
) => {
  expect(check.monitor?.type).toBe(type);

  switch (type) {
    case 'http':
      expect(check.url?.full).toContain(target.url);
      expect(check.http?.response?.status_code).toBe(200);
      break;
    case 'tcp':
      expect(check.url?.full ?? '').toContain(String(target.port));
      break;
    case 'icmp':
      expect(
        [check.url?.full, check.url?.domain, check.resolve?.ip, check.monitor?.ip]
          .filter(Boolean)
          .join(' ')
      ).toMatch(/host\.docker\.internal|\d+\.\d+\.\d+\.\d+/);
      break;
    case 'browser':
      expect(check.synthetics?.type).toBe('heartbeat/summary');
      expect(check.url?.full).toContain(target.url);
      break;
  }
};

const assertBrowserJourneyStep = async (
  esClient: EsClient,
  configId: string,
  testRunId?: string
) => {
  const step = await waitForBrowserStep(esClient, {
    configId,
    testRunId,
    stepName: BROWSER_STEP_NAME,
    timeoutMs: CHECK_TIMEOUT,
  });
  expect(step.synthetics?.step?.name).toBe(BROWSER_STEP_NAME);
  expect(step.synthetics?.step?.status).toBe('succeeded');
};

/**
 * Real Elastic Agent + Fleet Server E2E: create each monitor type on a private
 * location, trigger test-now, and wait for the agent-written check document.
 *
 * Requires Docker and the `synthetics_agent_e2e` Scout server config:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet synthetics_agent_e2e
 *   node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/synthetics/test/scout_synthetics_agent_e2e/api/playwright.config.ts
 */
apiTest.describe(
  'Synthetics real-agent monitor types',
  { tag: ['@local-stateful-classic'] },
  () => {
    let editorHeaders: Record<string, string>;
    const createdMonitorIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, apiClient, agentStack }) => {
      apiTest.setTimeout(TEST_TIMEOUT);
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      await enableSynthetics(apiClient, editorHeaders);
      expect(agentStack.privateLocation.id).not.toBe('');
    });

    apiTest.afterAll(async ({ apiClient }) => {
      if (createdMonitorIds.length > 0) {
        await deleteMonitors(apiClient, editorHeaders, createdMonitorIds, { ignoreErrors: true });
      }
    });

    for (const type of MONITOR_TYPES) {
      apiTest(
        `runs a ${type} monitor on an enrolled agent`,
        async ({ apiClient, esClient, agentStack }) => {
          apiTest.setTimeout(TEST_TIMEOUT);
          const { id, testRunId } = await createAndRunMonitor(
            apiClient,
            editorHeaders,
            createdMonitorIds,
            buildMonitorPayload(type, agentStack)
          );

          const check = await waitForSyntheticsCheck(esClient, {
            type,
            configId: id,
            testRunId,
            timeoutMs: CHECK_TIMEOUT,
          });

          expect(isCheckUp(check)).toBe(true);
          assertUpCheckShape(type, check, agentStack.target);

          if (type === 'browser') {
            await assertBrowserJourneyStep(esClient, id, testRunId);
          }
        }
      );
    }

    apiTest(
      'records a down http check when the target returns 5xx',
      async ({ apiClient, esClient, agentStack }) => {
        apiTest.setTimeout(TEST_TIMEOUT);
        const { id, testRunId } = await createAndRunMonitor(
          apiClient,
          editorHeaders,
          createdMonitorIds,
          buildDownHttpMonitorPayload(agentStack)
        );

        const check = await waitForSyntheticsCheck(esClient, {
          type: 'http',
          configId: id,
          testRunId,
          expectStatus: 'down',
          timeoutMs: CHECK_TIMEOUT,
        });

        expect(isCheckDown(check)).toBe(true);
        expect(check.monitor?.type).toBe('http');
        expect(check.url?.full).toContain(agentStack.target.url);
        expect(check.http?.response?.status_code).toBe(500);
      }
    );
  }
);
