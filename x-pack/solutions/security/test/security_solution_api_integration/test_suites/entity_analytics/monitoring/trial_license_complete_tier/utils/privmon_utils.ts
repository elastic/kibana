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
import type {
  ListEntitySourcesResponse,
  ListPrivMonUsersResponse,
  MonitoringEntitySource,
} from '@kbn/security-solution-plugin/common/api/entity_analytics';
import type { TaskStatus } from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import { routeWithNamespace, waitFor } from '../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

type PrivmonUser = ListPrivMonUsersResponse[number];
// Default within last month so included in first run range of now-1M
const DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP = new Date(
  Date.now() - 3.5 * 7 * 24 * 60 * 60 * 1000
).toISOString();

export const PrivMonUtils = (
  getService: FtrProviderContext['getService'],
  namespace: string = 'default'
) => {
  const TASK_ID = 'entity_analytics:monitoring:privileges:engine:default:1.0.0';
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const log = getService('log');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const api = getService('entityAnalyticsApi');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const retry = getService('retry');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const roleScopedSupertest = isServerless ? getService('roleScopedSupertest') : null;

  log.info(`Monitoring: Privileged Users: Using namespace ${namespace}`);

  const _callInitAsAdmin = async () => {
    // we have to use cookie auth to call this API because the init route creates an API key
    // and Kibana does not allow this with API key auth (which is the default in @serverless tests)
    if (!isServerless || !roleScopedSupertest) {
      // In ESS, use regular supertest with admin privileges
      return supertest
        .post(routeWithNamespace(MONITORING_ENGINE_INIT_URL, namespace))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();
    }
    const supertestCookieAuth = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
      useCookieHeader: true,
    });

    return supertestCookieAuth
      .post(routeWithNamespace(MONITORING_ENGINE_INIT_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');
  };

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
    const res = await _callInitAsAdmin();

    if (res.status !== 200 || res.body.status !== 'started') {
      log.error(`Failed to initialize engine in namespace ${namespace}. Status: ${res.status}`);
      log.error(JSON.stringify(res.body));
    }

    expect(res.status).toEqual(200);
    expect(res.body.status).toEqual('started');
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
      const res = await entityAnalyticsApi.listPrivMonUsers({ query: {} });
      const currentLength = res.body.length;

      if (currentLength !== lastSeenLength) {
        log.info(
          `PrivMon users sync check: found ${currentLength} users (expected: ${expectedLength})`
        );
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
    const res = await entityAnalyticsApi.listPrivMonUsers({ query: {} });

    return res.body;
  };

  async function runSync() {
    await scheduleMonitoringEngineNow({ ignoreConflict: true });
    await waitForSyncTaskRun();
  }

  async function setTimestamp(id: string, ts: string, indexPattern: string) {
    return updateIntegrationsUserTimeStamp({
      id,
      timestamp: ts,
      indexPattern,
    });
  }

  const expectUserCount = async (n: number) => {
    const users = (await api.listPrivMonUsers({ query: {} })).body;
    expect(users.length).toBe(n);
    return users;
  };

  async function getLastProcessedMarker(indexPattern: string) {
    const res = await api.listEntitySources({ query: {} });
    const integration = res.body.find(
      (i: any) => i?.type === 'entity_analytics_integration' && i?.indexPattern === indexPattern
    );
    return integration?.integrations?.syncData?.lastUpdateProcessed as string | undefined;
  }

  const setIntegrationUserPrivilege = async ({
    id,
    isPrivileged,
    indexPattern,
  }: {
    id: string;
    isPrivileged: boolean;
    indexPattern: string;
  }) => {
    const rolesParam = isPrivileged ? ['Help Desk Administrator'] : [];
    await es.updateByQuery({
      index: indexPattern,
      refresh: true,
      conflicts: 'proceed',
      query: { ids: { values: [id] } },
      script: {
        lang: 'painless',
        source: `
      if (ctx._source.user == null) ctx._source.user = new HashMap();
      ctx._source.user.is_privileged = params.new_privileged_status;
      ctx._source.user.roles = params.roles;      
    `,
        params: { new_privileged_status: isPrivileged, roles: rolesParam },
      },
    });
  };

  const getIntegrationMonitoringSource = async (
    integrationName: string
  ): Promise<MonitoringEntitySource> => {
    const res = await entityAnalyticsApi.listEntitySources({
      query: {},
    });

    const sources = res.body as ListEntitySourcesResponse;
    const source = sources.find((s) => s.integrationName === integrationName);
    if (!source) {
      throw new Error(`No monitoring source found for integration ${integrationName}`);
    }
    return source;
  };

  const updateIntegrationsUsersWithRelativeTimestamps = async ({
    indexPattern,
    relativeTimeStamp,
  }: {
    indexPattern: string;
    relativeTimeStamp?: string;
  }) => {
    if (!relativeTimeStamp) {
      // Default to 3.5 weeks ago (within 1M range, e.g. onboarding)
      relativeTimeStamp = DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP;
    }
    await es.updateByQuery({
      index: indexPattern,
      refresh: true,
      conflicts: 'proceed',
      query: { match_all: {} },
      script: {
        lang: 'painless',
        source: "ctx._source['@timestamp'] = params.newTimestamp",
        params: { newTimestamp: relativeTimeStamp },
      },
    });
  };

  const updateIntegrationsUserTimeStamp = async ({
    id,
    timestamp,
    indexPattern,
  }: {
    id: string;
    timestamp: string;
    indexPattern: string;
  }) => {
    await es.updateByQuery({
      index: indexPattern,
      refresh: true,
      conflicts: 'proceed',
      query: { ids: { values: [id] } },
      script: {
        lang: 'painless',
        source: "ctx._source['@timestamp'] = params.newTimestamp",
        params: { newTimestamp: timestamp },
      },
    });
  };

  const dateOffsetFromNow = async ({ days, months }: { days?: number; months?: number }) => {
    const d = new Date();
    if (months) {
      d.setMonth(d.getMonth() - months);
    }
    if (days) {
      d.setDate(d.getDate() - days);
    }
    return d.toISOString();
  };

  const integrationsSync = {
    setTimestamp,
    getLastProcessedMarker,
    setIntegrationUserPrivilege,
    updateIntegrationsUsersWithRelativeTimestamps,
    updateIntegrationsUserTimeStamp,
    DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP,
    dateOffsetFromNow,
    expectUserCount,
  };

  return {
    runSync,
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
    getIntegrationMonitoringSource,
    integrationsSync,
  };
};
