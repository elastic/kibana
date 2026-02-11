/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ML_RULE_JOBS_WARNING_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.rulesTable.mlJobsWarning.popover.description',
  {
    defaultMessage:
      'The following jobs are not running and might cause the rule to generate wrong results:',
  }
);

export const ML_RULE_JOBS_WARNING_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.rulesTable.mlJobsWarning.popover.buttonLabel',
  {
    defaultMessage: 'Visit rule details page to investigate',
  }
);

export const INSTALLED_RULES_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.rulesTable.allRules.tabs.rules',
  {
    defaultMessage: `Installed Rules`,
  }
);

export const RULE_MONITORING_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.rulesTable.allRules.tabs.monitoring',
  {
    defaultMessage: 'Rule Monitoring',
  }
);

export const RULE_UPDATES_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.rulesTable.allRules.tabs.updates',
  {
    defaultMessage: 'Rule Updates',
  }
);

export const SELECTED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.rulesTable.allRules.selectedRules',
  {
    defaultMessage: 'Selected rules',
  }
);

// Gap status column
export const GAP_STATUS_HEADER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.columns.gapStatus.header',
  {
    defaultMessage: 'Gap fill status',
  }
);

export const GAP_STATUS_IN_PROGRESS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.columns.gapStatus.inProgress',
  {
    defaultMessage: 'In progress',
  }
);

export const GAP_STATUS_UNFILLED_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.columns.gapStatus.unfilled',
  {
    defaultMessage: 'Unfilled',
  }
);

export const GAP_STATUS_FILLED_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.columns.gapStatus.filled',
  {
    defaultMessage: 'Filled',
  }
);

export const gapStatusTooltipInProgress = (duration: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.columns.gapStatus.tooltip.inProgress',
    {
      defaultMessage: 'In progress: {duration}',
      values: { duration },
    }
  );

export const gapStatusTooltipUnfilled = (duration: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.columns.gapStatus.tooltip.unfilled',
    {
      defaultMessage: 'Unfilled: {duration}',
      values: { duration },
    }
  );

export const gapStatusTooltipFilled = (duration: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.columns.gapStatus.tooltip.filled', {
    defaultMessage: 'Filled: {duration}',
    values: { duration },
  });
