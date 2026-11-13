/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { PAGE_FILTER_NAMES } from '../../../../common/overview_filters';
import type { OverviewSearchParams } from '../../../../common/overview_filters';
import { omitOverviewFilters } from '../../../../common/overview_filters_param';
import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import type { ApplicationData, ApplicationRequest } from '../../../hooks/use_application_data';
import { useApplicationData } from '../../../hooks/use_application_data';
import { useOverviewSearchParams } from '../../../hooks/use_overview_search';
import { withOverviewFilters } from '../../../utils/with_overview_filters';

export type ApplicationErrors = ApplicationData<ApplicationErrorsResponse>;

/** The request for the error groups narrowed by `searchParams`; a change is a new request. */
const errorsRequestOf = (
  searchParams: OverviewSearchParams
): ApplicationRequest<ApplicationErrorsResponse> => {
  // The page does not apply to errors: they carry no page URL yet, and the route rejects it.
  const { filters, ...rest } = searchParams;
  const errorFilters = omitOverviewFilters(filters, PAGE_FILTER_NAMES);
  const errorsParams: OverviewSearchParams = errorFilters
    ? { ...rest, filters: errorFilters }
    : rest;
  return (apiClient, options) => {
    return apiClient.fetch(
      'GET /internal/digital_experience/applications/{serviceName}/errors',
      withOverviewFilters(options, errorsParams)
    );
  };
};

/**
 * The JS error groups of one application in the selected time range and environment, for the Errors
 * tab and the Overview's top errors, narrowed by the filters and the KQL query of the URL.
 */
export const useApplicationErrors = (serviceName: string): ApplicationErrors => {
  const searchParams = useOverviewSearchParams();
  const request = useMemo(() => errorsRequestOf(searchParams), [searchParams]);
  return useApplicationData(serviceName, request);
};
