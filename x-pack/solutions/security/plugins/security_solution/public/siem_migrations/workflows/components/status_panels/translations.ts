/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_WORKFLOW_MIGRATION_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.title',
  { defaultMessage: 'Migrate your existing workflows to Elastic' }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.upload.title',
  { defaultMessage: 'Export your workflows to start translation.' }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.upload.description',
  {
    defaultMessage:
      'Export your workflows from source system and upload it here to generate Elastic Workflows artifacts. Click “Upload workflows” to get started.',
  }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.upload.button',
  { defaultMessage: 'Upload workflows' }
);

export const START_WORKFLOW_MIGRATION_CARD_UI_DISABLED_TEXT = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.uiDisabled',
  {
    defaultMessage:
      'Elastic Workflows is turned off. Turn it on in Advanced Settings to migrate Tines stories.',
  }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_MORE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.uploadMore.title',
  { defaultMessage: 'Need to migrate more workflows?' }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_MORE_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.uploadMore.button',
  { defaultMessage: 'Upload more' }
);
