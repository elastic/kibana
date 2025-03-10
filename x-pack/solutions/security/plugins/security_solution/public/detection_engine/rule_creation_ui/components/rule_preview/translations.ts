/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LAST_HOUR = i18n.translate('xpack.securitySolution.stepDefineRule.lastHour', {
  defaultMessage: 'Last hour',
});

export const LAST_DAY = i18n.translate('xpack.securitySolution.stepDefineRule.lastDay', {
  defaultMessage: 'Last day',
});

export const LAST_WEEK = i18n.translate('xpack.securitySolution.stepDefineRule.lastWeek', {
  defaultMessage: 'Last week',
});

export const LAST_MONTH = i18n.translate('xpack.securitySolution.stepDefineRule.lastMonth', {
  defaultMessage: 'Last month',
});

export const QUERY_PREVIEW_BUTTON = i18n.translate(
  'xpack.securitySolution.stepDefineRule.previewQueryButton',
  {
    defaultMessage: 'Preview results',
  }
);

export const QUICK_PREVIEW_TOGGLE_BUTTON = i18n.translate(
  'xpack.securitySolution.stepDefineRule.quickPreviewToggleButton',
  {
    defaultMessage: 'Quick query preview',
  }
);

export const ADVANCED_PREVIEW_TOGGLE_BUTTON = i18n.translate(
  'xpack.securitySolution.stepDefineRule.advancedPreviewToggleButton',
  {
    defaultMessage: 'Advanced query preview',
  }
);

export const PREVIEW_TIMEOUT_WARNING = i18n.translate(
  'xpack.securitySolution.stepDefineRule.previewTimeoutWarning',
  {
    defaultMessage: 'Preview timed out after 60 seconds',
  }
);

export const QUERY_PREVIEW_SELECT_ARIA = i18n.translate(
  'xpack.securitySolution.stepDefineRule.previewQueryAriaLabel',
  {
    defaultMessage: 'Query preview timeframe select',
  }
);

export const RULE_PREVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.rulePreviewError',
  {
    defaultMessage: 'Failed to preview rule',
  }
);

export const QUERY_PREVIEW_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewLabel',
  {
    defaultMessage: 'Select a preview timeframe',
  }
);

export const QUERY_PREVIEW_INVOCATION_COUNT_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewInvocationCountWarningTitle',
  {
    defaultMessage: 'Rule preview timeframe might cause timeout',
  }
);

export const QUERY_PREVIEW_INVOCATION_COUNT_WARNING_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewInvocationCountWarningMessage',
  {
    defaultMessage: `The timeframe and rule interval that you selected for previewing this rule might cause timeout or take long time to execute. Try to decrease the timeframe and/or increase the interval if preview has timed out (this won't affect the actual rule run).`,
  }
);

export const QUERY_GRAPH_COUNT = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphCountLabel',
  {
    defaultMessage: 'Count',
  }
);

export const QUERY_GRAPH_HITS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewTitle',
  {
    defaultMessage: 'Rule Preview',
  }
);

export const QUERY_PREVIEW_NOISE_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphPreviewNoiseWarning',
  {
    defaultMessage:
      'Noise warning: This rule may cause a lot of noise. Consider narrowing your query. This is based on a linear progression of 1 alert per hour.',
  }
);

export const QUERY_PREVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryGraphPreviewError',
  {
    defaultMessage: 'Error fetching preview',
  }
);

export const PREVIEW_HISTOGRAM_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.histogramDisclaimer',
  {
    defaultMessage:
      'Note: Alerts with multiple event.category values will be counted more than once.',
  }
);

export const ML_PREVIEW_HISTOGRAM_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.mlHistogramDisclaimer',
  {
    defaultMessage: 'Note: Alerts with multiple host.name values will be counted more than once.',
  }
);

export const QUERY_PREVIEW_SEE_ALL_ERRORS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewSeeAllErrors',
  {
    defaultMessage: 'See all errors',
  }
);

export const QUERY_PREVIEW_SEE_ALL_WARNINGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.queryPreviewSeeAllWarnings',
  {
    defaultMessage: 'See all warnings',
  }
);

export const ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.actions',
  {
    defaultMessage: 'Actions',
  }
);

export const VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.viewDetailsAriaLabel',
  {
    defaultMessage: 'View details',
  }
);

export const ENABLED_LOGGED_REQUESTS_CHECKBOX = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.enabledLoggedRequestsLabel',
  {
    defaultMessage: 'Show Elasticsearch requests, ran during rule executions',
  }
);

export const LOGGED_REQUESTS_ACCORDION_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.loggedRequestsAccordionButtonLabel',
  {
    defaultMessage: 'Preview logged requests',
  }
);

export const LOGGED_REQUEST_ITEM_ACCORDION_UNKNOWN_TIME_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryPreview.loggedRequestItemAccordionUnknownTimeButtonLabel',
  {
    defaultMessage: 'Preview logged requests',
  }
);

export const VIEW_DETAILS_FOR_ROW = ({
  ariaRowindex,
  columnValues,
}: {
  ariaRowindex: number;
  columnValues: string;
}) =>
  i18n.translate('xpack.securitySolution.detectionEngine.queryPreview.viewDetailsForRowAriaLabel', {
    values: { ariaRowindex, columnValues },
    defaultMessage:
      'View details for the alert or event in row {ariaRowindex}, with columns {columnValues}',
  });

export const RULE_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.rulePreviewTitle',
  {
    defaultMessage: 'Rule preview',
  }
);

export const RULE_PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.rulePreviewDescription',
  {
    defaultMessage:
      'Rule preview reflects the current configuration of your rule settings and exceptions, click refresh icon to see the updated preview.',
  }
);

export const REQUESTS_SAMPLE_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.rulePreviewRequestSampleWarningText',
  {
    defaultMessage: 'Sample search queries logged only for first 2 requests of each type.',
  }
);
