/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALL_PASSED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.patternLabel.allPassedTooltip',
  {
    defaultMessage: 'All indices matching this pattern passed the data quality checks',
  }
);

export const SOME_FAILED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.patternLabel.someFailedTooltip',
  {
    defaultMessage: 'At least one index matching this pattern failed a data quality check',
  }
);

export const SOME_UNCHECKED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.patternLabel.someUncheckedTooltip',
  {
    defaultMessage:
      'At least one index matching this pattern has not been checked for data quality',
  }
);
