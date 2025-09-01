/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationsEventTypes } from './types';

export const siemMigrationEventNames = {
  [SiemMigrationsEventTypes.MigrationSuccess]: 'Migration success',
  [SiemMigrationsEventTypes.PrebuiltRulesMatch]: 'Prebuilt rules match',
  [SiemMigrationsEventTypes.IntegrationsMatch]: 'Integrations match',
  [SiemMigrationsEventTypes.MigrationAborted]: 'Migration aborted',
  [SiemMigrationsEventTypes.MigrationFailure]: 'Migration failure',
  [SiemMigrationsEventTypes.TranslationFailure]: 'Translation failure',
  [SiemMigrationsEventTypes.TranslationSuccess]: 'Translation success',
} as const;
