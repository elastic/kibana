/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  ACTION_DETAILS_ROUTE,
  HOST_METADATA_GET_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
} from '../../../../common/endpoint/constants';
import { getEndpointOperationsAnalyst } from '../../../../scripts/endpoint/common/roles_users/endpoint_operations_analyst';
import { apiTest } from '../fixtures';

const ACTION_TIMEOUT_MS = 180_000;
const METADATA_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 12 * 60 * 1000;

interface ActionDetailsBody {
  data: {
    id: string;
    command: string;
    status: string;
    agents: string[];
    isCompleted: boolean;
  };
}

interface HostMetadataBody {
  metadata: {
    Endpoint: {
      state?: {
        isolation?: boolean;
      };
    };
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

const hostMetadataPath = (agentId: string): string =>
  HOST_METADATA_GET_ROUTE.replace('{id}', encodeURIComponent(agentId));

apiTest.describe('Real agent host isolation', { tag: ['@local-stateful-classic'] }, () => {
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
    'isolates an enrolled host and then releases it',
    async ({ apiClient, enrolledEndpoint }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      const { agentId } = enrolledEndpoint;

      const readIsolation = async (): Promise<boolean | string> => {
        const response = await apiClient.get(hostMetadataPath(agentId), {
          headers: requestHeaders,
          responseType: 'json',
        });
        if (response.statusCode !== 200) {
          return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
        }

        return (response.body as HostMetadataBody).metadata.Endpoint.state?.isolation === true;
      };

      const waitForIsolation = async (isolated: boolean): Promise<void> => {
        await expect
          .poll(readIsolation, { timeout: METADATA_TIMEOUT_MS, intervals: [2_000] })
          .toBe(isolated);
      };

      const waitForSuccessfulAction = async (actionId: string): Promise<void> => {
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

              const action = (response.body as ActionDetailsBody).data;
              if (action.isCompleted && action.status !== 'successful') {
                throw new Error(
                  `Action ${actionId} completed with status ${action.status}: ${JSON.stringify(
                    action
                  )}`
                );
              }

              return action.status;
            },
            { timeout: ACTION_TIMEOUT_MS, intervals: [2_000] }
          )
          .toBe('successful');
      };

      const sendAction = async (command: 'isolate' | 'unisolate'): Promise<string> => {
        const response = await apiClient.post(
          command === 'isolate' ? ISOLATE_HOST_ROUTE_V2 : UNISOLATE_HOST_ROUTE_V2,
          {
            headers: requestHeaders,
            responseType: 'json',
            body: {
              endpoint_ids: [agentId],
              agent_type: 'endpoint',
            },
          }
        );

        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
        const action = (response.body as ActionDetailsBody).data;
        expect(action.command).toBe(command);
        expect(action.agents).toContain(agentId);

        return action.id;
      };

      await waitForIsolation(false);

      const isolateActionId = await sendAction('isolate');
      await waitForSuccessfulAction(isolateActionId);
      await waitForIsolation(true);

      const unisolateActionId = await sendAction('unisolate');
      await waitForSuccessfulAction(unisolateActionId);
      await waitForIsolation(false);
    }
  );
});
