/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_WORKFLOW_MIGRATION_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.title',
  { defaultMessage: 'Migrate your Tines stories to Elastic Workflows' }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.upload.title',
  { defaultMessage: 'Export a Tines story to start translation.' }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.upload.description',
  {
    defaultMessage:
      'Export a Tines story as JSON and upload it here to generate Elastic Workflows YAML. Click “Upload story” to get started.',
  }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.upload.button',
  { defaultMessage: 'Upload stories' }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_MORE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.uploadMore.title',
  { defaultMessage: 'Migrate more Tines stories' }
);

export const START_WORKFLOW_MIGRATION_CARD_UPLOAD_MORE_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.workflows.startMigration.uploadMore.button',
  { defaultMessage: 'Upload more' }
);

export const DATA_INPUT_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.dataInputFlyout.title',
  { defaultMessage: 'Migrate Tines workflows' }
);

export const DATA_INPUT_FLYOUT_CLOSE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.dataInputFlyout.closeButton',
  { defaultMessage: 'Close' }
);

export const DATA_INPUT_FLYOUT_TRANSLATE_ANOTHER = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.dataInputFlyout.translateAnotherButton',
  { defaultMessage: 'Translate another' }
);
