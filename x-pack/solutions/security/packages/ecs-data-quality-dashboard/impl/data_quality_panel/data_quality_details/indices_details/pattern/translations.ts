/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_LOADING_METADATA_TITLE = (pattern: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.emptyErrorPrompt.errorLoadingMetadataTitle',
    {
      values: { pattern },
      defaultMessage: "Indices matching the {pattern} pattern won't be checked",
    }
  );

export const LOADING_STATS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.emptyLoadingPrompt.loadingStatsPrompt',
  {
    defaultMessage: 'Loading stats',
  }
);

export const PASSED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.passedTooltip',
  {
    defaultMessage: 'Passed',
  }
);

export const FAILED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.failedTooltip',
  {
    defaultMessage: 'Failed',
  }
);

export const THIS_INDEX_HAS_NOT_BEEN_CHECKED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.thisIndexHasNotBeenCheckedTooltip',
  {
    defaultMessage: 'This index has not been checked',
  }
);

export const FAIL = i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.fail', {
  defaultMessage: 'Fail',
});

export const PASS = i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.pass', {
  defaultMessage: 'Pass',
});

export const CHECK_NOW: string = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.checkNow',
  {
    defaultMessage: 'Check now',
  }
);
