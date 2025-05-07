/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_GAPS_OVERVIEW_PANEL_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.label',
  {
    defaultMessage: 'Total rules with gaps:',
  }
);
export const RULE_GAPS_OVERVIEW_PANEL_SHOW_RULES_WITH_GAPS_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.showRulesWithGapsLabel',
  {
    defaultMessage: 'Only rules with gaps',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_LAST_24_HOURS_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.last24HoursLabel',
  {
    defaultMessage: 'Last 24 hours',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_LAST_3_DAYS_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.last3DaysLabel',
  {
    defaultMessage: 'Last 3 days',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_LAST_7_DAYS_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.last7DaysLabel',
  {
    defaultMessage: 'Last 7 days',
  }
);

export const RULE_GAPS_OVERVIEW_EXECUTION_SUCCESS_RATE_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.executionSuccessRateLabel',
  {
    defaultMessage: 'Total execution success:',
  }
);

export const RULE_GAPS_OVERVIEW_EXECUTION_SUCCESS_RATE_VALUE = (rate: number): string =>
  i18n.translate('xpack.securitySolution.ruleGapsOverviewPanel.executionSuccessRateValue', {
    values: { rate },
    defaultMessage: '{rate}%',
  });

export const RULE_GAPS_OVERVIEW_LAST_EXECUTION_STATUS_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastExecutionStatusLabel',
  {
    defaultMessage: 'Last execution status summary:',
  }
);

export const RULE_GAPS_OVERVIEW_LAST_EXECUTION_SUCCESS_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastExecutionSuccessLabel',
  {
    defaultMessage: 'Succeeded:',
  }
);

export const RULE_GAPS_OVERVIEW_LAST_EXECUTION_FAILURE_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastExecutionFailureLabel',
  {
    defaultMessage: 'Failed:',
  }
);

export const RULE_GAPS_OVERVIEW_LAST_EXECUTION_WARNING_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.lastExecutionWarningLabel',
  {
    defaultMessage: 'Warning:',
  }
);
