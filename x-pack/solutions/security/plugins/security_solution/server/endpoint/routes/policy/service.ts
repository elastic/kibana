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

export async function getPolicyResponseByAgentId(
  agentID: string,
  esClient: ElasticsearchClient,
  fleetServices: EndpointFleetServicesInterface,
  ccsEnabled: boolean
): Promise<GetHostPolicyResponse | undefined> {
  const query = getESQueryPolicyResponseByAgentID(
    agentID,
    prefixIndexPatternsWithCcs(policyIndexPattern, ccsEnabled)
  );
  const response = await esClient.search<HostPolicyResponse>(query).catch(catchAndWrapError);

  if (response.hits.hits.length > 0 && response.hits.hits[0]._source != null) {
    // Ensure agent is in the current space id. Call to fleet will Error if agent is not in current space
    await fleetServices.ensureInCurrentSpace({ agentIds: [agentID] });

    return {
      policy_response: response.hits.hits[0]._source,
    };
  }

  return undefined;
}
