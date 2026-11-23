/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WORKFLOWS_MIGRATION_TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.caption',
  { defaultMessage: 'Workflows translation status' }
);

export const COLUMN_NAME = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.nameColumn',
  { defaultMessage: 'Name' }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.statusColumn',
  { defaultMessage: 'Status' }
);

export const COLUMN_TRANSLATED_ON = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.translatedOnColumn',
  { defaultMessage: 'Translated on' }
);

export const COLUMN_DETAILS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.detailsColumn',
  { defaultMessage: 'Details' }
);

export const WORKFLOW_DETAILS_UNAVAILABLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.detailsUnavailable',
  { defaultMessage: 'Workflow details are not available yet' }
);

export const WORKFLOW_STATUS_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.statusError',
  { defaultMessage: 'Error' }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.searchPlaceholder',
  { defaultMessage: 'Search by name' }
);
