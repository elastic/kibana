/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import type { inputsModel } from '../../../../common/store';
import type { InspectResponse } from '../../../../types';
import { ServicesQueries } from '../../../../../common/search_strategy/security_solution/services';
import type { ServiceItem } from '../../../../../common/search_strategy/security_solution/services/common';
import { OBSERVED_SERVICE_QUERY_ID } from '../content';

export interface ServiceDetailsArgs {
  id: string;
  inspect: InspectResponse;
  serviceDetails: ServiceItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

interface UseServiceDetails {
  endDate: string;
  serviceName: string;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useObservedServiceDetails = ({
  endDate,
  serviceName,
  indexNames,
  id = OBSERVED_SERVICE_QUERY_ID,
  skip = false,
  startDate,
}: UseServiceDetails): [boolean, ServiceDetailsArgs] => {
  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<ServicesQueries.observedDetails>({
    factoryQueryType: ServicesQueries.observedDetails,
    initialResult: {
      serviceDetails: {},
    },
    errorMessage: i18n.translate('xpack.securitySolution.serviceDetails.failSearchDescription', {
      defaultMessage: `Failed to run search on service details`,
    }),
    abort: skip,
  });

  const serviceDetailsResponse = useMemo(
    () => ({
      endDate,
      serviceDetails: response.serviceDetails,
      id,
      inspect,
      refetch,
      startDate,
    }),
    [endDate, id, inspect, refetch, response.serviceDetails, startDate]
  );

  const serviceDetailsRequest = useMemo(
    () => ({
      defaultIndex: indexNames,
      factoryQueryType: ServicesQueries.observedDetails,
      serviceName,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    }),
    [endDate, indexNames, startDate, serviceName]
  );

  useEffect(() => {
    if (!skip) {
      search(serviceDetailsRequest);
    }
  }, [serviceDetailsRequest, search, skip]);

  return [loading, serviceDetailsResponse];
};
