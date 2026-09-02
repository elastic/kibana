/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.title',
  { defaultMessage: 'Translated workflows' }
);

export const COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.columnTitle',
  { defaultMessage: 'Title' }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.columnStatus',
  { defaultMessage: 'Status' }
);

export const COLUMN_TRANSLATION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.columnTranslation',
  { defaultMessage: 'Translation' }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.columnActions',
  { defaultMessage: 'Actions' }
);

export const PREVIEW_YAML = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.previewYaml',
  { defaultMessage: 'Preview YAML' }
);

export const SAVE_WORKFLOW = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.save',
  { defaultMessage: 'Save' }
);

export const SAVE_AND_RUN_WORKFLOW = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.saveAndRun',
  { defaultMessage: 'Save & run' }
);

export const CLOSE_PREVIEW = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.closePreview',
  { defaultMessage: 'Close' }
);

export const NO_YAML = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.noYaml',
  { defaultMessage: 'No translated YAML available for this item.' }
);

export const TABLE_CAPTION = (total: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.table.caption', {
    defaultMessage: '{total} {total, plural, one {workflow} other {workflows}}',
    values: { total },
  });
