/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import type { HostsOverviewStrategyResponse } from '../../../../common/search_strategy/security_solution';
import { HostsQueries } from '../../../../common/search_strategy/security_solution';
import type { inputsModel } from '../../../common/store/inputs';
import { createFilter } from '../../../common/containers/helpers';
import type { ESQuery } from '../../../../common/typed_json';
import type { InspectResponse } from '../../../types';
import * as i18n from './translations';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';

export const ID = 'overviewHostQuery';

export interface HostOverviewArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  overviewHost: HostsOverviewStrategyResponse['overviewHost'];
  refetch: inputsModel.Refetch;
}

interface UseHostOverview {
  filterQuery?: ESQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useHostOverview = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseHostOverview): [boolean, HostOverviewArgs] => {
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<HostsQueries.overview>({
    factoryQueryType: HostsQueries.overview,
    initialResult: {
      overviewHost: {},
    },
    errorMessage: i18n.FAIL_HOST_OVERVIEW,
    abort: skip,
  });

  const overviewHostResponse = useMemo(
    () => ({
      endDate,
      overviewHost: response.overviewHost,
      id: ID,
      inspect,
      isInspected: false,
      refetch,
      startDate,
    }),
    [endDate, inspect, refetch, response.overviewHost, startDate]
  );

  const overviewHostRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: HostsQueries.overview,
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
      search(overviewHostRequest);
    }
  }, [overviewHostRequest, search, skip]);

  return [loading, overviewHostResponse];
};
