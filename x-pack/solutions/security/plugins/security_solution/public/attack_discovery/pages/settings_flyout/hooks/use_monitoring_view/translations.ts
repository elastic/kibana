/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.monitoring.errorDescription',
  {
    defaultMessage: 'An error occurred while loading action-triggered runs. Please try again.',
  }
);

export const ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.monitoring.errorTitle',
  {
    defaultMessage: 'Unable to load action-triggered runs',
  }
);

export const LOADING = i18n.translate('xpack.securitySolution.attackDiscovery.monitoring.loading', {
  defaultMessage: 'Loading action-triggered runs…',
});
