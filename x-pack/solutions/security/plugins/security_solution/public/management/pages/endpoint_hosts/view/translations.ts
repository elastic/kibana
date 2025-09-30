/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OVERVIEW = i18n.translate('xpack.securitySolution.endpointDetails.overview', {
  defaultMessage: 'Overview',
});

export const WORKFLOW_INSIGHTS = {
  title: i18n.translate('xpack.securitySolution.endpointDetails.workflowInsights.sectionTitle', {
    defaultMessage: 'Automatic Troubleshooting',
  }),
  titleRight: i18n.translate(
    'xpack.securitySolution.endpointDetails.workflowInsights.extraAction',
    {
      defaultMessage: 'Last scans:',
    }
  ),
  scan: {
    title: i18n.translate('xpack.securitySolution.endpointDetails.workflowInsights.scan.title', {
      defaultMessage: 'Automatic Troubleshooting',
    }),
    button: i18n.translate('xpack.securitySolution.endpointDetails.workflowInsights.scan.button', {
      defaultMessage: 'Scan',
    }),
    loading: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.scan.loading',
      {
        defaultMessage: 'Loading...',
      }
    ),
    noPermissions: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.scan.noPermissions',
      {
        defaultMessage: 'You do not have the privileges required to perform this operation.',
      }
    ),
  },
  knowledgeBase: {
    setupKB: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.knowledgeBase.setupRequired.setupKB',
      { defaultMessage: 'set up a knowledge base' }
    ),
    setupOngoing: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.knowledgeBase.setupOngoing',
      {
        defaultMessage:
          "Knowledge base setup is in progress. You can start a scan now and we'll queue it for you.",
      }
    ),
    docsLinkText: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.knowledgeBase.docsLinkText',
      {
        defaultMessage: 'Learn more',
      }
    ),
  },
  issues: {
    title: i18n.translate('xpack.securitySolution.endpointDetails.workflowInsights.issues.title', {
      defaultMessage: 'Insights',
    }),
    survey: {
      description: i18n.translate(
        'xpack.securitySolution.endpointDetails.workflowInsights.survey.text',
        {
          defaultMessage: 'How is Automatic Troubleshooting working for you? ',
        }
      ),
      callToAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.workflowInsights.survey.callToAction',
        {
          defaultMessage: 'Provide feedback',
        }
      ),
    },
    emptyResults: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.issues.emptyResults',
      {
        defaultMessage: 'Troubleshooting scan complete, no issues found.',
      }
    ),
    remediationButton: {
      incompatibleAntivirus: {
        ariaLabel: i18n.translate(
          'xpack.securitySolution.endpointDetails.workflowInsights.issues.incompatibleAntivirus.insightRemediationButtonAriaLabel',
          {
            defaultMessage: 'Create trusted app',
          }
        ),
        actionText: i18n.translate(
          'xpack.securitySolution.endpointDetails.workflowInsights.issues.incompatibleAntivirus.insightRemediationButtonActionText',
          {
            defaultMessage: 'Create trusted app',
          }
        ),
        tooltipContent: i18n.translate(
          'xpack.securitySolution.endpointDetails.workflowInsights.issues.incompatibleAntivirus.insightRemediationButtonTooltipContent',
          {
            defaultMessage: 'Create trusted app',
          }
        ),
        tooltipNoPermissions: i18n.translate(
          'xpack.securitySolution.endpointDetails.workflowInsights.issues.incompatibleAntivirus.insightRemediationButtonTooltipNoPermissions',
          {
            defaultMessage: 'You do not have the privileges required to perform this operation.',
          }
        ),
      },
      policyResponseFailure: {
        ariaLabel: i18n.translate(
          'xpack.securitySolution.endpointDetails.workflowInsights.issues.policyResponseFailure.insightRemediationButtonAriaLabel',
          {
            defaultMessage: 'Learn more',
          }
        ),
        actionText: i18n.translate(
          'xpack.securitySolution.endpointDetails.workflowInsights.issues.policyResponseFailure.insightRemediationButtonActionText',
          {
            defaultMessage: 'Learn more',
          }
        ),
        expandMessage: i18n.translate(
          'xpack.securitySolution.endpointDetails.workflowInsights.issues.policyResponseFailure.insightRemediationButtonExpandMessage',
          {
            defaultMessage: 'view more',
          }
        ),
        collapseMessage: i18n.translate(
          'xpack.securitySolution.endpointDetails.workflowInsights.issues.policyResponseFailure.insightRemediationButtonCollapseMessage',
          {
            defaultMessage: 'view less',
          }
        ),
      },
    },
  },
  toasts: {
    scanError: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.toast.error',
      {
        defaultMessage: 'Failed to start scan',
      }
    ),
    partialScanError: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.toast.partialScanError',
      {
        defaultMessage: 'Insight scan failed',
      }
    ),
    partialScanErrorBody: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.toast.partialScanErrorBody',
      {
        defaultMessage: 'Some insights could not be generated. Please try again.',
      }
    ),
    fetchInsightsError: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.toast.fetchInsightsError',
      {
        defaultMessage: 'Failed to fetch insights',
      }
    ),
    fetchPendingInsightsError: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.toast.fetchPendingInsightsError',
      {
        defaultMessage: 'Failed to retrieve insights in the generation process',
      }
    ),
    updateInsightError: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.toast.updateInsightError',
      {
        defaultMessage: 'Failed to mark insight as remediated',
      }
    ),
    maxFetchAttemptsReached: i18n.translate(
      'xpack.securitySolution.endpointDetails.workflowInsights.toast.maxFetchAttemptsReached',
      {
        defaultMessage: 'Failed to fetch insights after multiple attempts',
      }
    ),
  },
};

