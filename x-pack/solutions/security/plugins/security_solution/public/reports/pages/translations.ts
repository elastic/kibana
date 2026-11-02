/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_VALUE_DASHBOARD = i18n.translate(
  'xpack.securitySolution.reports.aiValue.pageTitle',
  {
    defaultMessage: 'Value report',
  }
);

export const AI_VALUE_LOAD_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.reports.aiValue.loadErrorTitle',
  {
    defaultMessage: 'Unable to load data view',
  }
);

export const AI_VALUE_LOAD_ERROR_BODY = i18n.translate(
  'xpack.securitySolution.reports.aiValue.loadErrorBody',
  {
    defaultMessage:
      'The value report requires a ready data view, but it could not be loaded. Refresh the page and try again.',
  }
);
