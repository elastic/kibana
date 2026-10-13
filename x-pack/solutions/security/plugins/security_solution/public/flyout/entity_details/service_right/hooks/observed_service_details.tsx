/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import type { inputsModel } from '../../../../common/store';
import type { InspectResponse } from '../../../../types';
import { ServicesQueries } from '../../../../../common/search_strategy/security_solution/services';
import type { ServiceItem } from '../../../../../common/search_strategy/security_solution/services/common';
import { OBSERVED_SERVICE_QUERY_ID } from '../content';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';

const OBSERVED_SERVICE_DETAILS_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT,
  'service_observed_details'
);

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
  /**
   * Identity filter replacing the default `service.name` term, e.g. to cover every service of a
   * resolution group. When omitted the search is scoped to `serviceName` only.
   */
  filterQuery?: QueryDslQueryContainer;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useObservedServiceDetails = ({
  endDate,
  serviceName,
  filterQuery,
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
    executionContext: OBSERVED_SERVICE_DETAILS_CONTEXT,
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
      ...(filterQuery ? { filterQuery: JSON.stringify(filterQuery) } : {}),
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    }),
    [endDate, indexNames, startDate, serviceName, filterQuery]
  );

  useEffect(() => {
    if (!skip) {
      search(serviceDetailsRequest);
    }
  }, [serviceDetailsRequest, search, skip]);

  return [loading, serviceDetailsResponse];
};
