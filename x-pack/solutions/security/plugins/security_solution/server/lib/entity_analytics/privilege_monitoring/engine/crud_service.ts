/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PrivilegeMonitoringDataClient } from './data_client';
import {
  MonitoringEntitySourceDescriptorClient,
  PrivilegeMonitoringEngineDescriptorClient,
} from '../saved_objects';
import { removePrivilegeMonitoringTask } from '../tasks/privilege_monitoring_task';
import { ignoreSONotFoundError } from '../saved_objects/helpers';

export const createEngineCrudService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const { deps, index } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;
  const descriptorClient = new PrivilegeMonitoringEngineDescriptorClient({
    soClient,
    namespace: deps.namespace,
  });

  const _delete = async (deleteData = false) => {
    dataClient.log('info', 'Deleting privilege monitoring engine');

    await descriptorClient.delete().catch(ignoreSONotFoundError);

    if (deleteData) {
      await esClient.indices.delete({ index }, { ignore: [404] });
    }
    if (!deps.taskManager) {
      throw new Error('Task Manager is not available');
    }
    await removePrivilegeMonitoringTask({
      logger: deps.logger,
      namespace: deps.namespace,
      taskManager: deps.taskManager,
    });

    const indexSourceClient = new MonitoringEntitySourceDescriptorClient({
      namespace: deps.namespace,
      soClient,
    });

    const { sources: allDataSources } = await indexSourceClient.list({
      per_page: 10000,
    });
    const deleteSourcePromises = allDataSources.map((so) => indexSourceClient.delete(so.id));
    await Promise.all(deleteSourcePromises);

    return { deleted: true };
  };

  return { delete: _delete };
};
