/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import type { SiemMigrationsCreateClientParams } from './common/types';
import type { SiemMigrationsService } from './siem_migrations_service';

export const getSiemMigrationClients = (
  siemMigrationsService: SiemMigrationsService,
  params: SiemMigrationsCreateClientParams
) => {
  return {
    getRulesClient: memoize(() => siemMigrationsService.createRulesClient(params)),
    getDashboardsClient: memoize(() => siemMigrationsService.createDashboardsClient(params)),
  };
};
