/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  MonitoringEngineComponentResourceEnum,
  type MonitoringEngineDescriptor,
} from '../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from './data_client';
import { PrivilegeMonitoringEngineActions } from '../auditing/actions';
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from '../constants';
import {
  PRIVMON_ENGINE_INITIALIZATION_EVENT,
  PRIVMON_ENGINE_RESOURCE_INIT_FAILURE_EVENT,
} from '../../../telemetry/event_based/events';
import { createPrivmonIndexService } from './elasticsearch/indices';
import {
  MonitoringEntitySourceDescriptorClient,
  PrivilegeMonitoringEngineDescriptorClient,
} from '../saved_objects';
import { startPrivilegeMonitoringTask } from '../tasks/privilege_monitoring_task';
import { createInitialisationSourcesService } from './initialisation_sources_service';

export type InitialisationService = ReturnType<typeof createInitialisationService>;
export const createInitialisationService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const { deps } = dataClient;
  const { taskManager } = deps;

  if (!taskManager) {
    throw new Error('Task Manager is not available');
  }

  const IndexService = createPrivmonIndexService(dataClient);

  const init = async (): Promise<MonitoringEngineDescriptor> => {
    const descriptorClient = new PrivilegeMonitoringEngineDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });
    const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });

    const upsertSources = createInitialisationSourcesService({
      descriptorClient: monitoringIndexSourceClient,
      logger: deps.logger,
      auditLogger: deps.auditLogger,
    });
    const setupStartTime = moment().utc().toISOString();

    dataClient.audit(
      PrivilegeMonitoringEngineActions.INIT,
      MonitoringEngineComponentResourceEnum.privmon_engine,
      'Initializing privilege monitoring engine'
    );
    const descriptor = await descriptorClient.init();

    dataClient.log('info', `Initialized privileged monitoring engine saved object`);

    // upsert index AND integration sources

    try {
      dataClient.log('debug', 'Upserting privilege monitoring sources');
      await upsertSources(deps.namespace);

      dataClient.log('debug', 'Creating privilege user monitoring event.ingested pipeline');
      await IndexService.initialisePrivmonIndex();

      if (deps.apiKeyManager) {
        await deps.apiKeyManager.generate();
      }

      await startPrivilegeMonitoringTask({
        taskManager,
        logger: deps.logger,
        namespace: deps.namespace,
      });

      const setupEndTime = moment().utc().toISOString();
      const duration = moment(setupEndTime).diff(moment(setupStartTime), 'seconds');
      deps.telemetry?.reportEvent(PRIVMON_ENGINE_INITIALIZATION_EVENT.eventType, {
        duration,
      });
    } catch (e) {
      dataClient.log('error', `Error initializing privilege monitoring engine: ${e}`);
      dataClient.audit(
        PrivilegeMonitoringEngineActions.INIT,
        MonitoringEngineComponentResourceEnum.privmon_engine,
        'Failed to initialize privilege monitoring engine',
        e
      );

      deps.telemetry?.reportEvent(PRIVMON_ENGINE_RESOURCE_INIT_FAILURE_EVENT.eventType, {
        error: e.message,
      });
      await descriptorClient.update({
        status: PRIVILEGE_MONITORING_ENGINE_STATUS.ERROR,
        error: {
          message: e.message,
          stack: e.stack,
          action: 'init',
        },
      });

      return {
        status: PRIVILEGE_MONITORING_ENGINE_STATUS.ERROR,
        error: {
          message: e.message,
        },
      };
    }

    return descriptor;
  };

  return { init };
};
