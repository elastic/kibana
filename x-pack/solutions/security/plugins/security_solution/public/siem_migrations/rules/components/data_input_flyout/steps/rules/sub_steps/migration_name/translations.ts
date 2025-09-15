/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MIGRATION_NAME_INPUT_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.migrationName.title',
  { defaultMessage: 'Migration name' }
);

export const MIGRATION_NAME_INPUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.migrationName.description',
  { defaultMessage: 'Name your migration' }
);

export const MIGRATION_NAME_INPUT_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.migrationName.error',
  { defaultMessage: 'Migration name is required' }
);
