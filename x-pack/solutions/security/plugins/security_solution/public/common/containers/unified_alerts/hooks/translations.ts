/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_UNIFIED_ALERTS_FAILURE = i18n.translate(
  'xpack.securitySolution.unifiedAlerts.searchUnifiedAlertsFailure',
  {
    defaultMessage: 'Failed to search unified alerts',
  }
);

export const SET_UNIFIED_ALERTS_WORKFLOW_STATUS_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.unifiedAlerts.setWorkflowStatusSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully updated workflow status for {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const SET_UNIFIED_ALERTS_WORKFLOW_STATUS_FAILURE = i18n.translate(
  'xpack.securitySolution.unifiedAlerts.setWorkflowStatusFailure',
  {
    defaultMessage: 'Failed to update alert workflow status',
  }
);

export const SET_UNIFIED_ALERTS_TAGS_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.unifiedAlerts.setTagsSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully updated tags for {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const SET_UNIFIED_ALERTS_TAGS_FAILURE = i18n.translate(
  'xpack.securitySolution.unifiedAlerts.setTagsFailure',
  {
    defaultMessage: 'Failed to update alert tags',
  }
);

export const SET_UNIFIED_ALERTS_ASSIGNEES_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.unifiedAlerts.setAssigneesSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully updated assignees for {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const SET_UNIFIED_ALERTS_ASSIGNEES_FAILURE = i18n.translate(
  'xpack.securitySolution.unifiedAlerts.setAssigneesFailure',
  {
    defaultMessage: 'Failed to update alert assignees',
  }
);
