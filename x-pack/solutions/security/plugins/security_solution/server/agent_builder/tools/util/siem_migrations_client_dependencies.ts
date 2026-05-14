/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { ExperimentalFeatures } from '../../../../common';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginStartDependencies,
} from '../../../plugin_contract';
import type { SiemMigrationsClientDependencies } from '../../../lib/siem_migrations/common/types';

/**
 * Builds the request-scoped dependency bag the SIEM Migrations data clients
 * require for `createRulesClient`. Used by Agent Builder tools that delegate
 * writes to the canonical migration data layer.
 *
 * Mirrors the shape that `request_context_factory.ts` constructs for route
 * handlers. The duplication is necessary because Agent Builder tool handlers
 * do not receive `SecuritySolutionApiRequestHandlerContext` — they only get
 * `request` / `esClient` / `spaceId`. Keeping the assembly in one helper
 * means the dependency surface lives in a single file that can be updated
 * in lockstep with the migration service contract.
 */
export const buildSiemMigrationsClientDependencies = async (
  core: SecuritySolutionPluginCoreSetupDependencies,
  request: KibanaRequest,
  experimentalFeatures: ExperimentalFeatures
): Promise<{
  coreStart: CoreStart;
  startPlugins: SecuritySolutionPluginStartDependencies;
  dependencies: SiemMigrationsClientDependencies;
}> => {
  const [coreStart, startPlugins] = await core.getStartServices();
  const [rulesClient, actionsClient] = await Promise.all([
    startPlugins.alerting.getRulesClientWithRequest(request),
    startPlugins.actions.getActionsClientWithRequest(request),
  ]);

  return {
    coreStart,
    startPlugins,
    dependencies: {
      inferenceService: startPlugins.inference,
      rulesClient,
      actionsClient,
      savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
      packageService: startPlugins.fleet?.packageService,
      // `core.analytics` (CoreSetup) carries the AnalyticsServiceSetup the
      // migration data clients expect; `coreStart.analytics` would resolve to
      // AnalyticsServiceStart which is the wrong shape. Same wiring as
      // `request_context_factory.ts`.
      telemetry: core.analytics,
      experimentalFeatures,
    },
  };
};
