/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { ACTION_DETAILS_ROUTE, SCAN_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointOperationsAnalyst } from '../../../../scripts/endpoint/common/roles_users/endpoint_operations_analyst';
import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';
import { apiTest } from '../fixtures';

const ACTION_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 12 * 60 * 1000;
const SCAN_SUCCESS_CODE = 'ra_scan_success_done';
const SCAN_NOT_FOUND_CODE = 'ra_scan_error_not-found';

interface ScanActionBody {
  data: {
    id: string;
    command: string;
    status: string;
    agents: string[];
    isCompleted: boolean;
    wasSuccessful: boolean;
    errors?: string[];
    parameters?: { path?: string };
    outputs?: Record<string, { content?: { code?: string } }>;
  };
}

const endpointOperationsAnalystRole = (): KibanaRole => {
  const role = getEndpointOperationsAnalyst();

  return {
    elasticsearch: {
      cluster: [...(role.elasticsearch.cluster ?? [])],
      indices: role.elasticsearch.indices?.map((index) => ({
        names: [...index.names],
        privileges: [...index.privileges],
      })),
    },
    kibana: role.kibana.map((kibana) => ({
      base: [...(kibana.base ?? [])],
      feature: kibana.feature,
      spaces: [...kibana.spaces],
    })),
  };
};

const actionDetailsPath = (actionId: string): string =>
  ACTION_DETAILS_ROUTE.replace('{action_id}', encodeURIComponent(actionId));

const shellQuote = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`;

const runOnHost = async (hostname: string, script: string): Promise<string> => {
  const result = await getHostVmClient(hostname).exec(`bash -lc ${JSON.stringify(script)}`);
  return result.stdout.trim();
};

apiTest.describe('Real agent scan response action', { tag: ['@local-stateful-classic'] }, () => {
  let requestHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
      endpointOperationsAnalystRole()
    );
    requestHeaders = {
      ...apiKeyHeader,
      ...PUBLIC_API_HEADERS,
      'kbn-xsrf': 'scout-edr-real-fleet',
      'Content-Type': 'application/json',
    };
  });

  apiTest(
    'returns the agent scan result code for an existing file and a missing path',
    async ({ apiClient, enrolledEndpoint }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      const { agentId, hostname } = enrolledEndpoint;
      const home = await runOnHost(hostname, 'printf %s "$HOME"');
      const filePath = `${home}/scan-target-${Date.now()}.txt`;
      const missingPath = `${home}/scan-missing-${Date.now()}`;

      const sendScan = async (path: string): Promise<string> => {
        const response = await apiClient.post(SCAN_ROUTE, {
          headers: requestHeaders,
          responseType: 'json',
          body: {
            endpoint_ids: [agentId],
            agent_type: 'endpoint',
            parameters: { path },
          },
        });

        expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
        const action = (response.body as ScanActionBody).data;
        expect(action.command).toBe('scan');
        expect(action.agents).toContain(agentId);
        expect(action.parameters?.path).toBe(path);

        return action.id;
      };

      const waitForOutputCode = async (
        actionId: string,
        expectedCode: string
      ): Promise<ScanActionBody['data']> => {
        let completed: ScanActionBody['data'] | undefined;

        await expect
          .poll(
            async () => {
              const response = await apiClient.get(actionDetailsPath(actionId), {
                headers: requestHeaders,
                responseType: 'json',
              });
              if (response.statusCode !== 200) {
                return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
              }

              const action = (response.body as ScanActionBody).data;
              if (!action.isCompleted) {
                return 'pending';
              }

              completed = action;
              return action.outputs?.[agentId]?.content?.code;
            },
            { timeout: ACTION_TIMEOUT_MS, intervals: [2_000] }
          )
          .toBe(expectedCode);

        if (!completed) {
          throw new Error(`Action ${actionId} completed without a stored response`);
        }

        return completed;
      };

      await apiTest.step('scan an existing file', async () => {
        await runOnHost(
          hostname,
          `printf '%s\\n' 'This is a test file for the scan command.' > ${shellQuote(filePath)}`
        );

        try {
          const actionId = await sendScan(filePath);
          const action = await waitForOutputCode(actionId, SCAN_SUCCESS_CODE);
          expect(action.status).toBe('successful');
          expect(action.wasSuccessful).toBe(true);
          expect(action.errors ?? []).toStrictEqual([]);
        } finally {
          await runOnHost(hostname, `rm -f ${shellQuote(filePath)}`).catch(() => undefined);
        }
      });

      await apiTest.step('scan a path that does not exist', async () => {
        const actionId = await sendScan(missingPath);
        const action = await waitForOutputCode(actionId, SCAN_NOT_FOUND_CODE);
        expect(action.status).toBe('failed');
        expect(action.wasSuccessful).toBe(false);
        expect(action.errors?.length ?? 0).toBeGreaterThan(0);
      });
    }
  );
});
