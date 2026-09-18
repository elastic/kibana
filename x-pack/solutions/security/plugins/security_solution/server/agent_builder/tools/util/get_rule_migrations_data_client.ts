/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ExperimentalFeatures } from '../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getSiemMigrationClients } from '../../../lib/siem_migrations';
import type { RuleMigrationsDataClient } from '../../../lib/siem_migrations/rules/data/rule_migrations_data_client';
import type { SiemMigrationsService } from '../../../lib/siem_migrations/siem_migrations_service';

/**
 * Returns the canonical, request-scoped SIEM rule-migrations data client for an
 * Agent Builder tool.
 *
 * Agent Builder tool handlers only receive `request` / `esClient` / `spaceId`
 * (see `ToolHandlerContext` in `@kbn/agent-builder-server`), so the client has to
 * be assembled here. This goes through `getSiemMigrationClients` — the same entry
 * point `request_context_factory.ts` uses for the migration HTTP routes — with
 * the same dependency bag, which keeps the migration tools on the same data
 * layer as the routes: the canonical index-name providers (which create the
 * per-space index on demand), internal-user reads, and the canonical filter DSL,
 * instead of a second, hand-rolled copy of index naming and query building that
 * can drift.
 */
export const getRuleMigrationsDataClient = async ({
  core,
  siemMigrationsService,
  request,
  spaceId,
  experimentalFeatures,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  siemMigrationsService: SiemMigrationsService;
  request: KibanaRequest;
  spaceId: string;
  experimentalFeatures: ExperimentalFeatures;
}): Promise<RuleMigrationsDataClient> => {
  const [coreStart, startPlugins] = await core.getStartServices();
  const [rulesClient, actionsClient] = await Promise.all([
    startPlugins.alerting.getRulesClientWithRequest(request),
    startPlugins.actions.getActionsClientWithRequest(request),
  ]);

  const { getRulesClient } = getSiemMigrationClients(siemMigrationsService, {
    request,
    currentUser: coreStart.security.authc.getCurrentUser(request),
    spaceId,
    dependencies: {
      inferenceService: startPlugins.inference,
      rulesClient,
      actionsClient,
      savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
      packageService: startPlugins.fleet?.packageService,
      telemetry: core.analytics,
      experimentalFeatures,
    },
  });

  return getRulesClient().data;
};
