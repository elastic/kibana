/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { getOr } from 'lodash/fp';
import type { RiskSeverity } from '../../../../../../common/search_strategy/security_solution/risk_score/all';
import type { SecuritySolutionFactory } from '../../types';
import type { RelatedEntitiesQueries } from '../../../../../../common/search_strategy/security_solution/related_entities';
import type {
  HostsRelatedUsersStrategyResponse,
  RelatedUserBucket,
  RelatedUser,
} from '../../../../../../common/search_strategy/security_solution/related_entities/related_users';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { buildRelatedUsersQuery } from './query.related_users.dsl';
import { getUserRiskData } from '../../users/all';

export const hostsRelatedUsers: SecuritySolutionFactory<RelatedEntitiesQueries.relatedUsers> = {
  buildDsl: (options) => buildRelatedUsersQuery(options),
  parse: async (
    options,
    response: IEsSearchResponse<unknown>,
    deps?: {
      esClient: IScopedClusterClient;
      spaceId?: string;
    }
  ): Promise<HostsRelatedUsersStrategyResponse> => {
    const aggregations = response.rawResponse.aggregations;

    const inspect = {
      dsl: [inspectStringifyObject(buildRelatedUsersQuery(options))],
    };

    if (aggregations == null) {
      return { ...response, inspect, totalCount: 0, relatedUsers: [] };
    }

    const totalCount = getOr(0, 'aggregations.user_count.value', response.rawResponse);

    const buckets: RelatedUserBucket[] = getOr(
      [],
      'aggregations.user_data.buckets',
      response.rawResponse
    );
    const relatedUsers: RelatedUser[] = buckets.map(
      (bucket: RelatedUserBucket) => ({
        user: bucket.key,
        ip: bucket.ip?.buckets.map((ip) => ip.key) ?? [],
      }),
      {}
    );

    const enhancedUsers = deps?.spaceId
      ? await addUserRiskData(relatedUsers, deps.spaceId, deps.esClient)
      : relatedUsers;

    return {
      ...response,
      inspect,
      totalCount,
      relatedUsers: enhancedUsers,
    };
  },
};

async function addUserRiskData(
  relatedUsers: RelatedUser[],
  spaceId: string,
  esClient: IScopedClusterClient
): Promise<RelatedUser[]> {
  const userNames = relatedUsers.map((item) => item.user);
  const userRiskData = await getUserRiskData(esClient, spaceId, userNames);
  const usersRiskByUserName: Record<string, RiskSeverity> | undefined =
    userRiskData?.hits.hits.reduce(
      (acc, hit) => ({
        ...acc,
        [hit._source?.user.name ?? '']: hit._source?.user?.risk?.calculated_level,
      }),
      {}
    );

  return usersRiskByUserName
    ? relatedUsers.map((item) => ({
        ...item,
        risk: usersRiskByUserName[item.user],
      }))
    : relatedUsers;
}
