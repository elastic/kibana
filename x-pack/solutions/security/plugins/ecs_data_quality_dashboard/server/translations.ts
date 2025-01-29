/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_DEFAULT_ERROR_MESSAGE = i18n.translate(
  'xpack.ecsDataQualityDashboard.api.defaultErrorMessage',
  {
    defaultMessage: 'Internal Server Error',
  }
);

export const API_CURRENT_USER_ERROR_MESSAGE = i18n.translate(
  'xpack.ecsDataQualityDashboard.api.currentUserErrorMessage',
  {
    defaultMessage: 'Unable to retrieve current user',
  }
);
