/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, KibanaRole } from '@kbn/scout-security';
import { getPlaywrightTagsFor, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { ACTION_DETAILS_ROUTE, SCAN_ROUTE } from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  ActionDetailsApiResponse,
  ResponseActionScanOutputContent,
  ResponseActionScanParameters,
} from '../../../../common/endpoint/types';
import { getEndpointOperationsAnalyst } from '../../../../scripts/endpoint/common/roles_users/endpoint_operations_analyst';
import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';
import { apiTest } from '../fixtures';

const ACTION_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 12 * 60 * 1000;
const SCAN_SUCCESS_CODE = 'ra_scan_success_done';
const SCAN_NOT_FOUND_CODE = 'ra_scan_error_not-found';

/**
 * Local stateful and local serverless Security complete.
 * Cloud serverless is MKI. This spec enrolls a local Endpoint VM and is not tagged for it.
 */
const SCAN_ACTION_TAGS = [
  ...getPlaywrightTagsFor('stateful', 'classic', 'local'),
  ...getPlaywrightTagsFor('serverless', 'security_complete', 'local'),
];

type ScanActionDetails = ActionDetails<
  ResponseActionScanOutputContent,
  ResponseActionScanParameters
>;
type ScanActionResponse = ActionDetailsApiResponse<
  ResponseActionScanOutputContent,
  ResponseActionScanParameters
>;

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

const runOnHost = async (hostname: string, command: string): Promise<void> => {
  await getHostVmClient(hostname).exec(command);
};

const sendScan = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  agentId: string,
  path: string
): Promise<string> => {
  const response = await apiClient.post<ScanActionResponse>(SCAN_ROUTE, {
    headers,
    responseType: 'json',
    body: {
      endpoint_ids: [agentId],
      agent_type: 'endpoint',
      parameters: { path },
    },
  });

  expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
  const action = response.body.data;
  expect(action.command).toBe('scan');
  expect(action.agents).toContain(agentId);
  expect(action.parameters?.path).toBe(path);

  return action.id;
};

const waitForCompletedAction = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  actionId: string
): Promise<ScanActionDetails> => {
  let completed: ScanActionDetails | undefined;

  await expect
    .poll(
      async () => {
        const response = await apiClient.get<ScanActionResponse>(actionDetailsPath(actionId), {
          headers,
          responseType: 'json',
        });
        if (response.statusCode !== 200) {
          return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
        }

        const action = response.body.data;
        if (!action.isCompleted) {
          return 'pending';
        }

        completed = action;
        return 'completed';
      },
      { timeout: ACTION_TIMEOUT_MS, intervals: [2_000] }
    )
    .toBe('completed');

  expect(completed, `Action ${actionId} completed without a stored response`).toBeDefined();
  return completed as ScanActionDetails;
};

apiTest.describe('Real agent scan response action', { tag: SCAN_ACTION_TAGS }, () => {
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
    'returns ra_scan_success_done for an existing file',
    async ({ apiClient, enrolledEndpoint }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      const { agentId, hostname } = enrolledEndpoint;
      const filePath = `/tmp/scan-target-${Date.now()}.txt`;

      try {
        await runOnHost(hostname, `touch ${filePath}`);
        const actionId = await sendScan(apiClient, requestHeaders, agentId, filePath);
        const action = await waitForCompletedAction(apiClient, requestHeaders, actionId);
        expect(action.outputs?.[agentId]?.content.code).toBe(SCAN_SUCCESS_CODE);
        expect(action.status).toBe('successful');
        expect(action.wasSuccessful).toBe(true);
        expect(action.errors ?? []).toStrictEqual([]);
      } finally {
        await runOnHost(hostname, `rm -f ${filePath}`).catch(() => undefined);
      }
    }
  );

  apiTest(
    'returns ra_scan_error_not-found for a missing path',
    async ({ apiClient, enrolledEndpoint }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      const { agentId } = enrolledEndpoint;
      const missingPath = `/tmp/scan-missing-${Date.now()}`;

      const actionId = await sendScan(apiClient, requestHeaders, agentId, missingPath);
      const action = await waitForCompletedAction(apiClient, requestHeaders, actionId);
      expect(action.outputs?.[agentId]?.content.code).toBe(SCAN_NOT_FOUND_CODE);
      expect(action.status).toBe('failed');
      expect(action.wasSuccessful).toBe(false);
      expect(action.errors?.length ?? 0).toBeGreaterThan(0);
    }
  );
});
