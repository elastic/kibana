/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import { APMEventClient, type ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../types';

export interface ApmResources {
  apmEventClient: APMEventClient;
  apmDataAccessServices: ApmDataAccessServices;
}

export async function buildApmResources({
  core,
  plugins,
  request,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
}): Promise<ApmResources> {
  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );
  const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
  const indices = await plugins.apmDataAccess.getApmIndices(savedObjectsClient);

  const apmEventClient = new APMEventClient({
    esClient,
    debug: false,
    request,
    indices,
    options: {
      includeFrozen: false,
      excludedDataTiers: [],
    },
  });

  const apmDataAccessServices = plugins.apmDataAccess.getServices({ apmEventClient });

  return {
    apmEventClient,
    apmDataAccessServices,
  };
}
