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
  type CreateMonitoringEntitySource,
  type MonitoringEngineDescriptor,
} from '../../../../../common/api/entity_analytics';
import { defaultMonitoringUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
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
  const InitSourceCreationService = createInitialisationSourcesService(dataClient);

  const init = async (): Promise<MonitoringEngineDescriptor> => {
    const descriptorClient = new PrivilegeMonitoringEngineDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });
    const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });

    const setupStartTime = moment().utc().toISOString();

    dataClient.audit(
      PrivilegeMonitoringEngineActions.INIT,
      MonitoringEngineComponentResourceEnum.privmon_engine,
      'Initializing privilege monitoring engine'
    );
    const descriptor = await descriptorClient.init();
    dataClient.log('info', `Initialized privileged monitoring engine saved object`);

    if (deps.experimentalFeatures?.integrationsSyncEnabled ?? false) {
      // upsert index AND integration sources
      await InitSourceCreationService.upsertSources(monitoringIndexSourceClient);
    } else {
      // upsert ONLY index source
      await createOrUpdateDefaultDataSource(monitoringIndexSourceClient);
    }

    try {
      dataClient.log('debug', 'Creating privilege user monitoring event.ingested pipeline');
      await IndexService.createIngestPipelineIfDoesNotExist();
      await IndexService.upsertIndex();

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

  const createOrUpdateDefaultDataSource = async (
    monitoringIndexSourceClient: MonitoringEntitySourceDescriptorClient
  ) => {
    const sourceName = dataClient.index;

    const defaultIndexSource: CreateMonitoringEntitySource = {
      type: 'index',
      managed: true,
      indexPattern: defaultMonitoringUsersIndex(deps.namespace),
      name: sourceName,
    };

    const existingSources = await monitoringIndexSourceClient.find({
      name: sourceName,
    });

    if (existingSources.saved_objects.length > 0) {
      dataClient.log('info', 'Default index source already exists, updating it.');
      const existingSource = existingSources.saved_objects[0];
      try {
        await monitoringIndexSourceClient.update({
          id: existingSource.id,
          ...defaultIndexSource,
        });
      } catch (e) {
        dataClient.log(
          'error',
          `Failed to update default index source for privilege monitoring: ${e.message}`
        );
        dataClient.audit(
          PrivilegeMonitoringEngineActions.INIT,
          MonitoringEngineComponentResourceEnum.privmon_engine,
          'Failed to update default index source for privilege monitoring',
          e
        );
      }
    } else {
      dataClient.log('info', 'Creating default index source for privilege monitoring.');

      try {
        // TODO: failing test, empty sources array. FIX
        const indexSourceDescriptor = monitoringIndexSourceClient.create(defaultIndexSource);

        dataClient.log(
          'debug',
          `Created index source for privilege monitoring: ${JSON.stringify(indexSourceDescriptor)}`
        );
      } catch (e) {
        dataClient.log(
          'error',
          `Failed to create default index source for privilege monitoring: ${e.message}`
        );
        dataClient.audit(
          PrivilegeMonitoringEngineActions.INIT,
          MonitoringEngineComponentResourceEnum.privmon_engine,
          'Failed to create default index source for privilege monitoring',
          e
        );
      }
    }
  };
  return { init };
};
