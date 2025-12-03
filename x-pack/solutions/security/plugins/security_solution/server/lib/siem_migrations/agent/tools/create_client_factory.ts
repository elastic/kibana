/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { SiemMigrationsService } from '../../siem_migrations_service';
import type { SiemRuleMigrationsClient } from '../../rules/siem_rule_migrations_service';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../../plugin_contract';

export type SiemMigrationsClientGetter = (
  request: KibanaRequest
) => Promise<SiemRuleMigrationsClient>;

/**
 * Creates a factory function that produces scoped SIEM migrations clients.
 * This factory is used by tools to get a properly scoped client for each request.
 */
export function createSiemMigrationsClientFactory({
  core,
  siemMigrationsService,
}: {
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>;
  siemMigrationsService: SiemMigrationsService;
}): SiemMigrationsClientGetter {
  return async (request: KibanaRequest): Promise<SiemRuleMigrationsClient> => {
    const [coreStart, plugins] = await core.getStartServices();

    const currentUser = coreStart.security.authc.getCurrentUser(request);
    if (!currentUser) {
      throw new Error('User must be authenticated to access SIEM migrations');
    }

    const spaceId = plugins.spaces?.spacesService?.getSpaceId(request) ?? 'default';

    const rulesClient = await plugins.alerting.getRulesClientWithRequest(request);
    const actionsClient = await plugins.actions.getActionsClientWithRequest(request);
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    return siemMigrationsService.createRulesClient({
      request,
      currentUser,
      spaceId,
      dependencies: {
        inferenceService: plugins.inference,
        rulesClient,
        actionsClient,
        savedObjectsClient,
        packageService: plugins.fleet?.packageService,
        telemetry: coreStart.analytics,
      },
    });
  };
}
