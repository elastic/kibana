/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import type { ESTermQuery } from '../../../../../common/typed_json';
import type { inputsModel } from '../../../../common/store';
import { createFilter } from '../../../../common/containers/helpers';
import type { NetworkDetailsStrategyResponse } from '../../../../../common/search_strategy';
import { NetworkQueries } from '../../../../../common/search_strategy';
import * as i18n from './translations';
import type { InspectResponse } from '../../../../types';

import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

export const ID = 'networkDetailsQuery';

export interface NetworkDetailsArgs {
  id: string;
  inspect: InspectResponse;
  networkDetails: NetworkDetailsStrategyResponse['networkDetails'];
  refetch: inputsModel.Refetch;
  isInspected: boolean;
}

interface UseNetworkDetails {
  filterQuery?: ESTermQuery | string;
  id?: string;
  indexNames: string[];
  ip: string;
  skip: boolean;
}

export const useNetworkDetails = ({
  filterQuery,
  id = ID,
  indexNames,
  ip,
  skip,
}: UseNetworkDetails): [boolean, NetworkDetailsArgs] => {
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<NetworkQueries.details>({
    factoryQueryType: NetworkQueries.details,
    initialResult: {
      networkDetails: {},
    },
    errorMessage: i18n.ERROR_NETWORK_DETAILS,
    abort: skip,
  });

  const networkDetailsResponse = useMemo(
    () => ({
      networkDetails: response.networkDetails,
      id,
      inspect,
      isInspected: false,
      refetch,
    }),
    [id, inspect, refetch, response.networkDetails]
  );

  const networkDetailsRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: NetworkQueries.details,
      filterQuery: createFilter(filterQuery),
      ip,
    }),
    [filterQuery, indexNames, ip]
  );

  useEffect(() => {
    if (!skip && networkDetailsRequest) {
      search(networkDetailsRequest);
    }
  }, [networkDetailsRequest, search, skip]);

  return [loading, networkDetailsResponse];
};
