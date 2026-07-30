/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { ISearchRequestParams } from '@kbn/search-types';
import type { EndpointFleetServicesInterface } from '../../services/fleet';
import { policyIndexPattern } from '../../../../common/endpoint/constants';
import { catchAndWrapError } from '../../utils';
import { INITIAL_POLICY_ID } from '.';
import type { GetHostPolicyResponse, HostPolicyResponse } from '../../../../common/endpoint/types';
import { prefixIndexPatternsWithCcs } from '../../utils/ccs_utils';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';

export const getESQueryPolicyResponseByAgentID = (
  agentID: string,
  index: string
): ISearchRequestParams => {
  return {
    query: {
      bool: {
        filter: {
          term: {
            'agent.id': agentID,
          },
        },
        must_not: {
          term: {
            'Endpoint.policy.applied.id': INITIAL_POLICY_ID,
          },
        },
      },
    },
    sort: [
      {
        'event.created': {
          order: 'desc',
        },
      },
    ],
    size: 1,
    index,
  };
};

export interface GetPolicyResponseByAgentIdOptions {
  agentID: string;
  esClient: ElasticsearchClient;
  endpointService: EndpointAppContextService;
  fleetServices: EndpointFleetServicesInterface;
  ccsEnabled: boolean;
  /** Required for the read to fan out under CPS; without it the read is origin-only */
  request?: KibanaRequest;
}

export async function getPolicyResponseByAgentId({
  agentID,
  esClient,
  endpointService,
  fleetServices,
  ccsEnabled,
  request,
}: GetPolicyResponseByAgentIdOptions): Promise<GetHostPolicyResponse | undefined> {
  const cpsEnabled = endpointService.isCpsEnabled();
  const query = getESQueryPolicyResponseByAgentID(
    agentID,
    prefixIndexPatternsWithCcs(policyIndexPattern, ccsEnabled)
  );
  const response = await (cpsEnabled ? endpointService.getReadEsClient(request) : esClient)
    .search<HostPolicyResponse>(query)
    .catch(catchAndWrapError);

  if (response.hits.hits.length > 0 && response.hits.hits[0]._source != null) {
    await ensureAgentVisibleInCurrentSpace({
      agentID,
      endpointService,
      fleetServices,
      cpsEnabled,
    });

    return {
      policy_response: response.hits.hits[0]._source,
    };
  }

  return undefined;
}

/**
 * Ensures the agent whose policy response was found is visible in this space. These documents carry
 * no space field, so unlike the action index the check has to stay with Fleet.
 *
 * Under CPS, Fleet conflates two cases that must diverge: an agent enrolled here in another space,
 * which stays hidden, and one not enrolled here at all, which is a fanned-in document and must render.
 *
 * @internal
 */
const ensureAgentVisibleInCurrentSpace = async ({
  agentID,
  endpointService,
  fleetServices,
  cpsEnabled,
}: Pick<GetPolicyResponseByAgentIdOptions, 'agentID' | 'endpointService' | 'fleetServices'> & {
  cpsEnabled: boolean;
}): Promise<void> => {
  try {
    await fleetServices.ensureInCurrentSpace({ agentIds: [agentID] });
  } catch (err) {
    if (!cpsEnabled) {
      throw err;
    }

    const logger = endpointService.createLogger('getPolicyResponseByAgentId');
    const [locallyEnrolledAgent] = await endpointService
      .getInternalFleetServices(undefined, true)
      .fetchAgentsById([agentID], { ignoreMissing: true })
      .catch(catchAndWrapError);

    if (locallyEnrolledAgent) {
      logger.debug(() => `Agent [${agentID}] is not visible in space [${fleetServices.spaceId}]`);

      throw err;
    }

    logger.debug(
      () =>
        `Agent [${agentID}] is not enrolled in this project; treating as a linked project's agent`
    );
  }
};
