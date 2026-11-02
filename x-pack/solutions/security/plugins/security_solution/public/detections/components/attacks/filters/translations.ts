/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TYPE = i18n.translate(
  'xpack.securitySolution.attacksPage.filters.typeFilter.typeDropdownLabel',
  {
    defaultMessage: 'Type',
  }
);

export const SCHEDULED = i18n.translate(
  'xpack.securitySolution.attacksPage.filters.typeFilter.scheduledOptionLabel',
  {
    defaultMessage: 'Scheduled',
  }
);

export const MANUALLY_GENERATED = i18n.translate(
  'xpack.securitySolution.attacksPage.filters.typeFilter.manuallyGeneratedOptionLabel',
  {
    defaultMessage: 'Manually generated',
  }
);
