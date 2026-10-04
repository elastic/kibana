/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_WORKFLOWS_MIGRATION_DIALOG_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.startMigrationDialog.title',
  { defaultMessage: 'Translate workflows with AI' }
);

export const START_WORKFLOWS_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.startMigrationDialog.description',
  {
    defaultMessage:
      'Select an AI connector to translate your Tines stories into Elastic Workflows.',
  }
);

export const RETRY_WORKFLOWS_MIGRATION_DIALOG_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.retryMigrationDialog.title',
  { defaultMessage: 'Retry workflows translation' }
);

export const RETRY_WORKFLOWS_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.retryMigrationDialog.description',
  {
    defaultMessage: 'Select an AI connector to retry translating your workflows.',
  }
);
