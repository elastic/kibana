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
import type { RelatedUser } from '../../../../../common/search_strategy/security_solution/related_entities/related_users';
import { useSearchStrategy } from '../../use_search_strategy';
import { FAIL_RELATED_USERS } from './translations';

export interface UseHostRelatedUsersResult {
  inspect: InspectResponse;
  totalCount: number;
  relatedUsers: RelatedUser[];
  refetch: inputsModel.Refetch;
  loading: boolean;
}

interface UseHostRelatedUsersParam {
  /** Hostname for `host.name` term queries; omit or empty to skip the search. */
  hostName?: string;
  entityId?: string;
  indexNames: string[];
  from: string;
  skip?: boolean;
}

export const useHostRelatedUsers = ({
  hostName,
  entityId,
  indexNames,
  from,
  skip = false,
}: UseHostRelatedUsersParam): UseHostRelatedUsersResult => {
  const shouldSkip = skip || hostName == null || hostName === '';

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<RelatedEntitiesQueries.relatedUsers>({
    factoryQueryType: RelatedEntitiesQueries.relatedUsers,
    initialResult: {
      totalCount: 0,
      relatedUsers: [],
    },
    errorMessage: FAIL_RELATED_USERS,
    abort: shouldSkip,
  });

  const hostRelatedUsersResponse = useMemo(
    () => ({
      inspect,
      totalCount: response.totalCount,
      relatedUsers: response.relatedUsers,
      refetch,
      loading,
    }),
    [inspect, refetch, response.totalCount, response.relatedUsers, loading]
  );

  const hostRelatedUsersRequest = useMemo(() => {
    if (hostName == null || hostName === '') {
      return null;
    }
    return {
      defaultIndex: indexNames,
      factoryQueryType: RelatedEntitiesQueries.relatedUsers,
      hostName,
      filter: entityId
        ? {
            term: {
              'entity.id': entityId,
            },
          }
        : undefined,
      from,
    };
  }, [indexNames, from, hostName, entityId]);

  useEffect(() => {
    if (!shouldSkip && hostRelatedUsersRequest != null) {
      search(hostRelatedUsersRequest);
    }
  }, [hostRelatedUsersRequest, search, shouldSkip]);

  return hostRelatedUsersResponse;
};
