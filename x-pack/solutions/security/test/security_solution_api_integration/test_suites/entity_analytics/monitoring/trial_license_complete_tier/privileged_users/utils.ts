/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common/src/constants';
import { API_VERSIONS } from '@kbn/security-solution-plugin/common/constants';
import type { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/privilege_monitoring/users/list.gen';
import type { TaskStatus } from '@kbn/task-manager-plugin/server';
import { routeWithNamespace, waitFor } from '../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export const PrivMonUtils = (
  getService: FtrProviderContext['getService'],
  namespace: string = 'default'
) => {
  const TASK_ID = 'entity_analytics:monitoring:privileges:engine:default:1.0.0';
  const api = getService('securitySolutionApi');
  const log = getService('log');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  log.info(`Monitoring: Privileged Users: Using namespace ${namespace}`);

  const initPrivMonEngine = async () => {
    log.info(`Initializing Privilege Monitoring engine in namespace ${namespace || 'default'}`);
    const res = await api.initMonitoringEngine(namespace);

    if (res.status !== 200) {
      log.error(`Failed to initialize engine`);
      log.error(JSON.stringify(res.body));
    }

    expect(res.status).toEqual(200);
  };

  const initPrivMonEngineWithoutAuth = async ({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) => {
    return await supertestWithoutAuth
      .post(routeWithNamespace('/api/entity_analytics/monitoring/engine/init', namespace))
      .auth(username, password)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send();
  };

  const bulkUploadUsersCsv = async (
    fileContent: string | Buffer,
    { expectStatusCode }: { expectStatusCode: number } = { expectStatusCode: 200 }
  ) => {
    const file = fileContent instanceof Buffer ? fileContent : Buffer.from(fileContent);
    return supertest
      .post(routeWithNamespace('/api/entity_analytics/monitoring/users/_csv', namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .attach('file', file, { filename: 'users.csv', contentType: 'text/csv' })
      .expect(expectStatusCode);
  };

  const scheduleMonitoringEngineNow = async (
    {
      ignoreConflict,
      expectStatusCode,
    }: { ignoreConflict?: boolean; expectStatusCode?: number } = { ignoreConflict: false }
  ) => {
    log.info(
      `Scheduling Privilege Monitoring engine in namespace ${
        namespace || 'default'
      }, ignoreConflict: ${!!ignoreConflict}`
    );
    return supertest
      .post(routeWithNamespace('/api/entity_analytics/monitoring/engine/schedule_now', namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .expect((res: { status: number }) => {
        if (expectStatusCode) {
          return res.status === expectStatusCode;
        }
        return res.status === 200 || (ignoreConflict && res.status === 409);
      });
  };

  const setPrivmonTaskStatus = async (status: TaskStatus) => {
    log.info(
      `Setting Privilege Monitoring task to ${status} in namespace ${namespace || 'default'}`
    );

    const taskId = `task:entity_analytics:monitoring:privileges:engine:${namespace}:1.0.0`;
    await es.update({
      refresh: 'wait_for',
      index: '.kibana_task_manager',
      id: taskId,
      script: `ctx._source.task.status = "${status}";`,
    });
  };

  const retry = async <T>(fn: () => Promise<T>, retries: number = 5, delay: number = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const waitForSyncTaskRun = async (): Promise<void> => {
    const initialTime = new Date();

    await waitFor(
      async () => {
        const task = await kibanaServer.savedObjects.get({
          type: 'task',
          id: TASK_ID,
        });
        const runAtTime = task.attributes.runAt;

        return !!runAtTime && new Date(runAtTime) > initialTime;
      },
      'waitForSyncTaskRun',
      log
    );
  };

  const assertIsPrivileged = (
    user: ListPrivMonUsersResponse[number] | undefined,
    isPrivileged: boolean
  ) => {
    if (isPrivileged) {
      expect(user?.user?.is_privileged).toEqual(true);
    } else {
      expect(user?.user?.is_privileged).toEqual(false);
      expect(user?.labels?.source_ids).toEqual([]);
      expect(user?.labels?.sources).toEqual([]);
    }
  };

  const findUser = (users: ListPrivMonUsersResponse, username: string) =>
    users.find((user) => user.user?.name === username);

  const createSourceIndex = async (indexName: string) =>
    es.indices.create({
      index: indexName,
      mappings: {
        properties: {
          user: {
            properties: {
              name: {
                type: 'keyword',
              },
            },
          },
        },
      },
    });

  return {
    initPrivMonEngine,
    initPrivMonEngineWithoutAuth,
    bulkUploadUsersCsv,
    retry,
    waitForSyncTaskRun,
    findUser,
    createSourceIndex,
    assertIsPrivileged,
    scheduleMonitoringEngineNow,
    setPrivmonTaskStatus,
  };
};
