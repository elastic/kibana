/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, KibanaRequest } from '@kbn/core/server';
import type {
  InfraServerPluginSetupDeps,
  InfraServerPluginStartDeps,
} from '../lib/adapters/framework';
import { getHosts } from '../routes/infra/lib/host/get_hosts';
import type { InfraBackendLibs } from '../lib/infra_types';
import { getInfraMetricsClient } from '../lib/helpers/get_infra_metrics_client';
import { getInfraAlertsClient } from '../lib/helpers/get_infra_alerts_client';
import { getPreferredSchema } from '../lib/helpers/get_preferred_schema';
import { getInfraRequestHandlerContext } from '../utils/get_infra_request_handler_context';
import type { InfraPluginRequestHandlerContext } from '../types';
import { getApmDataAccessClient } from '../lib/helpers/get_apm_data_access_client';

const DEFAULT_HOST_METRICS = [
  'cpuV2',
  'memory',
  'memoryFree',
  'diskSpaceUsage',
  'normalizedLoad1m',
] as const;

export function registerDataProviders({
  core,
  plugins,
  libs,
  logger,
}: {
  core: CoreSetup<InfraServerPluginStartDeps>;
  plugins: InfraServerPluginSetupDeps;
  libs: InfraBackendLibs;
  logger: Logger;
}) {
  const { observabilityAgentBuilder } = plugins;
  if (!observabilityAgentBuilder) {
    return;
  }

  observabilityAgentBuilder.registerDataProvider(
    'infraHosts',
    async ({ request, from, to, limit, query }) => {
      const infraToolResources = await buildInfraToolResources({ core, plugins, libs, request });

      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();

      const { preferredSchema } = await getPreferredSchema({
        infraMetricsClient: infraToolResources.infraMetricsClient,
        dataSource: 'host',
        from: fromMs,
        to: toMs,
      });

      if (!preferredSchema) {
        logger.info('Could not determine preferred schema ');
        return { nodes: [] };
      }

      const result = await getHosts({
        from: fromMs,
        to: toMs,
        metrics: [...DEFAULT_HOST_METRICS],
        limit,
        query,
        alertsClient: infraToolResources.alertsClient,
        infraMetricsClient: infraToolResources.infraMetricsClient,
        apmDataAccessServices: infraToolResources.apmDataAccessServices,
        schema: preferredSchema,
      });

      return result;
    }
  );
}

async function buildInfraToolResources({
  core,
  plugins,
  libs,
  request,
}: {
  core: CoreSetup<InfraServerPluginStartDeps>;
  plugins: InfraServerPluginSetupDeps;
  libs: InfraBackendLibs;
  request: KibanaRequest;
}) {
  const coreContext = await core.createRequestHandlerContext(request);

  const infraContext = await getInfraRequestHandlerContext({ coreContext, request, plugins });
  const context = {
    core: Promise.resolve(coreContext),
    infra: Promise.resolve(infraContext),
  } as unknown as InfraPluginRequestHandlerContext;

  const infraMetricsClient = await getInfraMetricsClient({ libs, context, request });
  const alertsClient = await getInfraAlertsClient({ libs, request });
  const apmDataAccessClient = getApmDataAccessClient({ request, libs, context });
  const apmDataAccessServices = await apmDataAccessClient.getServices();

  return { infraMetricsClient, alertsClient, apmDataAccessServices };
}
