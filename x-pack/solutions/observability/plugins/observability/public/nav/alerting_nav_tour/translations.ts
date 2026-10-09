/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PROMO_TITLE = i18n.translate('xpack.observability.alertingNavTour.promo.title', {
  defaultMessage: 'Unified Alerting app',
});

export const PROMO_DESCRIPTION = i18n.translate(
  'xpack.observability.alertingNavTour.promo.description',
  {
    defaultMessage:
      'All your alerting features in one place. Triage alerts, manage rules, notifications and suppression mechanisms.',
  }
);

export const PROMO_IMAGE_ALT = i18n.translate(
  'xpack.observability.alertingNavTour.promo.imageAlt',
  {
    defaultMessage: 'Preview of the unified Alerting app',
  }
);

export const PROMO_TAKE_TOUR = i18n.translate(
  'xpack.observability.alertingNavTour.promo.takeTour',
  {
    defaultMessage: 'Take tour',
  }
);

export const PROMO_DISMISS = i18n.translate('xpack.observability.alertingNavTour.promo.dismiss', {
  defaultMessage: 'Dismiss',
});

export const TOUR_NEXT = i18n.translate('xpack.observability.alertingNavTour.next', {
  defaultMessage: 'Next',
});

export const TOUR_SKIP = i18n.translate('xpack.observability.alertingNavTour.skip', {
  defaultMessage: 'Skip tour',
});

export const TOUR_FINISH = i18n.translate('xpack.observability.alertingNavTour.finish', {
  defaultMessage: 'Finish',
});

export const STEP_ALERTS_TITLE = i18n.translate(
  'xpack.observability.alertingNavTour.steps.alerts.title',
  {
    defaultMessage: 'New alerts experience',
  }
);

export const STEP_ALERTS_DESCRIPTION = i18n.translate(
  'xpack.observability.alertingNavTour.steps.alerts.description',
  {
    defaultMessage:
      'Triage Universal, Classic, and external alerts together in one inbox so you can investigate from a single place.',
  }
);

export const STEP_RULES_TITLE = i18n.translate(
  'xpack.observability.alertingNavTour.steps.rules.title',
  {
    defaultMessage: 'Universal and Classic rules',
  }
);

export const STEP_RULES_DESCRIPTION = i18n.translate(
  'xpack.observability.alertingNavTour.steps.rules.description',
  {
    defaultMessage:
      'Use these tabs to switch between Universal and Classic rule management from one Rules page.',
  }
);

export const STEP_ACTION_POLICIES_TITLE = i18n.translate(
  'xpack.observability.alertingNavTour.steps.actionPolicies.title',
  {
    defaultMessage: 'Action policies',
  }
);

export const STEP_ACTION_POLICIES_DESCRIPTION = i18n.translate(
  'xpack.observability.alertingNavTour.steps.actionPolicies.description',
  {
    defaultMessage:
      'Unlike Classic actions that you configure on each rule, action policies define notifications and suppressions once and reuse them across Universal rules—so you manage routing in one place instead of duplicating connectors per rule. This feature is not available for Kibana Classic alerting.',
  }
);

export const STEP_ACTION_POLICIES_DOCS_LINK = i18n.translate(
  'xpack.observability.alertingNavTour.steps.actionPolicies.docsLink',
  {
    defaultMessage: 'Read the docs',
  }
);

export const STEP_EXECUTION_HISTORY_TITLE = i18n.translate(
  'xpack.observability.alertingNavTour.steps.executionHistory.title',
  {
    defaultMessage: 'Execution history',
  }
);

export const STEP_EXECUTION_HISTORY_DESCRIPTION = i18n.translate(
  'xpack.observability.alertingNavTour.steps.executionHistory.description',
  {
    defaultMessage:
      'Review recent Universal rule runs and outcomes. This feature is not available for Kibana Classic alerting.',
  }
);

export const STEP_MAINTENANCE_WINDOWS_TITLE = i18n.translate(
  'xpack.observability.alertingNavTour.steps.maintenanceWindows.title',
  {
    defaultMessage: 'Maintenance windows',
  }
);

export const STEP_MAINTENANCE_WINDOWS_DESCRIPTION = i18n.translate(
  'xpack.observability.alertingNavTour.steps.maintenanceWindows.description',
  {
    defaultMessage:
      'Schedule quiet periods that work across both Universal and Classic alerting, so suppressions stay consistent for both systems.',
  }
);

export const STEP_CREATE_FIRST_RULE_TITLE = i18n.translate(
  'xpack.observability.alertingNavTour.steps.createFirstRule.title',
  {
    defaultMessage: 'Create your first ES|QL rule',
  }
);

export const STEP_CREATE_FIRST_RULE_DESCRIPTION = i18n.translate(
  'xpack.observability.alertingNavTour.steps.createFirstRule.description',
  {
    defaultMessage:
      'You’re ready to go. Use Create rule to start your first ES|QL rule and get started with Universal rules.',
  }
);
