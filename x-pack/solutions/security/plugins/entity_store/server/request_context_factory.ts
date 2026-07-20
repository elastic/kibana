/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type {
  EntityStoreApiRequestHandlerContext,
  EntityStoreCoreSetup,
  EntityStoreRequestHandlerContext,
} from './types';
import { AssetManagerClient } from './domain/asset_manager';
import { EntityMaintainersClient } from './domain/entity_maintainers';
import { FeatureFlags } from './infra/feature_flags';
import {
  EngineDescriptorClient,
  EntityStoreGlobalStateClient,
  EntityStorePreferencesClient,
} from './domain/saved_objects';
import { LogsExtractionClient } from './domain/logs_extraction';
import { createRemoteLogsExtractionClient } from './domain/logs_extraction/remote';
import { HistorySnapshotClient } from './domain/history_snapshot';
import { CRUDClient } from './domain/crud';
import { EntityMetadataClient } from './domain/entity_metadata';
import { ResolutionClient } from './domain/resolution';
import { ResolutionRulesClient } from './domain/resolution/rules';
import type { TelemetryReporter } from './telemetry/events';
import { createWorkflowTriggerEmitter } from './workflow/create_workflow_trigger_emitter';

interface EntityStoreApiRequestHandlerContextDeps {
  coreSetup: EntityStoreCoreSetup;
  context: Omit<EntityStoreRequestHandlerContext, 'entityStore'>;
  logger: Logger;
  request: KibanaRequest;
  isServerless: boolean;
  analytics: TelemetryReporter;
}

export async function createRequestHandlerContext({
  logger,
  context,
  coreSetup,
  request,
  isServerless,
  analytics,
}: EntityStoreApiRequestHandlerContextDeps): Promise<EntityStoreApiRequestHandlerContext> {
  const core = await context.core;
  const [coreStart, startPlugins] = await coreSetup.getStartServices();
  const taskManagerStart = startPlugins.taskManager;

  const namespace = startPlugins.spaces.spacesService.getSpaceId(request);
  const emitEvent = createWorkflowTriggerEmitter({
    getWorkflowsClient: () => startPlugins.workflowsExtensions.getClient(request),
    logger,
    context: `namespace "${namespace}"`,
  });

  const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
    core.savedObjects.client,
    core.elasticsearch.client.asInternalUser,
    request
  );

  const engineDescriptorClient = new EngineDescriptorClient(
    core.savedObjects.client,
    namespace,
    logger
  );

  const globalStateClient = new EntityStoreGlobalStateClient(
    core.savedObjects.client,
    namespace,
    logger
  );

  // The preferences saved object is plugin-internal (not in the security feature's saved-object
  // types and hidden from the generic SO HTTP API). Access it with a client that skips the
  // security extension so it doesn't require per-type saved-object privileges; the `/preferences`
  // routes gate access via the Entity Store feature privilege instead.
  const preferencesClient = new EntityStorePreferencesClient(
    coreStart.savedObjects.getScopedClient(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    }),
    namespace,
    logger
  );

  const esClient = core.elasticsearch.client.asCurrentUser;
  const cpsClient = coreStart.elasticsearch.client.asScoped(request, {
    projectRouting: 'space',
  }).asCurrentUser;

  const crudClient = new CRUDClient({
    logger,
    esClient,
    namespace,
    emitWorkflowTriggerEvent: emitEvent,
  });
  const entityMetadataClient = new EntityMetadataClient({
    logger,
    esClient: core.elasticsearch.client.asInternalUser,
    namespace,
  });
  const { client: remoteLogsExtractionClient, stateClient: remoteLogExtractionStateClient } =
    createRemoteLogsExtractionClient({
      logger,
      namespace,
      soClient: core.savedObjects.client,
      esClient,
      cpsClient,
      isServerless,
    });

  const logsExtractionClient = new LogsExtractionClient({
    logger,
    namespace,
    esClient,
    dataViewsService,
    engineDescriptorClient,
    globalStateClient,
    remoteLogsExtractionClient,
  });

  const historySnapshotClient = new HistorySnapshotClient({
    logger,
    esClient,
    namespace,
    globalStateClient,
  });

  return {
    core,
    logger,
    assetManagerClient: new AssetManagerClient({
      logger,
      esClient: core.elasticsearch.client.asCurrentUser,
      internalEsClient: core.elasticsearch.client.asInternalUser,
      taskManager: taskManagerStart,
      engineDescriptorClient,
      globalStateClient,
      remoteLogExtractionStateClient,
      namespace,
      isServerless,
      logsExtractionClient,
      security: startPlugins.security,
      analytics,
      savedObjectsClient: core.savedObjects.client,
    }),
    entityMaintainersClient: new EntityMaintainersClient({
      logger,
      taskManager: taskManagerStart,
      namespace,
      analytics,
      coreStart,
      licensing: startPlugins.licensing,
    }),
    preferencesClient,
    crudClient,
    entityMetadataClient,
    resolutionClient: new ResolutionClient({
      logger,
      esClient: core.elasticsearch.client.asCurrentUser,
      namespace,
    }),
    entityResolutionRuleClient: new ResolutionRulesClient(
      core.savedObjects.client,
      namespace,
      logger
    ),
    remoteLogsExtractionClient,
    featureFlags: new FeatureFlags(core.uiSettings.client),
    logsExtractionClient,
    historySnapshotClient,
    security: startPlugins.security,
    namespace,
    analytics,
  };
}
