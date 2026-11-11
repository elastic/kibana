/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import { sortEnvironments } from '../../../lib/helpers/environment';
import { pickerEnvironments } from '../../../lib/otel/environments';
import type { ApplicationSearch } from '../../application_tab_route';
import { ERRORS_SEARCH_SPAN_NAME } from '../constants';
import { errorsSearch } from './search_request';
import { toHasMoreErrors, toJsErrors } from './to_js_errors';

/** The JS errors of one EDOT Browser application, for its Errors tab. */
export const getOtelErrors = async ({
  esClient,
  ...searchParams
}: ApplicationSearch): Promise<ApplicationErrorsResponse> => {
  const { aggregations } = await esClient.search(
    ERRORS_SEARCH_SPAN_NAME,
    errorsSearch(searchParams)
  );
  return {
    serviceName: searchParams.serviceName,
    errors: toJsErrors(aggregations),
    hasMoreErrors: toHasMoreErrors(aggregations),
    environments: sortEnvironments(pickerEnvironments(aggregations)),
  };
};
