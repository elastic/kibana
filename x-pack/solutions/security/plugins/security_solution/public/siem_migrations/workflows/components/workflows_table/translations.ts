/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.searchPlaceholder',
  { defaultMessage: 'Search' }
);

export const STATUS_FILTER = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.statusFilter',
  { defaultMessage: 'Status' }
);

export const TAG_FILTER = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.tagFilter',
  { defaultMessage: 'Tag' }
);

export const CREATED_BY_FILTER = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.createdByFilter',
  { defaultMessage: 'Created by' }
);

export const MANAGED_FILTER = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.managedFilter',
  { defaultMessage: 'Managed' }
);

export const SHOWING_ROWS = (shown: number, total: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.workflows.table.showingRows', {
    defaultMessage: 'Showing 1–{shown} of {total} workflows',
    values: { shown, total },
  });

export const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.caption',
  { defaultMessage: 'Translated workflows' }
);

export const NAME_COLUMN = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.nameColumn',
  { defaultMessage: 'Name' }
);

export const TRIGGERS_AND_STEPS_COLUMN = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.triggersAndStepsColumn',
  { defaultMessage: 'Triggers and Steps' }
);

export const STATUS_COLUMN = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.statusColumn',
  { defaultMessage: 'Status' }
);

export const CONNECTORS_COLUMN = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.connectorsColumn',
  { defaultMessage: 'Connectors' }
);

export const ACTIONS_COLUMN = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.actionsColumn',
  { defaultMessage: 'Actions' }
);

export const INSTALL_ACTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.installAction',
  { defaultMessage: 'Install' }
);

export const VIEW_ACTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.viewAction',
  { defaultMessage: 'View' }
);

export const STATUS_TRANSLATED = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.statusTranslated',
  { defaultMessage: 'Translated' }
);

export const STATUS_PARTIALLY_TRANSLATED = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.statusPartiallyTranslated',
  { defaultMessage: 'Partially translated' }
);

export const STATUS_INSTALLED = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.statusInstalled',
  { defaultMessage: 'Installed' }
);

export const STATUS_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.table.statusError',
  { defaultMessage: 'Error' }
);
