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
  FILE_STORAGE_DATA_INDEX,
  FILE_STORAGE_METADATA_INDEX,
} from '../../../../common/endpoint/constants';
import { getFileDownloadId } from '../../../../common/endpoint/service/response_actions/get_file_download_id';
import {
  sendEndpointActionResponse,
  sendFleetActionResponse,
} from '../../../../scripts/endpoint/common/response_actions';
import { createSystemIndicesEsClient } from '../ui/fixtures/system_indices_es_client';

interface AgentStatusResponse {
  data: Record<string, { isolated: boolean }>;
}

/**
 * Writes a successful Fleet and Endpoint response for `action`, plus the command's side
 * effects: for isolate and release it updates `Endpoint.state.isolation`; for get-file
 * (also execute and runscript) it uploads the file metadata and its single data chunk
 * to Fleet file storage (see `getFileUploadDocIds`).
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
 * Deletes the Fleet and Endpoint requests and responses of the given actions, whatever
 * the command (isolate, release, get-file...). File uploads are left to `deleteGetFileUploads`.
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

/** Ids of the file metadata and chunk documents that `completeHostAction` writes for get-file. */
export const getFileUploadDocIds = (
  action: ActionDetails
): { metadataIds: string[]; dataIds: string[] } => {
  const metadataIds = action.agents.map((agentId) => getFileDownloadId(action, agentId));
  // The mock upload writes a single chunk per file.
  return { metadataIds, dataIds: metadataIds.map((id) => `${id}.0`) };
};

/**
 * Deletes the file metadata and chunk documents that `completeHostAction` uploads
 * for get-file actions. `deleteSubmittedHostActions` does not touch Fleet file storage.
 */
export const deleteGetFileUploads = async ({
  esClient,
  config,
  actions,
}: {
  esClient: EsClient;
  config: ScoutTestConfig;
  actions: readonly ActionDetails[];
}): Promise<void> => {
  if (actions.length === 0) {
    return;
  }

  const metadataIds: string[] = [];
  const dataIds: string[] = [];
  for (const action of actions) {
    const ids = getFileUploadDocIds(action);
    metadataIds.push(...ids.metadataIds);
    dataIds.push(...ids.dataIds);
  }

  const systemEsClient = await createSystemIndicesEsClient(esClient, config);
  try {
    const failures: unknown[] = [];
    for (const [index, ids] of [
      [FILE_STORAGE_METADATA_INDEX, metadataIds],
      [FILE_STORAGE_DATA_INDEX, dataIds],
    ] as const) {
      try {
        // Fleet file storage indices are data streams, so delete by query (delete by id
        // needs the backing index). They are Fleet-owned, so send the fleet product origin.
        await systemEsClient.deleteByQuery(
          {
            index,
            query: { ids: { values: ids } },
            conflicts: 'proceed',
            ignore_unavailable: true,
            allow_no_indices: true,
            refresh: true,
            wait_for_completion: true,
          },
          { headers: { 'X-elastic-product-origin': 'fleet' } }
        );
      } catch (error) {
        failures.push(error);
      }
    }

    if (failures.length === 1) {
      throw failures[0];
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, 'Failed to delete get-file uploads');
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
