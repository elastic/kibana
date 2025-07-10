/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SHOW_USERS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.users.show',
  {
    defaultMessage: 'Show users',
  }
);

export const HIDE_USERS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.users.hide',
  {
    defaultMessage: 'Hide users',
  }
);

export const RISK_ENGINE_STATUS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.status',
  {
    defaultMessage: 'Status',
  }
);

export const RISK_ENGINE_STATUS_ON = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.statusOn',
  {
    defaultMessage: 'On',
  }
);

export const RISK_ENGINE_STATUS_OFF = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.statusOff',
  {
    defaultMessage: 'Off',
  }
);

export const ENTITY_RISK_SCORING = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.entityRiskScoring',
  {
    defaultMessage: 'Entity risk score',
  }
);

export const USEFUL_LINKS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.usefulLinks',
  {
    defaultMessage: 'Useful links',
  }
);

export const EA_DASHBOARD_LINK = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.eaDocsDashboard',
  {
    defaultMessage: 'Entity Analytics dashboard',
  }
);

export const EA_DOCS_ENTITY_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.eaDocsEntities',
  {
    defaultMessage: 'How is the risk score calculated?',
  }
);

export const PREVIEW_MISSING_PERMISSIONS_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.missingPermissionsCallout.title',
  {
    defaultMessage: 'Insufficient index privileges to preview data',
  }
);

export const PREVIEW = i18n.translate('xpack.securitySolution.riskScore.riskScorePreview.preview', {
  defaultMessage: 'Preview',
});

export const PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.previewDescription',
  {
    defaultMessage:
      'The entities shown in the preview are the riskiest found in the 1000 sampled during your chosen timeframe. They may not be the riskiest entities across all of your data.',
  }
);

export const PREVIEW_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.errorTitle',
  {
    defaultMessage: 'Preview failed',
  }
);

export const PREVIEW_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.errorMessage',
  {
    defaultMessage: 'Something went wrong when creating the preview. Please try again.',
  }
);

export const PREVIEW_ERROR_TRY_AGAIN = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.tryAgain',
  {
    defaultMessage: 'Try again',
  }
);

export const PREVIEW_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.queryErrorTitle',
  {
    defaultMessage: 'Invalid query',
  }
);

export const ERROR_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.errorPanel.title',
  {
    defaultMessage: 'There was an error',
  }
);

export const ERROR_PANEL_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.errorPanel.message',
  {
    defaultMessage: 'The risk engine status could not be changed. Fix the following and try again:',
  }
);

export const ERROR_PANEL_ERRORS = i18n.translate(
  'xpack.securitySolution.riskScore.errorPanel.errors',
  {
    defaultMessage: 'Errors',
  }
);

export const CHECK_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.riskScore.errors.privileges.check',
  {
    defaultMessage: 'Check privileges',
  }
);

export const NEED_TO_HAVE = i18n.translate(
  'xpack.securitySolution.riskScore.errors.privileges.needToHave',
  {
    defaultMessage: 'You need to have:',
  }
);

export const RISK_ENGINE_TURNED_ON = i18n.translate(
  'xpack.securitySolution.riskScore.moduleTurnedOn',
  {
    defaultMessage: 'Entity risk score has been turned on',
  }
);

export const RISK_ENGINE_TURNED_OFF = i18n.translate(
  'xpack.securitySolution.riskScore.moduleTurnedOff',
  {
    defaultMessage: 'Entity risk score has been turned off',
  }
);

export const RISK_SCORE_ENGINE_RUN_SUCCESS = i18n.translate(
  'xpack.securitySolution.riskScore.engineRunSuccess',
  {
    defaultMessage: 'Entity risk score engine started successfully',
  }
);

export const RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.riskScore.savedObject.configurationSuccess',
  {
    defaultMessage: 'Your configuration was updated.',
  }
);

export const INCLUDE_CLOSED_ALERTS_LABEL = i18n.translate(
  'xpack.securitySolution.riskScore.includeClosedAlertsLabel',
  {
    defaultMessage: 'Include closed alerts for risk scoring',
  }
);

export const RISK_ENGINE_INCLUDE_CLOSED_ALERTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskScore.includeClosedAlertsDescription',
  {
    defaultMessage: `Enable this option to factor both open and closed alerts into the risk engine
            calculations. Including closed alerts helps provide a more comprehensive risk assessment
            based on past incidents, leading to more accurate scoring and insights.`,
  }
);

export const RISK_ENGINE_NEXT_RUN_TIME = (timeInMinutes: string) =>
  i18n.translate('xpack.securitySolution.riskScore.engineNextRunTime', {
    defaultMessage: `Next engine run in {timeInMinutes}`,
    values: { timeInMinutes },
  });

export const RISK_ENGINE_STATUS_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.riskScore.riskEngineStatus',
  {
    defaultMessage: 'Risk engine status',
  }
);

export const RUN_RISK_SCORE_ENGINE = i18n.translate('xpack.securitySolution.riskScore.runEngine', {
  defaultMessage: 'Run Engine',
});

export const SAVE_CHANGES = i18n.translate(
  'xpack.securitySolution.riskScore.engineSavedObjectsaveChanges',
  {
    defaultMessage: 'Save',
  }
);

export const DISCARD_CHANGES = i18n.translate(
  'xpack.securitySolution.riskScore.engineSavedObject.discardChanges',
  {
    defaultMessage: 'Discard',
  }
);

export const RISK_SCORE_ENGINE_RUN_FAILURE = i18n.translate(
  'xpack.securitySolution.riskScore.engineRunSuccess',
  {
    defaultMessage: 'Entity risk score engine failed to start',
  }
);
