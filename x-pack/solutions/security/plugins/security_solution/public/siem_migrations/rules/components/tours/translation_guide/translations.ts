/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MIGRATION_RULES_SELECTOR_TOUR_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.title',
  {
    defaultMessage: 'Translated rules in one place',
  }
);

export const MIGRATION_RULES_SELECTOR_TOUR_STEP_CONTENT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.content',
  {
    defaultMessage:
      'Each migration’s translated rules appear on its SIEM rule translations page. Switch between your migrations using this dropdown. Start a new migration by clicking “Upload more rules for translation”.',
  }
);

export const TRANSLATION_STATUS_TOUR_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.statusStepTitle',
  {
    defaultMessage: 'Translation status',
  }
);

export const MIGRATION_GUIDE_TOUR_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.migrationGuideStepTitle',
  {
    defaultMessage: 'SIEM Rule Migration guide',
  }
);

export const MIGRATION_GUIDE_TOUR_STEP_CONTENT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.migrationGuideStepContent',
  {
    defaultMessage:
      'Your guide and migrated rules can always be found in the Onboarding Hub. Use it to review previous rule migrations or start a new one.',
  }
);

export const NEXT_TOUR_STEP_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.nextStepButton',
  {
    defaultMessage: 'Next',
  }
);

export const FINISH_TOUR_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.finishButton',
  {
    defaultMessage: 'OK',
  }
);

export const INSTALL_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.installLabel',
  {
    defaultMessage: 'Install',
  }
);

export const INSTALLED_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.installedLabel',
  {
    defaultMessage: 'Installed',
  }
);

export const VIEW_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.viewLabel',
  {
    defaultMessage: 'View',
  }
);

export const EDIT_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.editLabel',
  {
    defaultMessage: 'Edit',
  }
);

export const TRANSLATED_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.translatedLabel',
  {
    defaultMessage: 'Translated',
  }
);

export const REPROCESSED_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.reprocessedLabel',
  {
    defaultMessage: 'Reprocessed',
  }
);

export const SIEM_MIGRATIONS_LINK_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.tour.translationRuleGuide.siemMigrationsLinkLabel',
  {
    defaultMessage: 'AI Translations here',
  }
);
