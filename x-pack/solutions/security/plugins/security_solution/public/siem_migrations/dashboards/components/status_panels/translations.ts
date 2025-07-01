/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_DASHBOARD_MIGRATION_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.title',
  { defaultMessage: 'Migrate your existing Splunk® SIEM dashboards to Elastic' }
);
export const START_DASHBOARD_MIGRATION_CARD_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.title',
  { defaultMessage: 'Export your Splunk® dashboards to start translation.' }
);

export const START_DASHBOARD_MIGRATION_CARD_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.description',
  {
    defaultMessage:
      'Export your Splunk® dashboards and upload them here to start the migrations. Click “Upload Dashboards” to view step-by-step instructions.',
  }
);

export const START_DASHBOARD_MIGRATION_CARD_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.button',
  { defaultMessage: 'Upload dashboards' }
);

export const START_DASHBOARD_MIGRATION_CARD_UPLOAD_MORE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.uploadMore.title',
  { defaultMessage: 'Need to migrate more dashboards?' }
);
export const START_DASHBOARD_MIGRATION_CARD_UPLOAD_MORE_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.uploadMore.button',
  { defaultMessage: 'Upload more dashboards' }
);
