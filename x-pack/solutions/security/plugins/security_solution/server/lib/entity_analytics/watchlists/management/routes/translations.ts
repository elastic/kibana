/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INSUFFICIENT_INDEX_PRIVILEGES_ERROR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.api.insufficientIndexPrivileges',
  {
    defaultMessage: 'Insufficient privileges to read from the selected index pattern.',
  }
);
