/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetSLOParams } from '@kbn/slo-schema';
import type { CoreSetup, Logger, KibanaRequest } from '@kbn/core/server';
import type { SLOPluginSetupDependencies, SLOPluginStartDependencies } from '../types';
import { getSloClientWithRequest } from '../client';

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

      const sloClient = getSloClientWithRequest({
        request,
        soClient: coreStart.savedObjects.getScopedClient(request),
        esClient: coreStart.elasticsearch.client.asInternalUser,
        scopedClusterClient: coreStart.elasticsearch.client.asScoped(request),
        spaceId,
        logger,
      });

      return sloClient.getSlo(sloId, { instanceId: sloInstanceId, remoteName });
    }
  );
}
