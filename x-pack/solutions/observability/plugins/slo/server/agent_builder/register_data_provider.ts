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
        // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
        //   Review and choose one of the following options:
        //   A) Still unsure? Leave this comment as-is.
        //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
        //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
        //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
        scopedClusterClient: coreStart.elasticsearch.client.asScoped(request, { projectRouting: 'origin-only' }),
        spaceId,
        logger,
      });

      return sloClient.getSlo(sloId, { instanceId: sloInstanceId, remoteName });
    }
  );
}
