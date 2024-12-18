/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNKNOWN_MIGRATION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.unknownMigrationTitle',
  {
    defaultMessage: 'Unknown migration',
  }
);

export const UNKNOWN_MIGRATION_BODY = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.unknownMigrationBodyTitle',
  {
    defaultMessage:
      'Selected migration does not exist. Please select one of the available migraitons',
  }
);
