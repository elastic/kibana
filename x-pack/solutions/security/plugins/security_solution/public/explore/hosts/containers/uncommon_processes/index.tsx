/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { HostUncommonProcessesRequestOptionsInput } from '../../../../../common/api/search_strategy';
import type { inputsModel, State } from '../../../../common/store';

import { generateTablePaginationOptions } from '../../../components/paginated_table/helpers';
import { createFilter } from '../../../../common/containers/helpers';
import type { hostsModel } from '../../store';
import { hostsSelectors } from '../../store';
import type {
  SortField,
  PageInfoPaginated,
  HostsUncommonProcessesEdges,
} from '../../../../../common/search_strategy';
import { HostsQueries } from '../../../../../common/search_strategy';

import * as i18n from './translations';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { InspectResponse } from '../../../../types';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

export const ID = 'hostsUncommonProcessesQuery';

export interface UncommonProcessesArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
  uncommonProcesses: HostsUncommonProcessesEdges[];
}

interface UseUncommonProcesses {
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
  type: hostsModel.HostsType;
}

export const useUncommonProcesses = ({
  endDate,
  filterQuery,
  indexNames,
  skip = false,
  startDate,
  type,
}: UseUncommonProcesses): [boolean, UncommonProcessesArgs] => {
  const getUncommonProcessesSelector = useMemo(
    () => hostsSelectors.uncommonProcessesSelector(),
    []
  );
  const { activePage, limit } = useDeepEqualSelector((state: State) =>
    getUncommonProcessesSelector(state, type)
  );
  const [uncommonProcessesRequest, setUncommonProcessesRequest] =
    useState<HostUncommonProcessesRequestOptionsInput | null>(null);

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setUncommonProcessesRequest((prevRequest) => {
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
  } = useSearchStrategy<HostsQueries.uncommonProcesses>({
    factoryQueryType: HostsQueries.uncommonProcesses,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.FAIL_UNCOMMON_PROCESSES,
    abort: skip,
  });

  const uncommonProcessesResponse = useMemo(
    () => ({
      id: ID,
      inspect,
      isInspected: false,
      loadPage: wrappedLoadMore,
      pageInfo: response.pageInfo,
      refetch,
      totalCount: response.totalCount,
      uncommonProcesses: response.edges,
    }),
    [inspect, refetch, response.edges, response.pageInfo, response.totalCount, wrappedLoadMore]
  );

  useEffect(() => {
    setUncommonProcessesRequest((prevRequest) => {
      const myRequest: HostUncommonProcessesRequestOptionsInput = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: HostsQueries.uncommonProcesses,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort: {} as SortField,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, indexNames, endDate, filterQuery, limit, startDate]);

  useEffect(() => {
    if (!skip && uncommonProcessesRequest) {
      search(uncommonProcessesRequest);
    }
  }, [search, skip, uncommonProcessesRequest]);

  return [loading, uncommonProcessesResponse];
};
