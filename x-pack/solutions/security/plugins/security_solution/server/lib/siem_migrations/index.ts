/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import type { SiemMigrationsCommonCreateClientParams } from './common/types';
import type { SiemMigrationsService } from './siem_migrations_service';
import type { RuleMigrationsClientDependencies } from './rules/types';
import type { DashboardMigrationsClientDependencies } from './dashboards/types';

export const getSiemMigrationClients = (
  siemMigrationsService: SiemMigrationsService,
  params: SiemMigrationsCommonCreateClientParams & {
    dependencies: RuleMigrationsClientDependencies & DashboardMigrationsClientDependencies;
  }
) => {
  return {
    getRulesClient: memoize(() =>
      siemMigrationsService.createRulesClient({
        request: params.request,
        currentUser: params.currentUser,
        spaceId: params.spaceId,
        dependencies: {
          inferenceClient: params.dependencies.inferenceClient,
          actionsClient: params.dependencies.actionsClient,
          savedObjectsClient: params.dependencies.savedObjectsClient,
          packageService: params.dependencies.packageService,
          telemetry: params.dependencies.telemetry,
          rulesClient: params.dependencies.rulesClient,
        },
      })
    ),

    getDashboardsClient: memoize(() =>
      siemMigrationsService.createDashboardsClient({
        request: params.request,
        currentUser: params.currentUser,
        spaceId: params.spaceId,
        dependencies: {
          inferenceClient: params.dependencies.inferenceClient,
          actionsClient: params.dependencies.actionsClient,
          savedObjectsClient: params.dependencies.savedObjectsClient,
          packageService: params.dependencies.packageService,
          telemetry: params.dependencies.telemetry,
        },
      })
    ),
  };
};