export const ACTIVITY_LOG = {
  tabTitle: i18n.translate('xpack.securitySolution.endpointDetails.responseActionsHistory', {
    defaultMessage: 'Response actions history',
  }),
  LogEntry: {
    endOfLog: i18n.translate(
      'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.endOfLog',
      {
        defaultMessage: 'Nothing more to show',
      }
    ),
    dateRangeMessage: i18n.translate(
      'xpack.securitySolution.endpointDetails.activityLog.logEntry.dateRangeMessage.title',
      {
        defaultMessage:
          'Nothing to show for selected date range, please select another and try again.',
      }
    ),
    emptyState: {
      title: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.emptyState.title',
        {
          defaultMessage: 'No logged actions',
        }
      ),
      body: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.emptyState.body',
        {
          defaultMessage: 'No actions have been logged for this endpoint.',
        }
      ),
    },
    action: {
      isolatedAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.isolated',
        {
          defaultMessage: 'submitted request: Isolate host',
        }
      ),
      unisolatedAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.unisolated',
        {
          defaultMessage: 'submitted request: Release host',
        }
      ),
      failedEndpointReleaseAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.failedEndpointReleaseAction',
        {
          defaultMessage: 'failed to submit request: Release host',
        }
      ),
      failedEndpointIsolateAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.failedEndpointIsolateAction',
        {
          defaultMessage: 'failed to submit request: Isolate host',
        }
      ),
    },
    response: {
      isolationCompletedAndSuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolationCompletedAndSuccessful',
        {
          defaultMessage: 'Host isolation request completed by Endpoint',
        }
      ),
      isolationCompletedAndUnsuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolationCompletedAndUnsuccessful',
        {
          defaultMessage: 'Host isolation request completed by Endpoint with errors',
        }
      ),
      unisolationCompletedAndSuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationCompletedAndSuccessful',
        {
          defaultMessage: 'Release request completed by Endpoint',
        }
      ),
      unisolationCompletedAndUnsuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationCompletedAndUnsuccessful',
        {
          defaultMessage: 'Release request completed by Endpoint with errors',
        }
      ),
      isolationSuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolationSuccessful',
        {
          defaultMessage: 'Host isolation request received by Endpoint',
        }
      ),
      isolationFailed: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolationFailed',
        {
          defaultMessage: 'Host isolation request received by Endpoint with errors',
        }
      ),
      unisolationSuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationSuccessful',
        {
          defaultMessage: 'Release host request received by Endpoint',
        }
      ),
      unisolationFailed: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationFailed',
        {
          defaultMessage: 'Release host request received by Endpoint with errors',
        }
      ),
    },
  },
};
