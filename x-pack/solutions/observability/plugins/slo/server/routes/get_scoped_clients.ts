/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, KibanaRequest, Logger, SavedObjectsClient } from '@kbn/core/server';
import {
  DefaultSummaryTransformManager,
  DefaultTransformManager,
  KibanaSavedObjectsSLORepository,
} from '../services';
import { DefaultSummaryTransformGenerator } from '../services/summary_transform_generator/summary_transform_generator';
import { createTransformGenerators } from '../services/transform_generators';
import { SLOPluginStartDependencies, SLOServerStart } from '../types';
import { GetScopedClients } from './types';

export function getScopedClientsSetupFactory({
  core,
  logger,
  isServerless,
}: {
  core: CoreSetup<SLOPluginStartDependencies, SLOServerStart>;
  logger: Logger;
  isServerless: boolean;
}): GetScopedClients {
  return async (request) => {
    const [coreStart, pluginsStart] = await core.getStartServices();
    return getScopedClients({
      request,
      coreStart,
      pluginsStart,
      logger,
      isServerless,
    });
  };
}

export function getScopedClientsStartFactory({
  coreStart,
  pluginsStart,
  logger,
  isServerless,
}: {
  coreStart: CoreStart;
  pluginsStart: SLOPluginStartDependencies;
  logger: Logger;
  isServerless: boolean;
}): GetScopedClients {
  return async (request) =>
    getScopedClients({
      request,
      coreStart,
      pluginsStart,
      logger,
      isServerless,
    });
}

export async function getScopedClients({
  request,
  coreStart,
  pluginsStart,
  logger,
  isServerless,
}: {
  request: KibanaRequest;
  coreStart: CoreStart;
  pluginsStart: SLOPluginStartDependencies;
  logger: Logger;
  isServerless: boolean;
}): ReturnType<GetScopedClients> {
  const internalSoClient = new SavedObjectsClient(
    coreStart.savedObjects.createInternalRepository()
  );
  const soClient = coreStart.savedObjects.getScopedClient(request);
  const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

  const [dataViewsService, rulesClient, { id: spaceId }, racClient] = await Promise.all([
    pluginsStart.dataViews.dataViewsServiceFactory(soClient, scopedClusterClient.asCurrentUser),
    pluginsStart.alerting.getRulesClientWithRequest(request),
    pluginsStart.spaces?.spacesService.getActiveSpace(request) ?? { id: 'default' },
    pluginsStart.ruleRegistry.getRacClientWithRequest(request),
  ]);

  const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

  const transformManager = new DefaultTransformManager(
    createTransformGenerators(spaceId, dataViewsService, isServerless),
    scopedClusterClient,
    logger
  );
  const summaryTransformManager = new DefaultSummaryTransformManager(
    new DefaultSummaryTransformGenerator(),
    scopedClusterClient,
    logger
  );

  return {
    scopedClusterClient,
    soClient,
    internalSoClient,
    dataViewsService,
    rulesClient,
    spaceId,
    repository,
    transformManager,
    summaryTransformManager,
    racClient,
  };
}
