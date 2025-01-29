/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import type { inputsModel } from '../../../../../common/store';
import type { HostItem } from '../../../../../../common/search_strategy/security_solution/hosts';
import { HostsQueries } from '../../../../../../common/search_strategy/security_solution/hosts';

import * as i18n from './translations';
import type { InspectResponse } from '../../../../../types';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';

export const ID = 'hostsDetailsQuery';

export interface HostDetailsArgs {
  id: string;
  inspect: InspectResponse;
  hostDetails: HostItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

interface UseHostDetails {
  endDate: string;
  hostName: string;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useHostDetails = ({
  endDate,
  hostName,
  indexNames,
  id = ID,
  skip = false,
  startDate,
}: UseHostDetails): [boolean, HostDetailsArgs, inputsModel.Refetch] => {
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<HostsQueries.details>({
    factoryQueryType: HostsQueries.details,
    initialResult: {
      hostDetails: {},
    },
    errorMessage: i18n.FAIL_HOST_OVERVIEW,
    abort: skip,
  });

  const hostDetailsResponse = useMemo(
    () => ({
      endDate,
      hostDetails: response.hostDetails,
      id,
      inspect,
      isInspected: false,
      refetch,
      startDate,
    }),
    [endDate, response.hostDetails, id, inspect, refetch, startDate]
  );

  const hostDetailsRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: HostsQueries.details,
      hostName,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    }),
    [endDate, hostName, indexNames, startDate]
  );

  useEffect(() => {
    if (!skip) {
      search(hostDetailsRequest);
    }
  }, [hostDetailsRequest, search, skip]);

  return [loading, hostDetailsResponse, refetch];
};
