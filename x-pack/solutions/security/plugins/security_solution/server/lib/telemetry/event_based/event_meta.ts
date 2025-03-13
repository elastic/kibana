/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationsEventTypes } from './types';

export const siemMigrationEventNames = {
  [SiemMigrationsEventTypes.MigrationSuccess]: 'Migration Success',
  [SiemMigrationsEventTypes.PrebuiltRulesMatch]: 'Prebuilt Rules Match',
  [SiemMigrationsEventTypes.IntegrationsMatch]: 'Integrations Match',
  [SiemMigrationsEventTypes.MigrationFailure]: 'Migration Failure',
  [SiemMigrationsEventTypes.TranslationFailure]: 'Translation Failure',
  [SiemMigrationsEventTypes.TranslationSucess]: 'Translation Success',
} as const;
