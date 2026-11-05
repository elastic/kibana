/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import { sortEnvironments } from '../../../lib/helpers/environment';
import type { SearchContext } from '../../../lib/helpers/search';
import { searchAggregations } from '../../../lib/helpers/search';
import { pickerEnvironments } from '../../../lib/otel/environments';
import type { ApplicationSearchParams } from '../../application_tab_route';
import { ERRORS_SEARCH_SPAN_NAME } from '../constants';
import { errorsSearch } from './search_request';
import type { ErrorsAggregations } from './search_response';
import { toHasMoreErrors, toJsErrors } from './to_js_errors';

/** The JS errors of one EDOT Browser application, for its Errors tab. */
export const getOtelErrors = ({
  esClient,
  signal,
  ...searchParams
}: ApplicationSearchParams & SearchContext): Promise<ApplicationErrorsResponse> => {
  return withSpan(ERRORS_SEARCH_SPAN_NAME, async () => {
    const aggregations = await searchAggregations<ErrorsAggregations>(
      { esClient, signal },
      errorsSearch(searchParams)
    );
    return {
      serviceName: searchParams.serviceName,
      errors: toJsErrors(aggregations),
      hasMoreErrors: toHasMoreErrors(aggregations),
      environments: sortEnvironments(pickerEnvironments(aggregations)),
    };
  });
};
