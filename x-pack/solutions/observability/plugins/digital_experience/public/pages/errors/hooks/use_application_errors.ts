/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { OverviewFilters } from '../../../../common/overview_filters';
import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import type { ApplicationData, ApplicationRequest } from '../../../hooks/use_application_data';
import { useApplicationData } from '../../../hooks/use_application_data';
import { withOverviewFilters } from '../../../utils/with_overview_filters';

export type ApplicationErrors = ApplicationData<ApplicationErrorsResponse>;

/** The request for the error groups narrowed by `filters`, if any; a change is a new request. */
const errorsRequestOf = (
  filters: OverviewFilters
): ApplicationRequest<ApplicationErrorsResponse> => {
  return (apiClient, options) => {
    return apiClient.fetch(
      'GET /internal/digital_experience/applications/{serviceName}/errors',
      withOverviewFilters(options, filters)
    );
  };
};

const NO_FILTERS: OverviewFilters = {};

/**
 * The JS error groups of one application in the selected time range and environment, for the Errors
 * tab and the Overview's top errors. The Overview passes its `filters`, which `filters` must keep
 * the same between renders unless they change.
 */
export const useApplicationErrors = (
  serviceName: string,
  filters: OverviewFilters = NO_FILTERS
): ApplicationErrors => {
  const request = useMemo(() => errorsRequestOf(filters), [filters]);
  return useApplicationData(serviceName, request);
};
