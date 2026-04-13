/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CoreStart, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { LicenseCheckState, LicenseType } from '@kbn/licensing-types';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import {
  EntityMaintainerTaskStatus,
  EntityMaintainerTelemetryEventType,
  type EntityMaintainerState,
  type EntityMaintainerStatus,
  type EntityMaintainerTaskMethod,
} from './types';
import { CRUDClient, type EntityUpdateClient } from '../../domain/crud';
import type { TelemetryReporter } from '../../telemetry/events';
import { ENTITY_MAINTAINER_EVENT } from '../../telemetry/events';
import { wrapTaskRun } from '../../telemetry/traces';

const ENTITY_MAINTAINER_LICENSE_CHECK_VALID = 'valid' as const satisfies LicenseCheckState;

export interface ExecuteMaintainerRunParams {
  currentStatus: Partial<EntityMaintainerStatus>;
  request: KibanaRequest;
  taskIdStr: string;
  taskAbortController?: AbortController;
  namespace?: string;
  id: string;
  run: EntityMaintainerTaskMethod;
  setup?: EntityMaintainerTaskMethod;
  initialState: EntityMaintainerState;
  effectiveMinLicense: LicenseType;
  type: string;
  coreStart: CoreStart;
  licensing: LicensingPluginStart;
  analytics: TelemetryReporter;
  logger: Logger;
}

export async function canRunMaintainerWithLicense({
  id,
  minLicense,
  licensing,
  logger,
}: {
  id: string;
  minLicense: LicenseType;
  licensing: LicensingPluginStart;
  logger: Logger;
}): Promise<boolean> {
  const license = await licensing.getLicense();
  const checkResult = license.check('entityStore', minLicense);
  if (checkResult.state !== ENTITY_MAINTAINER_LICENSE_CHECK_VALID) {
    logger.debug(`Entity maintainer "${id}" skipped: insufficient or inactive license`);
    return false;
  }

  return true;
}

export function createMaintainerStatus({
  currentStatus,
  namespace,
  initialState,
}: {
  currentStatus: Partial<EntityMaintainerStatus>;
  namespace?: string;
  initialState: EntityMaintainerState;
}): EntityMaintainerStatus {
  const currentStatusNamespace =
    typeof currentStatus?.namespace === 'string' ? currentStatus.namespace : undefined;

  return {
    metadata: {
      runs: currentStatus?.metadata?.runs || 0,
      lastSuccessTimestamp: currentStatus?.metadata?.lastSuccessTimestamp || null,
      lastErrorTimestamp: currentStatus?.metadata?.lastErrorTimestamp || null,
      namespace: namespace ?? currentStatusNamespace ?? currentStatus?.metadata?.namespace ?? '',
    },
    state: currentStatus?.metadata?.runs ? currentStatus.state ?? initialState : initialState,
    taskStatus: currentStatus?.taskStatus ?? EntityMaintainerTaskStatus.STARTED,
  };
}

export async function executeMaintainerRun({
  currentStatus,
  request,
  taskIdStr,
  taskAbortController,
  namespace,
  id,
  run,
  setup,
  initialState,
  effectiveMinLicense,
  type,
  coreStart,
  licensing,
  analytics,
  logger,
}: ExecuteMaintainerRunParams): Promise<{ state: EntityMaintainerStatus } | null> {
  if (currentStatus.taskStatus === EntityMaintainerTaskStatus.STOPPED) {
    logger.debug(`Entity maintainer task is stopped, skipping run`);
    return null;
  }

  const hasValidLicense = await canRunMaintainerWithLicense({
    id,
    minLicense: effectiveMinLicense,
    licensing,
    logger,
  });
  if (!hasValidLicense) {
    return null;
  }

  const maintainerStatus = createMaintainerStatus({ currentStatus, namespace, initialState });
  const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
  const crudClient = new CRUDClient({
    logger,
    esClient,
    namespace: maintainerStatus.metadata.namespace,
  });
  const taskLogger = logger.get(taskIdStr);
  const abortController = taskAbortController ?? new AbortController();

  return await wrapTaskRun({
    spanName: 'entityStore.task.entity_maintainer.run',
    namespace: maintainerStatus.metadata.namespace,
    attributes: {
      'entity_store.task.id': taskIdStr,
      'entity_store.task.type': type,
      'entity_store.entity_maintainer.id': id,
    },
    run: () =>
      runEntityMaintainerTask({
        currentStatus: maintainerStatus,
        fakeRequest: request,
        logger: taskLogger,
        setup,
        run,
        abortController,
        esClient,
        crudClient,
        id,
        analytics,
      }),
  });
}

export async function persistMaintainerState({
  taskManager,
  taskId,
  state,
  request,
}: {
  taskManager: TaskManagerStartContract;
  taskId: string;
  state: EntityMaintainerStatus;
  request: KibanaRequest;
}): Promise<void> {
  await taskManager.bulkUpdateState([taskId], () => state, { request });
}

export async function runEntityMaintainerTask({
  currentStatus,
  fakeRequest,
  logger,
  setup,
  run,
  abortController,
  esClient,
  crudClient,
  id,
  analytics,
}: {
  currentStatus: EntityMaintainerStatus;
  fakeRequest: KibanaRequest;
  logger: Logger;
  setup?: EntityMaintainerTaskMethod;
  run: EntityMaintainerTaskMethod;
  abortController: AbortController;
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  id: string;
  analytics: TelemetryReporter;
}): Promise<{ state: EntityMaintainerStatus }> {
  const namespace = currentStatus.metadata.namespace;
  const onAbort = () => {
    logger.debug(`Abort signal received, stopping Entity Maintainer`);
    analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
      id,
      namespace,
      type: EntityMaintainerTelemetryEventType.ABORT,
    });
  };
  try {
    abortController.signal.addEventListener('abort', onAbort);
    const isFirstRun = currentStatus.metadata.runs === 0;
    if (isFirstRun && setup) {
      logger.debug(`First run, executing setup`);
      currentStatus.state = await setup({
        status: { ...currentStatus },
        abortController,
        logger,
        fakeRequest,
        esClient,
        crudClient,
      });
      analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
        id,
        namespace,
        type: EntityMaintainerTelemetryEventType.SETUP,
      });
    }
    logger.debug(`Executing run`);
    currentStatus.state = await run({
      status: { ...currentStatus },
      abortController,
      logger,
      fakeRequest,
      esClient,
      crudClient,
    });
    analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
      id,
      namespace,
      type: EntityMaintainerTelemetryEventType.RUN,
    });
    currentStatus.metadata.lastSuccessTimestamp = new Date().toISOString();
  } catch (err) {
    currentStatus.metadata.lastErrorTimestamp = new Date().toISOString();
    logger.debug(`Run failed - ${err?.message}`);
    analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
      id,
      namespace,
      type: EntityMaintainerTelemetryEventType.ERROR,
      errorMessage: err?.message?.substring(0, 500), // limit error message length to prevent excessively long strings in telemetry
    });
  } finally {
    currentStatus.metadata.runs++;
    abortController.signal.removeEventListener('abort', onAbort);
  }

  return {
    state: currentStatus,
  };
}
