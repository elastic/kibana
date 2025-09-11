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
import {
  API_VERSIONS,
  MONITORING_ENGINE_INIT_URL,
  MONITORING_ENGINE_SCHEDULE_NOW_URL,
  MONITORING_USERS_CSV_UPLOAD_URL,
} from '@kbn/security-solution-plugin/common/constants';
import type { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics';
import type { TaskStatus } from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import { routeWithNamespace, waitFor } from '../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

type PrivmonUser = ListPrivMonUsersResponse[number];
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
  const retry = getService('retry');

  log.info(`Monitoring: Privileged Users: Using namespace ${namespace}`);

  const _expectDateToBeGreaterThan = (
    bigDate: string | undefined,
    smallDate: string | undefined
  ) => {
    const bigMoment = moment(bigDate);
    const smallMoment = moment(smallDate);
    const isAfter = bigMoment.isAfter(smallMoment);
    if (!isAfter) {
      log.error(`Expected ${bigDate} to be after ${smallDate}`);
    }
    expect(isAfter).toBeTruthy();
  };

  const expectTimestampsHaveBeenUpdated = (userBefore?: PrivmonUser, userAfter?: PrivmonUser) => {
    _expectDateToBeGreaterThan(userAfter?.['@timestamp'], userBefore?.['@timestamp']);
    _expectDateToBeGreaterThan(userAfter?.event?.ingested, userBefore?.event?.ingested);
  };

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
      .post(routeWithNamespace(MONITORING_ENGINE_INIT_URL, namespace))
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
      .post(routeWithNamespace(MONITORING_USERS_CSV_UPLOAD_URL, namespace))
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
      .post(routeWithNamespace(MONITORING_ENGINE_SCHEDULE_NOW_URL, namespace))
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

  const assertIsPrivileged = (user: PrivmonUser | undefined, isPrivileged: boolean) => {
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

  const _waitForPrivMonUsersToBeSynced = async (expectedLength = 1) => {
    let lastSeenLength = -1;

    return retry.waitForWithTimeout('users to be synced', 90000, async () => {
      const res = await api.listPrivMonUsers({ query: {} });
      const currentLength = res.body.length;

      if (currentLength !== lastSeenLength) {
        log.info(`PrivMon users sync check: found ${currentLength} users`);
        lastSeenLength = currentLength;
      }

      return currentLength >= expectedLength;
    });
  };

  const scheduleEngineAndWaitForUserCount = async (expectedCount: number) => {
    log.info(`Scheduling engine and waiting for user count: ${expectedCount}`);
    await scheduleMonitoringEngineNow({ ignoreConflict: true });
    await waitForSyncTaskRun();
    await _waitForPrivMonUsersToBeSynced(expectedCount);
    const res = await api.listPrivMonUsers({ query: {} });

    return res.body;
  };

  return {
    assertIsPrivileged,
    bulkUploadUsersCsv,
    expectTimestampsHaveBeenUpdated,
    findUser,
    initPrivMonEngine,
    initPrivMonEngineWithoutAuth,
    scheduleMonitoringEngineNow,
    setPrivmonTaskStatus,
    waitForSyncTaskRun,
    scheduleEngineAndWaitForUserCount,
  };
};
