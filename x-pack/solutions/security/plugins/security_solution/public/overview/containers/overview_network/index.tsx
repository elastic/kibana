/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import type { NetworkOverviewStrategyResponse } from '../../../../common/search_strategy/security_solution';
import { NetworkQueries } from '../../../../common/search_strategy/security_solution';
import type { inputsModel } from '../../../common/store/inputs';
import { createFilter } from '../../../common/containers/helpers';
import type { ESQuery } from '../../../../common/typed_json';
import type { InspectResponse } from '../../../types';
import * as i18n from './translations';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';

export const ID = 'overviewNetworkQuery';

export interface NetworkOverviewArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  overviewNetwork: NetworkOverviewStrategyResponse['overviewNetwork'];
  refetch: inputsModel.Refetch;
}

interface UseNetworkOverview {
  filterQuery?: ESQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useNetworkOverview = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseNetworkOverview): [boolean, NetworkOverviewArgs] => {
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<NetworkQueries.overview>({
    factoryQueryType: NetworkQueries.overview,
    initialResult: {
      overviewNetwork: {},
    },
    errorMessage: i18n.FAIL_NETWORK_OVERVIEW,
    abort: skip,
  });

  const overviewNetworkResponse = useMemo(
    () => ({
      endDate,
      overviewNetwork: response.overviewNetwork,
      id: ID,
      inspect,
      isInspected: false,
      refetch,
      startDate,
    }),
    [endDate, inspect, refetch, response.overviewNetwork, startDate]
  );

  const overviewNetworkRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: NetworkQueries.overview,
      filterQuery: createFilter(filterQuery),
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    }),
    [endDate, filterQuery, indexNames, startDate]
  );

  useEffect(() => {
    if (!skip) {
      search(overviewNetworkRequest);
    }
  }, [overviewNetworkRequest, search, skip]);

  return [loading, overviewNetworkResponse];
};
