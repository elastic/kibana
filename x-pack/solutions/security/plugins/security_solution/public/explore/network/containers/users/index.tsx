/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';

import type { NetworkUsersRequestOptionsInput } from '../../../../../common/api/search_strategy';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { ESTermQuery } from '../../../../../common/typed_json';
import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import type { inputsModel } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import { createFilter } from '../../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../components/paginated_table/helpers';
import { networkSelectors } from '../../store';
import type {
  FlowTargetSourceDest,
  NetworkUsersStrategyResponse,
} from '../../../../../common/search_strategy/security_solution/network';
import { NetworkQueries } from '../../../../../common/search_strategy/security_solution/network';
import * as i18n from './translations';
import type { InspectResponse } from '../../../../types';
import type { PageInfoPaginated } from '../../../../../common/search_strategy';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

export const ID = 'networkUsersQuery';

export interface NetworkUsersArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  networkUsers: NetworkUsersStrategyResponse['edges'];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  stackByField?: string;
  totalCount: number;
}

interface UseNetworkUsers {
  id: string;
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  skip: boolean;
  flowTarget: FlowTargetSourceDest;
  ip: string;
}

export const useNetworkUsers = ({
  endDate,
  filterQuery,
  flowTarget,
  id,
  ip,
  skip,
  startDate,
}: UseNetworkUsers): [boolean, NetworkUsersArgs] => {
  const getNetworkUsersSelector = useMemo(() => networkSelectors.usersSelector(), []);
  const { activePage, sort, limit } = useDeepEqualSelector(getNetworkUsersSelector);
  const { uiSettings } = useKibana().services;
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  const [networkUsersRequest, setNetworkUsersRequest] =
    useState<NetworkUsersRequestOptionsInput | null>(null);

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setNetworkUsersRequest((prevRequest) => {
        if (!prevRequest) {
          return prevRequest;
        }

        return {
          ...prevRequest,
          pagination: generateTablePaginationOptions(newActivePage, limit),
        };
      });
    },
    [limit]
  );

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<NetworkQueries.users>({
    factoryQueryType: NetworkQueries.users,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.FAIL_NETWORK_USERS,
    abort: skip,
  });

  const networkUsersResponse = useMemo(
    () => ({
      endDate,
      networkUsers: response.edges,
      id,
      inspect,
      isInspected: false,
      loadPage: wrappedLoadMore,
      pageInfo: response.pageInfo,
      refetch,
      startDate,
      totalCount: response.totalCount,
    }),
    [
      endDate,
      id,
      inspect,
      refetch,
      response.edges,
      response.pageInfo,
      response.totalCount,
      startDate,
      wrappedLoadMore,
    ]
  );

  useEffect(() => {
    setNetworkUsersRequest((prevRequest) => {
      const myRequest: NetworkUsersRequestOptionsInput = {
        ...(prevRequest ?? {}),
        ip,
        defaultIndex,
        factoryQueryType: NetworkQueries.users,
        filterQuery: createFilter(filterQuery),
        flowTarget,
        pagination: generateTablePaginationOptions(activePage, limit),
        sort,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, defaultIndex, endDate, filterQuery, limit, startDate, sort, ip, flowTarget]);

  useEffect(() => {
    if (!skip && networkUsersRequest) {
      search(networkUsersRequest);
    }
  }, [networkUsersRequest, search, skip]);

  return [loading, networkUsersResponse];
};
