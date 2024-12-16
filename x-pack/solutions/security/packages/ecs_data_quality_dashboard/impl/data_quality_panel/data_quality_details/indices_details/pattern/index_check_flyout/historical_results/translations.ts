/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOADING_HISTORICAL_RESULTS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.loadingHistoricalResults',
  {
    defaultMessage: 'Loading historical results',
  }
);

export const ERROR_LOADING_HISTORICAL_RESULTS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errorLoadingHistoricalResults',
  {
    defaultMessage: 'Unable to load historical results',
  }
);

export const TOTAL_CHECKS = (count: number, formattedCount: string) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.totalChecks', {
    values: {
      count,
      formattedCount,
    },
    defaultMessage: '{formattedCount} {count, plural, one {check} other {checks}}',
  });

export const FILTER_RESULTS_BY_OUTCOME = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.filterResultsByOutcome',
  {
    defaultMessage: 'Filter results by outcome',
  }
);

export const ALL = i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.all', {
  defaultMessage: 'All',
});
