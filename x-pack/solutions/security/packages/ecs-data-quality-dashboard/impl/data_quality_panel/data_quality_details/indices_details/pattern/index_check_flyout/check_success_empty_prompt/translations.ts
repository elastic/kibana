/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INCOMPATIBLE_EMPTY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.incompatibleEmptyContent',
  {
    defaultMessage:
      'All of the field mappings and document values in this index are compliant with the Elastic Common Schema (ECS).',
  }
);

export const INCOMPATIBLE_EMPTY_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.incompatibleEmptyTitle',
  {
    defaultMessage: 'All field mappings and values are ECS compliant',
  }
);
