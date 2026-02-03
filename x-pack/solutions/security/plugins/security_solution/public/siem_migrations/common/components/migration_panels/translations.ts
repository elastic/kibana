/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Common translations for all migration panels
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

// Progress panel translations
export const MIGRATION_PROGRESS_DESCRIPTION = (totalItems: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.panels.progress.description', {
    defaultMessage: `Processing migration of {totalItems} items.`,
    values: { totalItems },
  });

export const MIGRATION_PREPARING = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.progress.preparing',
  { defaultMessage: `Preparing environment for the AI powered translation.` }
);

export const MIGRATION_TRANSLATING = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.progress.translating',
  { defaultMessage: `Translating items` }
);

export const MIGRATION_STOP_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.translate.stopButton',
  { defaultMessage: 'Stop' }
);

export const MIGRATION_STOPPING_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.translate.stoppingButton',
  { defaultMessage: 'Stopping' }
);

// Error panel translations
export const MIGRATION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.panels.error',
  { defaultMessage: 'The last execution of this migration failed with the following message:' }
);
