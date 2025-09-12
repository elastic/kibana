/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OPEN_MIGRATION_OPTIONS_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.openMigrationOptionsButton',
  { defaultMessage: 'Open migration options' }
);

export const RENAME_MIGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.renameMigrationText',
  { defaultMessage: 'Rename' }
);

export const DELETE_BUTTON_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.deleteButtonText',
  { defaultMessage: 'Delete' }
);

export const DELETE_MIGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.deleteMigrationText',
  { defaultMessage: 'Delete Migration' }
);

export const NOT_DELETABLE_MIGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.notDeletableMigrationText',
  { defaultMessage: 'Can not delete running migrations' }
);

export const CANCEL_DELETE_MIGRATION_TEXT = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.cancelDeleteMigrationText',
  { defaultMessage: 'Cancel' }
);

export const DELETE_MIGRATION_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.delete.title',
  { defaultMessage: 'Are you sure you want to delete this migration?' }
);

export const DELETE_MIGRATION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.delete.description',
  {
    defaultMessage:
      'This action cannot be undone. All translations related to this migration will be removed permanently.',
  }
);
