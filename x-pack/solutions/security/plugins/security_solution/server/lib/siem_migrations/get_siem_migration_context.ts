/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getSiemMigrationClients } from './index';
import type { SiemMigrationsService } from './siem_migrations_service';

export type SiemMigrationClients = ReturnType<typeof getSiemMigrationClients>;

export type GetSiemMigrationContext = (
  request: KibanaRequest,
  spaceId: string
) => Promise<SiemMigrationClients>;

/**
 * Creates a factory function that assembles SIEM migration clients from a bare KibanaRequest.
 *
 * Colocated with `getSiemMigrationClients` so any non-route consumer (agent-builder tools,
 * task-manager tasks, workflows) can get scoped clients without going through the route
 * request-handler context.
 *
 * Safe to call during plugin `setup()`: `getSiemMigrationClients` only memoizes thunks, so
 * nothing reads `esClusterClient` — assigned later in the deferred `getStartServices()` callback —
 * until a tool handler actually calls a getter.
 */
export const createSiemMigrationContextFactory = ({
  core,
  siemMigrationsService,
  experimentalFeatures,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  siemMigrationsService: SiemMigrationsService;
  experimentalFeatures: ExperimentalFeatures;
}): GetSiemMigrationContext => {
  return async (request, spaceId) => {
    const [coreStart, startPlugins] = await core.getStartServices();

    return getSiemMigrationClients(siemMigrationsService, {
      request,
      currentUser: coreStart.security.authc.getCurrentUser(request),
      spaceId,
      dependencies: {
        inferenceService: startPlugins.inference,
        rulesClient: await startPlugins.alerting.getRulesClientWithRequest(request),
        actionsClient: await startPlugins.actions.getActionsClientWithRequest(request),
        savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
        packageService: startPlugins.fleet?.packageService,
        telemetry: core.analytics,
        experimentalFeatures,
      },
    });
  };
};
