/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ISearchRequestParams } from '@kbn/search-types';
import type { EndpointFleetServicesInterface } from '../../services/fleet';
import { policyIndexPattern } from '../../../../common/endpoint/constants';
import { catchAndWrapError } from '../../utils';
import { INITIAL_POLICY_ID } from '.';
import type { GetHostPolicyResponse, HostPolicyResponse } from '../../../../common/endpoint/types';
import { prefixIndexPatternsWithCcs } from '../../utils/ccs_utils';
import { isFannedInHit } from '../../utils/cps_read_routing';
import type {
  EndpointAppContextService,
  ScopedEndpointServices,
} from '../../endpoint_app_context_services';

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
  scoped?: ScopedEndpointServices;
}

export async function getPolicyResponseByAgentId({
  agentID,
  esClient,
  endpointService,
  fleetServices,
  ccsEnabled,
  scoped,
}: GetPolicyResponseByAgentIdOptions): Promise<GetHostPolicyResponse | undefined> {
  const cpsRead = scoped?.isCpsRead() ?? false;
  // CCS remote outputs and CPS fan-in both prefix a hit's `_index` with an alias, and the visibility
  // check below can only read one meaning out of that colon. Under CPS the policy read therefore
  // gives up searching CCS remote outputs — deliberate, since the two topologies are not meant to be
  // enabled together.
  const query = getESQueryPolicyResponseByAgentID(
    agentID,
    prefixIndexPatternsWithCcs(policyIndexPattern, ccsEnabled && !cpsRead)
  );
  const response = await (cpsRead && scoped ? scoped.getEsClient() : esClient)
    .search<HostPolicyResponse>(query)
    .catch(catchAndWrapError);

  if (response.hits.hits.length > 0 && response.hits.hits[0]._source != null) {
    await ensureAgentVisibleInCurrentSpace({
      agentID,
      endpointService,
      fleetServices,
      cpsRead,
      hitIndex: response.hits.hits[0]._index,
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
  cpsRead,
  hitIndex,
}: Pick<GetPolicyResponseByAgentIdOptions, 'agentID' | 'endpointService' | 'fleetServices'> & {
  cpsRead: boolean;
  hitIndex?: string;
}): Promise<void> => {
  try {
    await fleetServices.ensureInCurrentSpace({ agentIds: [agentID] });
  } catch (err) {
    // An origin-local agent that has since been unenrolled from Fleet is indistinguishable from a
    // linked project's agent by lookup alone, so the document has to have come from one.
    if (!cpsRead || !isFannedInHit(hitIndex)) {
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
