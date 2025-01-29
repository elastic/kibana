/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import type {
  NetworkDnsStrategyResponse,
  NetworkDnsEdges,
  NetworkQueries,
} from '../../../../../../common/search_strategy/security_solution/network';

import { inspectStringifyObject } from '../../../../../utils/build_query';

import { getDnsEdges } from './helpers';
import { buildDnsQuery } from './query.dns_network.dsl';
import type { SecuritySolutionFactory } from '../../types';

export const networkDns: SecuritySolutionFactory<NetworkQueries.dns> = {
  buildDsl: (options) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    return buildDnsQuery(options);
  },
  parse: async (
    options,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkDnsStrategyResponse> => {
    const { activePage, fakePossibleCount } = options.pagination;
    const totalCount = getOr(0, 'aggregations.dns_count.value', response.rawResponse);
    const edges: NetworkDnsEdges[] = getDnsEdges(response);
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const inspect = {
      dsl: [inspectStringifyObject(buildDnsQuery(options))],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      ...response,
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ?? 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  },
};
