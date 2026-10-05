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

export const SAVE_SUCCESS_WORKER_DISABLED_MESSAGE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.saveSuccessWorkerDisabledMessage',
  {
    defaultMessage: 'The Alert Triage Worker was turned off because it requires alert analysis.',
  }
);

export const saveWorkerRulesLeftAttachedMessage = (count: number): string =>
  i18n.translate(
    'xpack.securitySolution.alertAnalysisWorkflow.saveWorkerRulesLeftAttachedMessage',
    {
      defaultMessage:
        'The Alert Triage Worker was turned off, but {count, plural, one {# machine learning rule still has} other {# machine learning rules still have}} its action attached because you do not have the machine learning permissions needed to edit {count, plural, one {it} other {them}}. Someone with machine learning permissions must turn the Worker off again on the AlertZero Watches page to detach {count, plural, one {it} other {them}}.',
      values: { count },
    }
  );

export const SAVE_WORKER_STILL_ENABLED_MESSAGE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.saveWorkerStillEnabledMessage',
  {
    defaultMessage:
      'The Alert Triage Worker could not be turned off and cannot triage alerts while alert analysis is off. Turn it off on the AlertZero Watches page.',
  }
);

export const DISABLE_WORKER_CONFIRM_TITLE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.disableWorkerConfirmTitle',
  {
    defaultMessage: 'Turn off alert analysis and the Alert Triage Worker?',
  }
);

export const DISABLE_WORKER_CONFIRM_BODY = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.disableWorkerConfirmBody',
  {
    defaultMessage:
      'The AlertZero Alert Triage Worker requires alert analysis. If you continue, the Worker will also be turned off and detached from rules. You can turn it back on from the AlertZero Watches page once alert analysis is on again.',
  }
);

export const DISABLE_WORKER_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.disableWorkerConfirmButton',
  {
    defaultMessage: 'Turn off both',
  }
);

export const DISABLE_WORKER_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.disableWorkerCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const SAVE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.saveErrorMessage',
  {
    defaultMessage: 'Failed to save alert analysis workflow settings',
  }
);

export const LOAD_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.loadErrorTitle',
  {
    defaultMessage: 'Unable to load Alert Analysis workflow settings',
  }
);

export const LOAD_ERROR_BODY = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.loadErrorBody',
  {
    defaultMessage: 'Try again, or contact your administrator if the problem continues.',
  }
);

export const LOAD_ERROR_RETRY = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.loadErrorRetry',
  {
    defaultMessage: 'Retry',
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
