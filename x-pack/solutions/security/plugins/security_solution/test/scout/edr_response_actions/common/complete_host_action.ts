/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import type { EsClient, KbnClient, ScoutTestConfig } from '@kbn/scout-security';
import { INTERNAL_API_HEADERS } from '@kbn/scout-security';
import type { ActionDetails } from '../../../../common/endpoint/types';
import {
  AGENT_STATUS_ROUTE,
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';
import {
  sendEndpointActionResponse,
  sendFleetActionResponse,
} from '../../../../scripts/endpoint/common/response_actions';
import { createSystemIndicesEsClient } from '../ui/fixtures/system_indices_es_client';

interface AgentStatusResponse {
  data: Record<string, { isolated: boolean }>;
}

/**
 * Writes a successful agent acknowledgement and updates `Endpoint.state.isolation`.
 * This is the Scout equivalent of the Cypress `sendHostActionResponse` task.
 */
export const completeHostAction = async ({
  esClient,
  config,
  action,
}: {
  esClient: EsClient;
  config: ScoutTestConfig;
  action: ActionDetails;
}): Promise<void> => {
  const systemEsClient = await createSystemIndicesEsClient(esClient, config);
  try {
    const fleetResponse = await sendFleetActionResponse(systemEsClient, action, {
      state: 'success',
    });
    if (fleetResponse.error) {
      throw new Error(
        `Fleet action response for ${action.command} ${action.id} failed: ${fleetResponse.error}`
      );
    }
    await sendEndpointActionResponse(systemEsClient, action, { state: 'success' });
  } finally {
    await systemEsClient.close();
  }
};

const FLEET_ACTION_INDICES = [AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX];
const ENDPOINT_ACTION_INDICES = [ENDPOINT_ACTIONS_INDEX, ENDPOINT_ACTION_RESPONSES_INDEX];

/**
 * Deletes isolate and release requests and responses written during the test.
 * Host teardown only removes action ids captured at seed time.
 */
export const deleteSubmittedHostActions = async ({
  esClient,
  config,
  actionIds,
}: {
  esClient: EsClient;
  config: ScoutTestConfig;
  actionIds: readonly string[];
}): Promise<void> => {
  if (actionIds.length === 0) {
    return;
  }

  const ids = [...actionIds];
  const query: estypes.QueryDslQueryContainer = {
    bool: {
      should: [{ terms: { action_id: ids } }, { terms: { 'EndpointActions.action_id': ids } }],
      minimum_should_match: 1,
    },
  };
  const systemEsClient = await createSystemIndicesEsClient(esClient, config);

  const deleteMatching = async (
    index: string[],
    options?: { headers: { 'X-elastic-product-origin': string } }
  ): Promise<void> => {
    await systemEsClient.deleteByQuery(
      {
        index,
        query,
        conflicts: 'proceed',
        ignore_unavailable: true,
        allow_no_indices: true,
        refresh: true,
        wait_for_completion: true,
      },
      options
    );
  };

  try {
    const failures: unknown[] = [];

    try {
      // .fleet-actions-results is a system data stream and rejects this call without the fleet origin.
      await deleteMatching(FLEET_ACTION_INDICES, {
        headers: { 'X-elastic-product-origin': 'fleet' },
      });
    } catch (error) {
      failures.push(error);
    }

    try {
      await deleteMatching(ENDPOINT_ACTION_INDICES);
    } catch (error) {
      failures.push(error);
    }

    if (failures.length === 1) {
      throw failures[0];
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, 'Failed to delete submitted host actions');
    }
  } finally {
    await systemEsClient.close();
  }
};

/**
 * Waits until agent status reports the isolation flag written by `completeHostAction`.
 * The metadata transform has to pick up the new document before the flyout can show it.
 */
export const waitForHostIsolation = async ({
  kbnClient,
  spaceId,
  agentId,
  isolated,
}: {
  kbnClient: KbnClient;
  spaceId: string;
  agentId: string;
  isolated: boolean;
}): Promise<void> => {
  const deadline = Date.now() + 60_000;
  const pathPrefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
  const path = `${pathPrefix}${AGENT_STATUS_ROUTE}?agentIds=${encodeURIComponent(
    agentId
  )}&agentType=endpoint`;

  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await kbnClient.request<AgentStatusResponse>({
        method: 'GET',
        path,
        headers: {
          'kbn-xsrf': 'scout',
          ...INTERNAL_API_HEADERS,
        },
      });

      if (response.data?.data?.[agentId]?.isolated === isolated) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  const detail = lastError instanceof Error ? `: ${lastError.message}` : '';
  throw new Error(
    `Timed out waiting for agent ${agentId} isolation to be ${isolated} in space ${spaceId}${detail}`
  );
};
