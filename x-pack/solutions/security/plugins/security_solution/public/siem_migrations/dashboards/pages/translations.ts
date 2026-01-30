/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.pageTitle',
  {
    defaultMessage: 'Translated dashboards',
  }
);

export const TRANSLATED_DASHBOARDS_EMPTY_PAGE_MESSAGE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.emptyPageMessage',
  {
    defaultMessage:
      'Translate your existing SIEM Dashboards with Elastic Automatic Migration. Go to Automatic Migration for step-by-step guidance.',
  }
);

export const TRANSLATED_DASHBOARDS_EMPTY_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.emptyPageTitle',
  {
    defaultMessage: 'No migrations to View',
  }
);

export const TRANSLATED_DASHBOARDS_EMPTY_PAGE_CTA = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.emptyPageCta',
  {
    defaultMessage: 'Start Automatic Migration',
  }
);
