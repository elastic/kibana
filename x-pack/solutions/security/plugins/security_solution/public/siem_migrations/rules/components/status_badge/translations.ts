/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_STATUS_INSTALLED = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.status.installedLabel',
  {
    defaultMessage: 'Installed',
  }
);

export const RULE_STATUS_FAILED = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.status.failedLabel',
  {
    defaultMessage: 'Error',
  }
);
