/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildObservedServiceDetailsQuery } from './query.observed_service_details.dsl';

import type { ServicesQueries } from '../../../../../../common/search_strategy/security_solution/services';
import type { ObservedServiceDetailsStrategyResponse } from '../../../../../../common/search_strategy/security_solution/services/observed_details';
import { formatServiceItem } from './helpers';

export const observedServiceDetails: SecuritySolutionFactory<ServicesQueries.observedDetails> = {
  buildDsl: (options) => buildObservedServiceDetailsQuery(options),
  parse: async (
    options,
    response: IEsSearchResponse<unknown>
  ): Promise<ObservedServiceDetailsStrategyResponse> => {
    const aggregations = response.rawResponse.aggregations;

    const inspect = {
      dsl: [inspectStringifyObject(buildObservedServiceDetailsQuery(options))],
    };

    if (aggregations == null) {
      return { ...response, inspect, serviceDetails: {} };
    }

    return {
      ...response,
      inspect,
      serviceDetails: formatServiceItem(aggregations),
    };
  },
};
