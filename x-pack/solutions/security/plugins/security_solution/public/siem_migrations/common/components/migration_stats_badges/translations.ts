/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATS_TOTAL_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.statsBadges.total',
  {
    defaultMessage: 'Total',
  }
);

export const STATS_TRANSLATED_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.statsBadges.translated',
  {
    defaultMessage: 'Translated',
  }
);

export const STATS_PARTIAL_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.statsBadges.partial',
  {
    defaultMessage: 'Partially translated',
  }
);

export const STATS_UNTRANSLATABLE_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.statsBadges.untranslatable',
  {
    defaultMessage: 'Not translated',
  }
);

export const STATS_FAILED_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.statsBadges.failed',
  {
    defaultMessage: 'Failed',
  }
);
