/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SETUP_SIEM_MIGRATION_TOUR_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.setupAutomaticMigrationGuide.title',
  {
    defaultMessage: 'Streamlined Automatic migration',
  }
);

export const SETUP_SIEM_MIGRATION_TOUR_SUBTITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.setupSiemMigrationGuide.subtitle',
  {
    defaultMessage: 'New onboarding guide!',
  }
);

export const SETUP_SIEM_MIGRATION_TOUR_CONTENT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.setupSiemMigrationGuide.content',
  {
    defaultMessage:
      'This is a step-by-step guide to quickly import your SIEM rules, assets, and data to Elastic Security. Powered by AI.',
  }
);

export const FINISH_TOUR_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.setupSiemMigrationGuide.finishButton',
  {
    defaultMessage: 'OK',
  }
);
