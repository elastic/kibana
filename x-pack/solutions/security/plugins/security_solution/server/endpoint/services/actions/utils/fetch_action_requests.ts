/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchRequest,
  QueryDslQueryContainer,
  QueryDslBoolQuery,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { EndpointAppContextService } from '../../../endpoint_app_context_services';
import { CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION } from '../../../../../common/endpoint/service/response_actions/crowdstrike';
import type { EndpointInternalFleetServicesInterface } from '../../fleet';
import { stringify } from '../../../utils/stringify';
import { getDateFilters } from '../..';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { catchAndWrapError } from '../../../utils';
import type { LogsEndpointAction } from '../../../../../common/endpoint/types';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
  ResponseActionType,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { MICROSOFT_DEFENDER_INDEX_PATTERNS_BY_INTEGRATION } from '../../../../../common/endpoint/service/response_actions/microsoft_defender';

export interface FetchActionRequestsOptions {
  spaceId: string;
  endpointService: EndpointAppContextService;
  from?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
  agentTypes?: ResponseActionAgentType[];
  commands?: ResponseActionsApiCommandNames[];
  elasticAgentIds?: string[];
  userIds?: string[];
  unExpiredOnly?: boolean;
  types?: ResponseActionType[];
}

interface FetchActionRequestsResponse {
  data: LogsEndpointAction[];
  total: number;
  from: number;
  size: number;
}

/**
 * Fetches a list of Action Requests from the Endpoint action request index (not fleet)
 * @param logger
 * @param agentTypes
 * @param commands
 * @param elasticAgentIds
 * @param esClient
 * @param endDate
 * @param from
 * @param size
 * @param startDate
 * @param userIds
 * @param unExpiredOnly
 * @param types
 */
export const fetchActionRequests = async ({
  endpointService,
  spaceId,
  from = 0,
  size = 10,
  agentTypes,
  commands,
  elasticAgentIds,
  endDate,
  startDate,
  userIds,
  unExpiredOnly = false,
  types,
}: FetchActionRequestsOptions): Promise<FetchActionRequestsResponse> => {
  const esClient = endpointService.getInternalEsClient();
  const logger = endpointService.createLogger('FetchActionRequests');
  const fleetServices = endpointService.getInternalFleetServices(spaceId);
  const additionalFilters = [];

  if (commands?.length) {
    additionalFilters.push({ terms: { 'data.command': commands } });
  }

  if (agentTypes?.length) {
    additionalFilters.push({ terms: { input_type: agentTypes } });
  }

  if (elasticAgentIds?.length) {
    additionalFilters.push({ terms: { agents: elasticAgentIds } });
  }

  if (unExpiredOnly) {
    additionalFilters.push({ range: { expiration: { gte: 'now' } } });
  }

  const must: QueryDslQueryContainer[] = [];

  // if space awareness is enabled, then add filter for integration policy ids
  if (endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    logger.debug(
      () =>
        `Space awareness is enabled - adding filter to narrow results to only response actions visible in space [${spaceId}]`
    );

    must.push({
      bool: {
        filter: {
          terms: {
            'agent.policy.integrationPolicyId': await fetchIntegrationPolicyIds(fleetServices),
          },
        },
      },
    });
  }

  // Add the date filters
  must.push({
    bool: {
      filter: [...getDateFilters({ startDate, endDate }), ...additionalFilters],
    },
  });

  if (userIds?.length) {
    const userIdsKql = userIds.map((userId) => `user_id:${userId}`).join(' or ');
    const mustClause = toElasticsearchQuery(fromKueryExpression(userIdsKql));
    must.push(mustClause);
  }

  const isNotASingleActionType = !types || (types && types.length > 1);

  const actionsSearchQuery: SearchRequest = {
    index: ENDPOINT_ACTIONS_INDEX,
    size,
    from,
    query: {
      bool: {
        must,
        ...(isNotASingleActionType ? {} : getActionTypeFilter(types[0])),
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  };

  const actionRequests = await esClient
    .search<LogsEndpointAction>(actionsSearchQuery, { ignore: [404] })
    .catch(catchAndWrapError);

  const total = (actionRequests.hits?.total as SearchTotalHits)?.value;

  logger.debug(
    `Searching for action requests found a total of [${total}] records using search query:\n${stringify(
      actionsSearchQuery,
      15
    )}`
  );

  return {
    data: (actionRequests?.hits?.hits ?? []).map((esHit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const action = esHit._source!;

      // Ensure `agent.policy` is an array
      if (!Array.isArray(action.agent.policy)) {
        action.agent.policy = action.agent.policy ? [action.agent.policy] : [];
      }

      return action;
    }),
    size,
    from,
    total,
  };
};

/** @private */
const getActionTypeFilter = (actionType: string): QueryDslBoolQuery => {
  return actionType === 'manual'
    ? {
        must_not: {
          exists: {
            field: 'data.alert_id',
          },
        },
      }
    : actionType === 'automated'
    ? {
        filter: {
          exists: {
            field: 'data.alert_id',
          },
        },
      }
    : {};
};

/**
 * Retrieves a list of all integration policy IDs in the active space for integrations that
 * support responses actions.
 * @private
 * @param fleetServices
 */
const fetchIntegrationPolicyIds = async (
  fleetServices: EndpointInternalFleetServicesInterface
): Promise<string[]> => {
  const packageNames: string[] = [
    'endpoint',
    'sentinel_one',
    ...Object.keys(CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION),
    ...Object.keys(MICROSOFT_DEFENDER_INDEX_PATTERNS_BY_INTEGRATION),
  ];
  const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: (${packageNames.join(' OR ')})`;

  fleetServices.logger.debug(
    () => `fetchIntegrationPolicyIds(): fetching from fleet using kuery:\n${kuery}`
  );

  const packagePolicyIterable = await fleetServices.packagePolicy.fetchAllItemIds(
    fleetServices.getSoClient(),
    { kuery }
  );
  const response: string[] = [];

  for await (const idList of packagePolicyIterable) {
    response.push(...idList);
  }

  fleetServices.logger.debug(() => `fetchIntegrationPolicyIds() found:\n${stringify(response)}`);

  return response;
};
