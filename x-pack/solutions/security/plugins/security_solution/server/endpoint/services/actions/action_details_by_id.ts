/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EndpointAppContextService,
  ScopedEndpointServices,
} from '../../endpoint_app_context_services';
import { fetchActionRequestById } from './utils/fetch_action_request_by_id';
import type { FetchActionResponsesResult } from './utils/fetch_action_responses';
import { fetchActionResponses } from './utils/fetch_action_responses';
import {
  mapToNormalizedActionRequest,
  getAgentHostNamesWithIds,
  createActionDetailsRecord,
} from './utils';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { EndpointError, isEndpointError } from '../../../../common/endpoint/errors';
import { NotFoundError } from '../../errors';

/**
 * Get Action Details for a single action id
 * @param endpointService
 * @param spaceId
 * @param actionId
 */
export const getActionDetailsById = async <T extends ActionDetails = ActionDetails>(
  endpointService: EndpointAppContextService,
  spaceId: string,
  actionId: string,
  {
    bypassSpaceValidation = false,
    scoped,
  }: Partial<{
    /**
     * if `true`, then no space validations will be done on the action retrieved. Default is `false`.
     * USE IT CAREFULLY!
     */
    bypassSpaceValidation: boolean;
    /** Required for these reads to fan out under CPS; without it they are origin-only */
    scoped: ScopedEndpointServices;
  }> = {}
): Promise<T> => {
  let normalizedActionRequest: ReturnType<typeof mapToNormalizedActionRequest> | undefined;
  let actionResponses: FetchActionResponsesResult;

  try {
    // Get both the Action Request(s) and action Response(s)
    const [actionRequestEsDoc, actionResponseResult] = await Promise.all([
      // Get the action request(s)
      fetchActionRequestById(endpointService, spaceId, actionId, {
        bypassSpaceValidation,
        scoped,
      }),

      // Get all responses
      fetchActionResponses({
        esClient: endpointService.getInternalEsClient(),
        endpointService,
        scoped,
        actionIds: [actionId],
      }),
    ]);

    actionResponses = actionResponseResult;
    normalizedActionRequest = mapToNormalizedActionRequest(actionRequestEsDoc);
  } catch (error) {
    if (isEndpointError(error)) {
      throw error;
    }

    throw new EndpointError(error.message, error);
  }

  // If action id was not found, error out
  if (!normalizedActionRequest) {
    throw new NotFoundError(`Action with id '${actionId}' not found.`);
  }

  // get host metadata info with queried agents
  let agentsHostInfo =
    normalizedActionRequest.agentType === 'endpoint'
      ? await getAgentHostNamesWithIds({
          endpointService,
          spaceId,
          agentIds: normalizedActionRequest.agents,
        })
      : {};

  // Origin-only enrichment leaves linked-project agents with empty names.
  // Under CPS, fall back to the request-scoped metadata index for those.
  if (scoped?.isCpsRead() && normalizedActionRequest.agentType === 'endpoint') {
    const unresolvedAgentIds = normalizedActionRequest.agents.filter(
      (agentId) => !agentsHostInfo[agentId]
    );

    if (unresolvedAgentIds.length) {
      // Batch into bounded searches: one search for the whole fan-out exceeds
      // Elasticsearch's 10,000-result window for large actions — the search is
      // then rejected and the catch silently drops ALL linked-project hostnames.
      const HOSTNAME_LOOKUP_BATCH_SIZE = 500;
      const hostnameByAgentId = new Map<string, string>();

      for (
        let offset = 0;
        offset < unresolvedAgentIds.length;
        offset += HOSTNAME_LOOKUP_BATCH_SIZE
      ) {
        const batch = unresolvedAgentIds.slice(offset, offset + HOSTNAME_LOOKUP_BATCH_SIZE);
        const kuery = `united.agent.agent.id: (${batch.map((id) => `"${id}"`).join(' OR ')})`;
        // Best-effort: a failed batch leaves names empty rather than failing the whole read
        const metadata = await endpointService
          .getEndpointMetadataService(spaceId)
          .getHostMetadataList({ page: 0, pageSize: batch.length, kuery }, scoped)
          .catch((error) => {
            endpointService
              .createLogger('getActionDetailsById')
              .warn(`Failed to resolve linked-project hostnames: ${error.message}`);
            return undefined;
          });

        // Index the metadata rows by agent id once. A `.find()` per unresolved
        // agent rescans the whole metadata result every time, so a fan-out
        // action targeting thousands of agents performs millions of
        // comparisons and can delay or time out both this read and the status
        // tool. A Map makes the enrichment linear in the fan-out.
        for (const entry of metadata?.data ?? []) {
          const agentId = entry.metadata?.agent?.id;
          const hostname = entry.metadata?.host?.hostname;

          // First row wins, matching the previous `.find()` semantics when a
          // backend returns more than one row for the same agent id.
          if (agentId && hostname && !hostnameByAgentId.has(agentId)) {
            hostnameByAgentId.set(agentId, hostname);
          }
        }
      }

      agentsHostInfo = unresolvedAgentIds.reduce(
        (acc, agentId) => {
          const hostname = hostnameByAgentId.get(agentId);

          if (hostname) {
            acc[agentId] = hostname;
          }

          return acc;
        },
        { ...agentsHostInfo }
      );
    }
  }

  return createActionDetailsRecord<T>(normalizedActionRequest, actionResponses, agentsHostInfo);
};
