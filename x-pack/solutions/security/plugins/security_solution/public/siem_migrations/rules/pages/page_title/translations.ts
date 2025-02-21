/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.securitySolution.siemMigrations.rules.pageTitle', {
  defaultMessage: 'Translated rules',
});

export const BETA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.pageTitle.betaBadge',
  {
    defaultMessage: 'Technical preview',
  }
);

export const BETA_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.pageTitle.betaTooltip',
  {
    defaultMessage:
      'This functionality is in technical preview and is subject to change. Please use SIEM Migrations with caution in production environments.',
  }
);
