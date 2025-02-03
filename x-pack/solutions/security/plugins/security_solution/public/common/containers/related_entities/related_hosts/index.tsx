/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { inputsModel } from '../../../store';
import type { InspectResponse } from '../../../../types';
import { RelatedEntitiesQueries } from '../../../../../common/search_strategy/security_solution/related_entities';
import type { RelatedHost } from '../../../../../common/search_strategy/security_solution/related_entities/related_hosts';
import { useSearchStrategy } from '../../use_search_strategy';
import { FAIL_RELATED_HOSTS } from './translations';

export interface UseUserRelatedHostsResult {
  inspect: InspectResponse;
  totalCount: number;
  relatedHosts: RelatedHost[];
  refetch: inputsModel.Refetch;
  loading: boolean;
}

interface UseUserRelatedHostsParam {
  userName: string;
  indexNames: string[];
  from: string;
  skip?: boolean;
}

export const useUserRelatedHosts = ({
  userName,
  indexNames,
  from,
  skip = false,
}: UseUserRelatedHostsParam): UseUserRelatedHostsResult => {
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<RelatedEntitiesQueries.relatedHosts>({
    factoryQueryType: RelatedEntitiesQueries.relatedHosts,
    initialResult: {
      totalCount: 0,
      relatedHosts: [],
    },
    errorMessage: FAIL_RELATED_HOSTS,
    abort: skip,
  });

  const userRelatedHostsResponse = useMemo(
    () => ({
      inspect,
      totalCount: response.totalCount,
      relatedHosts: response.relatedHosts,
      refetch,
      loading,
    }),
    [inspect, refetch, response.totalCount, response.relatedHosts, loading]
  );

  const userRelatedHostsRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: RelatedEntitiesQueries.relatedHosts,
      userName,
      from,
    }),
    [indexNames, from, userName]
  );

  useEffect(() => {
    if (!skip) {
      search(userRelatedHostsRequest);
    }
  }, [userRelatedHostsRequest, search, skip]);

  return userRelatedHostsResponse;
};
