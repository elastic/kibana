/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  MonitoringEngineComponentResourceEnum,
  type MonitoringEngineDescriptor,
} from '../../../../../common/api/entity_analytics';
import { PrivilegeMonitoringEngineDescriptorClient } from '../saved_objects';
import type { PrivilegeMonitoringDataClient } from './data_client';
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from '../constants';
import { removePrivilegeMonitoringTask, scheduleNow } from '../tasks/privilege_monitoring_task';
import { PrivilegeMonitoringEngineActions } from '../auditing/actions';

export type EngineStatusService = ReturnType<typeof createEngineStatusService>;
export const createEngineStatusService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const { deps } = dataClient;

  const descriptorClient = new PrivilegeMonitoringEngineDescriptorClient({
    soClient,
    namespace: deps.namespace,
  });

  const get = descriptorClient.get.bind(descriptorClient);

  const disable = async (): Promise<MonitoringEngineDescriptor> => {
    dataClient.log('info', 'Disabling Privileged Monitoring Engine');

    // Check the current status of the engine
    const currentEngineStatus = await get();
    if (currentEngineStatus.status !== PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED) {
      dataClient.log(
        'info',
        'Privilege Monitoring Engine is not in STARTED state, skipping disable operation'
      );
      return currentEngineStatus;
    }
    if (!deps.taskManager) {
      throw new Error('Task Manager is not available');
    }

    try {
      // 1. Remove the privileged user monitoring task
      dataClient.log('debug', 'Disabling Privileged Monitoring Engine: removing task');
      await removePrivilegeMonitoringTask({
        logger: deps.logger,
        namespace: deps.namespace,
        taskManager: deps.taskManager,
      });

      // 2. Update status in Saved Objects
      dataClient.log(
        'debug',
        'Disabling Privileged Monitoring Engine: Updating status to DISABLED in Saved Objects'
      );
      await descriptorClient.updateStatus(PRIVILEGE_MONITORING_ENGINE_STATUS.DISABLED);

      dataClient.audit(
        PrivilegeMonitoringEngineActions.DISABLE,
        MonitoringEngineComponentResourceEnum.privmon_engine,
        'Privilege Monitoring Engine disabled'
      );
      dataClient.log('info', 'Privileged Monitoring Engine disabled successfully');
      return descriptorClient.get(); // return the updated state
    } catch (e) {
      const msg = `Failed to disable Privileged Monitoring Engine: ${e.message}`;
      dataClient.log('error', msg);

      dataClient.audit(
        PrivilegeMonitoringEngineActions.DISABLE,
        MonitoringEngineComponentResourceEnum.privmon_engine,
        'Failed to disable Privileged Monitoring Engine',
        e
      );
      throw new Error(msg);
    }
  };

  const _scheduleNow = async () => {
    if (!deps.taskManager) {
      throw new Error('Task Manager is not available');
    }

    const engineStatus = await get();
    if (engineStatus.status !== PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED) {
      throw new Error(
        `The Privileged Monitoring Engine must be enabled to schedule a run. Current status: ${engineStatus.status}.`
      );
    }

    dataClient.audit(
      PrivilegeMonitoringEngineActions.SCHEDULE_NOW,
      MonitoringEngineComponentResourceEnum.privmon_engine,
      'Privilege Monitoring Engine scheduled for immediate run'
    );

    return scheduleNow({
      taskManager: deps.taskManager,
      namespace: deps.namespace,
      logger: deps.logger,
    });
  };

  const getCurrentUserCount = async () => {
    const esClient = dataClient.deps.clusterClient.asCurrentUser;
    return esClient.count({
      index: dataClient.index,
      query: {
        term: {
          'user.is_privileged': true,
        },
      },
    });
  };

  return { get, disable, scheduleNow: _scheduleNow, getCurrentUserCount };
};
