/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BULK_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.bulkStepTitle',
  {
    defaultMessage: 'Chat with the AI Agent about your rules',
  }
);

export const BULK_STEP_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.bulkStepDescription',
  {
    defaultMessage:
      'Add to chat starts a new AI Agent conversation with all rule translations from this migration attached, or only the rules you selected. Give the agent feedback to improve a translation.',
  }
);

export const RULE_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.ruleStepTitle',
  {
    defaultMessage: 'Review a single rule',
  }
);

export const RULE_STEP_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.ruleStepDescription',
  {
    defaultMessage:
      'Open a rule to review its translation. If something needs to change, add the rule to chat.',
  }
);

export const FLYOUT_STEP_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.flyoutStepTitle',
  {
    defaultMessage: 'Chat about this rule',
  }
);

export const FLYOUT_STEP_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.flyoutStepDescription',
  {
    defaultMessage:
      'Add to chat attaches only this rule. Ask the AI Agent to explain the translation or fix the query.',
  }
);

export const NEXT_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.nextButtonLabel',
  {
    defaultMessage: 'Next',
  }
);

export const OPEN_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.openRuleButtonLabel',
  {
    defaultMessage: 'Open rule',
  }
);

export const SKIP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.skipButtonLabel',
  {
    defaultMessage: 'Skip tour',
  }
);

export const FINISH_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatTour.finishButtonLabel',
  {
    defaultMessage: 'Finish',
  }
);
