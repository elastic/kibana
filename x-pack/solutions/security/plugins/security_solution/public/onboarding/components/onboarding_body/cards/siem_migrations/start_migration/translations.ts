/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_MIGRATION_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.title',
  { defaultMessage: 'Migrate your existing Splunk® SIEM rules to Elastic' }
);
export const START_MIGRATION_CARD_FOOTER_NOTE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.footerNote',
  {
    defaultMessage:
      'Splunk and related marks are trademarks or registered trademarks of Splunk LLC in the United States and other countries.',
  }
);
export const START_MIGRATION_CARD_CONNECTOR_MISSING_TEXT = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.connectorMissingText',
  {
    defaultMessage:
      'You need an LLM connector to power SIEM rule migration. Set one up or choose an existing one to get started.',
  }
);
export const START_MIGRATION_CARD_CONNECTOR_MISSING_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.connectorMissingText',
  { defaultMessage: 'Set up AI Connector' }
);

export const START_MIGRATION_CARD_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.title',
  { defaultMessage: 'Export your Splunk® SIEM rules to start translation.' }
);

export const START_MIGRATION_CARD_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.description',
  {
    defaultMessage:
      'Upload your rules before importing data to identify the integrations, data streams, and available details of your SIEM rules. Click “Upload Rules” to view step-by-step instructions to export and uploading the rules.',
  }
);

export const START_MIGRATION_CARD_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.upload.button',
  { defaultMessage: 'Upload rules' }
);

export const START_MIGRATION_CARD_UPLOAD_MORE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.uploadMore.title',
  { defaultMessage: 'Need to migrate more rules?' }
);
export const START_MIGRATION_CARD_UPLOAD_MORE_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.startMigration.uploadMore.button',
  { defaultMessage: 'Upload more rules' }
);
