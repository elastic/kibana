/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_ANALYSIS_WORKFLOW_TITLE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.title',
  {
    defaultMessage: 'Alert analysis workflow',
  }
);

export const THRESHOLD_RANGE_ERROR = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.thresholdRangeErrorMessage',
  {
    defaultMessage: 'Minimum confidence score must be lower than maximum confidence score.',
  }
);

export const TAG_PREFIX_ERROR = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.tagPrefixErrorMessage',
  {
    defaultMessage:
      'Tag prefix may only contain letters, numbers, dots, dashes, and underscores, and must include at least one letter or number.',
  }
);

export const SAVE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.saveSuccessMessage',
  {
    defaultMessage: 'Alert analysis workflow settings saved',
  }
);

export const SAVE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.saveErrorMessage',
  {
    defaultMessage: 'Failed to save alert analysis workflow settings',
  }
);

export const WORKFLOW_ENABLED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.workflowEnabledAriaLabel',
  {
    defaultMessage: 'Enable alert analysis workflow',
  }
);

export const WORKFLOW_ENABLED_HIDDEN_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.workflowEnabledHiddenLabel',
  {
    defaultMessage: 'Enable alert analysis workflow',
  }
);

export const CONNECTOR_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.connectorLabel',
  {
    defaultMessage: 'Connector',
  }
);

export const AGENT_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.agentLabel',
  {
    defaultMessage: 'Agent',
  }
);

export const AGENT_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.agentAriaLabel',
  {
    defaultMessage: 'Agent used by the alert analysis workflow',
  }
);

export const CREATE_CONVERSATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.createConversationAriaLabel',
  {
    defaultMessage: 'Create conversation per alert analysis',
  }
);

export const CREATE_CONVERSATION_HIDDEN_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.createConversationHiddenLabel',
  {
    defaultMessage: 'Create conversation per alert analysis',
  }
);

export const AUTO_CLOSE_ENABLED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.autoCloseEnabledAriaLabel',
  {
    defaultMessage: 'Auto-close alerts classified as false positives',
  }
);

export const AUTO_CLOSE_ENABLED_HIDDEN_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.autoCloseEnabledHiddenLabel',
  {
    defaultMessage: 'Auto-close alerts classified as false positives',
  }
);

export const MIN_THRESHOLD_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.minThresholdAriaLabel',
  {
    defaultMessage: 'Auto-close minimum confidence score',
  }
);

export const MAX_THRESHOLD_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.maxThresholdAriaLabel',
  {
    defaultMessage: 'Auto-close maximum confidence score',
  }
);

export const TAG_PREFIX_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.tagPrefixAriaLabel',
  {
    defaultMessage: 'Alert tag prefix',
  }
);
