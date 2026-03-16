/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { getErrorMessage } from '../../common';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type { EntityStoreCoreSetup } from '../types';
import type { EntityType } from '../../common/domain/definitions/entity_schema';
import { ALL_ENTITY_TYPES } from '../../common/domain/definitions/entity_schema';
import { AssetManagerClient } from '../domain/asset_manager';
import { getLatestEntitiesIndexName } from '../domain/asset_manager/latest_index';
import { ENTITY_STORE_STATUS } from '../domain/constants';
import { CcsLogsExtractionClient, LogsExtractionClient } from '../domain/logs_extraction';
import { EngineDescriptorClient, EntityStoreGlobalStateClient } from '../domain/saved_objects';
import type { GetStatusResult } from '../domain/types';
import {
  ENTITY_STORE_HEALTH_REPORT_EVENT,
  ENTITY_STORE_USAGE_EVENT,
  createReportEvent,
  type TelemetryReporter,
} from '../telemetry/events';
import { wrapTaskRun } from '../telemetry/traces';

const config = TasksConfig[EntityStoreTaskType.enum.statusReport];

const getStatusReportTaskId = (namespace: string): string => `${config.type}:${namespace}`;

const getStoreSize = (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  signal: AbortSignal
) =>
  esClient.count(
    {
      index,
      query: { term: { 'entity.EngineMetadata.Type': entityType } },
    },
    { signal }
  );

const toHealthReportPayload = (statusResult: GetStatusResult) => {
  if (statusResult.status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
    return { engines: [] };
  }

  const { engines } = statusResult;

  return {
    engines: engines.map((engine) => ({
      type: engine.type,
      status: engine.status,
      components: (('components' in engine ? engine.components : []) ?? []).map((component) => {
        const normalizedComponent: {
          id: string;
          resource: string;
          installed: boolean;
          status?: string;
          lastError?: string;
        } = {
          id: component.id,
          resource: component.resource,
          installed: component.installed,
        };

        if ('status' in component && typeof component.status === 'string') {
          normalizedComponent.status = component.status;
        }

        if ('lastError' in component && typeof component.lastError === 'string') {
          normalizedComponent.lastError = component.lastError;
        }

        return normalizedComponent;
      }),
    })),
  };
};

async function runTask({
  taskInstance,
  fakeRequest,
  abortController,
  logger,
  core,
  telemetryReporter,
}: RunContext & {
  logger: Logger;
  core: EntityStoreCoreSetup;
  telemetryReporter: TelemetryReporter;
  abortController: AbortController;
}): Promise<RunResult> {
  const namespace = taskInstance.state.namespace as string;

  if (!fakeRequest) {
    logger.error('No fake request found, skipping status report task');
    return { state: { namespace } };
  }

  try {
    const [coreStart, startPlugins] = await core.getStartServices();
    const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);
    const esClient = coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
    const index = getLatestEntitiesIndexName(namespace);
    const abortSignal = abortController.signal;

    // Report Entity Store usage per entity type
    await Promise.all(
      ALL_ENTITY_TYPES.map(async (entityType) => {
        try {
          const { count: storeSize } = await getStoreSize(esClient, index, entityType, abortSignal);
          telemetryReporter.reportEvent(ENTITY_STORE_USAGE_EVENT, {
            storeSize,
            entityType,
            namespace,
          });
        } catch (e) {
          logger.error(`Error reporting store usage for ${entityType}: ${getErrorMessage(e)}`);
        }
      })
    );

    // Report status
    try {
      const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
        soClient,
        coreStart.elasticsearch.client.asInternalUser,
        fakeRequest
      );
      const engineDescriptorClient = new EngineDescriptorClient(soClient, namespace, logger);
      const globalStateClient = new EntityStoreGlobalStateClient(soClient, namespace, logger);
      const ccsLogsExtractionClient = new CcsLogsExtractionClient(logger, esClient, namespace);
      const logsExtractionClient = new LogsExtractionClient({
        logger,
        namespace,
        esClient,
        dataViewsService,
        engineDescriptorClient,
        globalStateClient,
        ccsLogsExtractionClient,
      });
      const assetManagerClient = new AssetManagerClient({
        logger,
        esClient,
        taskManager: startPlugins.taskManager,
        engineDescriptorClient,
        globalStateClient,
        namespace,
        isServerless: false,
        logsExtractionClient,
        security: startPlugins.security,
        analytics: createReportEvent(core.analytics),
        savedObjectsClient: soClient,
      });
      const statusResult = await assetManagerClient.getStatus(true);
      telemetryReporter.reportEvent(
        ENTITY_STORE_HEALTH_REPORT_EVENT,
        toHealthReportPayload(statusResult)
      );
    } catch (e) {
      logger.error(`Error reporting entity store health: ${getErrorMessage(e)}`);
    }
  } catch (e) {
    logger.error(`Error running status report task: ${getErrorMessage(e)}`);
  }

  return { state: { namespace } };
}

export function registerStatusReportTask({
  taskManager,
  logger,
  core,
}: {
  core: EntityStoreCoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}): void {
  try {
    const telemetryReporter = createReportEvent(core.analytics);
    taskManager.registerTaskDefinitions({
      [config.type]: {
        title: config.title,
        timeout: config.timeout,
        createTaskRunner: ({ taskInstance, fakeRequest, abortController }) => ({
          run: () =>
            wrapTaskRun({
              spanName: 'entityStore.task.status_report.run',
              namespace: taskInstance.state.namespace,
              attributes: {
                'entity_store.task.id': taskInstance.id,
              },
              run: () =>
                runTask({
                  taskInstance,
                  fakeRequest,
                  abortController,
                  logger: logger.get(taskInstance.id),
                  core,
                  telemetryReporter,
                }),
            }),
        }),
      },
    });
  } catch (e) {
    logger.error(`Error registering status report task: ${getErrorMessage(e)}`);
    throw e;
  }
}

export async function scheduleStatusReportTask({
  logger,
  taskManager,
  namespace,
  request,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
  request: KibanaRequest;
}): Promise<void> {
  try {
    await taskManager.ensureScheduled(
      {
        id: getStatusReportTaskId(namespace),
        taskType: config.type,
        schedule: { interval: config.interval },
        state: { namespace },
        params: {},
      },
      { request }
    );
  } catch (e) {
    logger.error(`Error scheduling status report task: ${getErrorMessage(e)}`);
    throw e;
  }
}

export async function stopStatusReportTask({
  taskManager,
  logger,
  namespace,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  namespace: string;
}): Promise<void> {
  const taskId = getStatusReportTaskId(namespace);
  await taskManager.removeIfExists(taskId);
  logger.debug(`Removed status report task: ${taskId}`);
}
