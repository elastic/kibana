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
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
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

export interface FetchActionRequestsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
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
  logger,
  esClient,
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

  const must: QueryDslQueryContainer[] = [
    {
      bool: {
        filter: [...getDateFilters({ startDate, endDate }), ...additionalFilters],
      },
    },
  ];

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
      return esHit._source!;
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
