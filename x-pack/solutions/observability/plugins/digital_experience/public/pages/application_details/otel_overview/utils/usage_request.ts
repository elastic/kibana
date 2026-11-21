/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewSearchParams } from '../../../../../common/overview_filters';
import type { ApplicationUsageResponse } from '../../../../../common/types/usage';
import type { ApplicationRequest } from '../../../../hooks/use_application_data';
import { withOverviewFilters } from '../../../../utils/with_overview_filters';

export const EMPTY_USAGE: ApplicationUsageResponse = {
  topPages: [],
  breakdowns: { pageLoads: 0, browsers: [], operatingSystems: [], devices: [] },
  topClicks: [],
  totalClicks: 0,
  frustration: { rageClicks: 0, deadClicks: 0, errorClicks: 0, total: 0, sessions: 0 },
  frustratedElements: [],
  frustratedPages: [],
};

/** The request for the pages, breakdowns and clicks narrowed by `searchParams`. */
export const usageRequestOf = (
  searchParams: OverviewSearchParams
): ApplicationRequest<ApplicationUsageResponse> => {
  return (apiClient, options) => {
    return apiClient.fetch(
      'GET /internal/digital_experience/applications/{serviceName}/usage',
      withOverviewFilters(options, searchParams)
    );
  };
};
