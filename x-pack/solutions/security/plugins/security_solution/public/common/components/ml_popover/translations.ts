/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ML_JOB_SETTINGS = i18n.translate(
  'xpack.securitySolution.components.mlPopup.mlJobSettingsButtonLabel',
  {
    defaultMessage: 'ML job settings',
  }
);

export const UPGRADE_TITLE = i18n.translate(
  'xpack.securitySolution.components.mlPopup.upgradeTitle',
  {
    defaultMessage: 'Upgrade to Elastic Platinum',
  }
);

export const UPGRADE_BUTTON = i18n.translate(
  'xpack.securitySolution.components.mlPopup.upgradeButtonLabel',
  {
    defaultMessage: 'Subscription plans',
  }
);

export const LICENSE_BUTTON = i18n.translate(
  'xpack.securitySolution.components.mlPopup.licenseButtonLabel',
  {
    defaultMessage: 'Manage license',
  }
);

export const MODULE_NOT_COMPATIBLE_TITLE = (incompatibleJobCount: number) =>
  i18n.translate('xpack.securitySolution.components.mlPopup.moduleNotCompatibleTitle', {
    values: { incompatibleJobCount },
    defaultMessage:
      '{incompatibleJobCount} {incompatibleJobCount, plural, =1 {job is} other {jobs are}} currently unavailable',
  });

export const ANOMALY_DETECTION_DOCS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.AnomalyDetectionDocsTitle',
  {
    defaultMessage: 'Anomaly Detection with Machine Learning',
  }
);

export const JOB_UPDATES_AVAILABLE_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.components.mlPopup.jobUpdatesAvailableTitle', {
    values: { count },
    defaultMessage:
      '{count} {count, plural, =1 {job has} other {jobs have}} a newer definition available',
  });

export const JOB_UPDATES_AVAILABLE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobUpdatesAvailableDescription',
  {
    defaultMessage:
      'Recreate outdated jobs to pick up enhancements and fixes from the latest packaged revision. Recreating a job removes previously detected anomalies for that job.',
  }
);
