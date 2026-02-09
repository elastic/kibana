/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetSLOParams } from '@kbn/slo-schema';
import type { CoreSetup, Logger, KibanaRequest } from '@kbn/core/server';
import type { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../types';
import {
  DefaultBurnRatesClient,
  DefaultSLODefinitionRepository,
  DefaultSummaryClient,
  GetSLO,
  SLODefinitionClient,
} from '../services';

export function registerDataProviders({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<SLOPluginStartDependencies>;
  plugins: SLOPluginSetupDependencies;
  logger: Logger;
}) {
  const { observabilityAgentBuilder } = plugins;
  if (!observabilityAgentBuilder) {
    return;
  }

  observabilityAgentBuilder.registerDataProvider(
    'sloDetails',
    async ({
      request,
      sloId,
      sloInstanceId,
      remoteName,
    }: {
      request: KibanaRequest;
      sloId: string;
      sloInstanceId?: GetSLOParams['instanceId'];
      remoteName?: GetSLOParams['remoteName'];
    }) => {
      const [coreStart, pluginStart] = await core.getStartServices();
      const spaceId =
        (await pluginStart.spaces?.spacesService.getActiveSpace(request))?.id ?? 'default';

      const soClient = coreStart.savedObjects.getScopedClient(request);
      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

      const repository = new DefaultSLODefinitionRepository(soClient, logger);
      const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
      const summaryClient = new DefaultSummaryClient(
        scopedClusterClient.asCurrentUser,
        burnRatesClient
      );
      const definitionClient = new SLODefinitionClient(
        repository,
        scopedClusterClient.asCurrentUser,
        logger
      );

      const getSlo = new GetSLO(definitionClient, summaryClient);

      return getSlo.execute(sloId, spaceId, { instanceId: sloInstanceId, remoteName });
    }
  );
}
