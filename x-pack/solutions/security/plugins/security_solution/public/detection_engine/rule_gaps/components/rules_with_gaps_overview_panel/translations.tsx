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
    defaultMessage: 'Only rules with unfilled gaps',
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

export const RULE_GAPS_OVERVIEW_PANEL_TOOLTIP_TEXT = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.tooltipText',
  {
    defaultMessage: 'Rules with unfilled gaps / Rules with gaps being filled now',
  }
);

export const GAP_FILL_TRACKER_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.gapFillTrackerTitle',
  {
    defaultMessage: 'Gap filling tracker',
  }
);

export const AUTO_FILL_GAP_STATUS_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.autoFillGapStatusTitle',
  {
    defaultMessage: 'Auto fill gap status',
  }
);

export const SCHEDULER_RUN_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.schedulerRunTitle',
  {
    defaultMessage: 'Scheduler run',
  }
);

export const SCHEDULER_LOGS_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.schedulerLogsTitle',
  {
    defaultMessage: 'Auto fill scheduler logs',
  }
);

export const RUN_TIME_COLUMN = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.runTimeColumn',
  {
    defaultMessage: 'Run time',
  }
);

export const GAPS_SCHEDULED_COLUMN = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.gapsScheduledColumn',
  {
    defaultMessage: 'Gaps scheduled to be filled',
  }
);

export const RULES_PROCESSED_COLUMN = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.rulesProcessedColumn',
  {
    defaultMessage: 'Rules processed',
  }
);

export const AUTO_FILL_ON_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.autoFillOnLabel',
  {
    defaultMessage: 'Auto fill on',
  }
);

export const AUTO_FILL_OFF_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.autoFillOffLabel',
  {
    defaultMessage: 'Auto fill off',
  }
);

export const EXPAND_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.expandRowAriaLabel',
  {
    defaultMessage: 'Expand row',
  }
);

export const COLLAPSE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.collapseRowAriaLabel',
  {
    defaultMessage: 'Collapse row',
  }
);

export const REFRESH_LABEL = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.refreshLabel',
  {
    defaultMessage: 'Refresh',
  }
);

export const STATUS_FILTER_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.statusFilterTitle',
  {
    defaultMessage: 'Status',
  }
);

export const SCHEDULER_LOGS_FILTER_NOTE = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.schedulerLogsFilterNote',
  {
    defaultMessage:
      'By default, runs where no gaps were processed are hidden. Use the status filter to include skipped runs.',
  }
);

export const LOGS_STATUS_COLUMN = i18n.translate(
  'xpack.securitySolution.ruleGapsOverviewPanel.logsStatusColumn',
  {
    defaultMessage: 'Status',
  }
);
