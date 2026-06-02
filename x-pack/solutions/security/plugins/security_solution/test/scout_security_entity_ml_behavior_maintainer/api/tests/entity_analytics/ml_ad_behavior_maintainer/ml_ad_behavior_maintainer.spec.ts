/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { getEntitiesAlias, ENTITY_LATEST, ENTITY_STORE_ROUTES } from '@kbn/entity-store/common';
import type { AnomalySummaryEntry } from '../../../../../../common/api/entity_analytics/behavioral_summary';
import type { EnrichedAnomalyRecord } from '../../../../../../server/lib/entity_analytics/maintainers/behaviors/ml_anomaly_detection/types';
import { ML_AD_MAINTAINER_ID } from '../../../../../../server/lib/entity_analytics/maintainers/behaviors/ml_anomaly_detection/constants';
import { BEHAVIOR_DETAILS_INTERNAL_URL } from '../../../../../../common/entity_analytics/behaviors/constants';
import {
  CAROL_EUID,
  DAVID_EUID,
  WIN_APP01_EUID,
  NO_BEHAVIORS_EUID,
  entityTestData,
  sourceTestData,
  anomalyTestData,
  ANOMALY_RECORD_IDS,
  SOURCE_EVENT_IDS,
} from '../../../fixtures/ml_ad_behavior_maintainer_test_data';

const hashEuid = (id: string): string => createHash('sha256').update(id).digest('hex');

const ML_AD_DETAILS_INDEX = '.entity_analytics.ml-ad-jobs-latest-default';
const ML_ANOMALIES_SHARED_INDEX = '.ml-anomalies-shared';
const SOURCE_EVENTS_INDEX = 'logs-windows.forwarded-default';
const ENTITY_STORE_UNINSTALL_URL = '/api/security/entity_store/uninstall';
const ENTITY_MAINTAINERS_RUN_URL = `/internal/security/entity_store/entity_maintainers/run/${ML_AD_MAINTAINER_ID}`;

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'Kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

apiTest.describe(
  'ML Anomaly Detection Behavior Maintainer',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let defaultHeaders: Record<string, string>;
    let agentPolicyId = '';
    let packagePolicyId = '';

    const LATEST_ALIAS = getEntitiesAlias(ENTITY_LATEST, 'default');

    apiTest.beforeAll(async ({ samlAuth, apiClient, esClient, log }) => {
      apiTest.setTimeout(300_000);
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(installResponse.statusCode).toBe(201);

      // wait for maintainer task to be registered and started
      await expect
        .poll(
          async () => {
            const res = await apiClient.get(
              `${ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET}?ids[]=${ML_AD_MAINTAINER_ID}`,
              { headers: { ...defaultHeaders, 'elastic-api-version': '2' }, responseType: 'json' }
            );
            const maintainer = res.body?.maintainers?.find(
              (m: { id: string }) => m.id === ML_AD_MAINTAINER_ID
            );
            return maintainer?.taskStatus;
          },
          { timeout: 10_000, intervals: [50] }
        )
        .toBe('started');

      // Install PAD integration to create the necessary ML job and anomaly index.
      log.debug(`Setting up agent policy for PAD integration...`);
      const agentPolicyRes = await apiClient.post('/api/fleet/agent_policies?sys_monitoring=true', {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          name: 'Agent policy 1',
          description: '',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics', 'traces'],
          inactivity_timeout: 1209600,
          is_protected: false,
        },
      });
      agentPolicyId = agentPolicyRes.body?.item?.id ?? '';

      log.debug(`Setting up package policy for PAD integration...`);
      const packagePolicyRes = await apiClient.post('/api/fleet/package_policies', {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          policy_ids: [agentPolicyId],
          package: { name: 'pad', version: '2.1.0' },
          name: 'pad-1',
          description: '',
          namespace: '',
          inputs: {},
        },
      });
      packagePolicyId = packagePolicyRes.body?.item?.id ?? '';

      const startMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

      // Create PAD ML jobs
      log.debug(`Setting up PAD ML jobs...`);
      await apiClient
        .post('/internal/ml/modules/setup/pad-ml', {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {
            prefix: '',
            groups: ['security', 'ftr'],
            indexPatternName: 'logs-*',
            useDedicatedIndex: false,
            startDatafeed: true,
            start: startMs,
          },
        })
        .catch(() => {});

      // Create Security: Authentication ML jobs
      log.debug(`Setting up Security: Authentication ML jobs...`);
      await apiClient
        .post('/internal/ml/modules/setup/security_auth', {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {
            prefix: '',
            groups: ['security', 'authentication', 'ftr'],
            indexPatternName: 'logs-*',
            useDedicatedIndex: false,
            startDatafeed: true,
            start: startMs,
          },
        })
        .catch(() => {});

      // Index some entities
      // 1 user entity with 2 anomaly records of different job IDs
      // 1 user entity with 1 anomaly record
      // 1 host entity with 2 anomaly records of the same job ID
      log.debug(`Indexing test entities...`);
      await esClient.bulk({
        operations: entityTestData.flatMap((data) => [
          { index: { _index: LATEST_ALIAS, _id: hashEuid(data.entity.id) } },
          data,
        ]),
        refresh: true,
      });

      // Index source events that determine baseline behavior
      log.debug(`Indexing test source events...`);

      const sourceData = sourceTestData();
      await esClient.bulk({
        operations: sourceData.flatMap((data) => [
          { create: { _index: SOURCE_EVENTS_INDEX } },
          data,
        ]),
        refresh: true,
      });

      // Index anomaly records
      log.debug(`Indexing test anomaly records...`);
      const anomalyData = anomalyTestData();
      await esClient.bulk({
        operations: anomalyData.flatMap(({ _id, ...data }) => [
          { index: { _index: ML_ANOMALIES_SHARED_INDEX, _id } },
          data,
        ]),
        refresh: true,
      });

      // Trigger the maintainer synchronously to process the test data immediately.
      await apiClient.post(`${ENTITY_MAINTAINERS_RUN_URL}?sync=true`, {
        headers: { ...defaultHeaders, 'elastic-api-version': '2' },
        responseType: 'json',
        body: {},
      });
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      // Clean up Fleet policies.
      if (packagePolicyId) {
        await apiClient
          .post('/api/fleet/package_policies/delete', {
            headers: defaultHeaders,
            responseType: 'json',
            body: { packagePolicyIds: [packagePolicyId] },
          })
          .catch(() => {});
      }
      if (agentPolicyId) {
        await apiClient
          .post('/api/fleet/agent_policies/delete', {
            headers: defaultHeaders,
            responseType: 'json',
            body: { agentPolicyId },
          })
          .catch(() => {});
      }
      // Delete ML jobs created with group 'ftr'.
      const jobsRes = await esClient.ml.getJobs({ job_id: '*' }).catch(() => ({ jobs: [] }));
      await Promise.all(
        (jobsRes.jobs ?? [])
          .filter((j) => j.groups?.includes('ftr'))
          .map((j) => esClient.ml.deleteJob({ job_id: j.job_id, force: true }).catch(() => {}))
      );
      // Clean up test data.
      await esClient
        .bulk({
          operations: [
            { delete: { _index: LATEST_ALIAS, _id: hashEuid(CAROL_EUID) } },
            { delete: { _index: LATEST_ALIAS, _id: hashEuid(DAVID_EUID) } },
            { delete: { _index: LATEST_ALIAS, _id: hashEuid(WIN_APP01_EUID) } },
            { delete: { _index: LATEST_ALIAS, _id: hashEuid(NO_BEHAVIORS_EUID) } },
          ],
          refresh: true,
        })
        .catch(() => {});
      await esClient
        .deleteByQuery({
          index: SOURCE_EVENTS_INDEX,
          query: { terms: { 'event.id': SOURCE_EVENT_IDS as unknown as string[] } },
          refresh: true,
        })
        .catch(() => {});
      await esClient
        .deleteByQuery({
          index: ML_ANOMALIES_SHARED_INDEX,
          query: { ids: { values: ANOMALY_RECORD_IDS as unknown as string[] } },
          refresh: true,
        })
        .catch(() => {});
      // Uninstall entity store.
      await apiClient
        .post(ENTITY_STORE_UNINSTALL_URL, {
          headers: { ...defaultHeaders, 'elastic-api-version': '2023-10-31' },
          responseType: 'json',
          body: { entityTypes: ['user', 'host', 'service'] },
        })
        .catch(() => {});
      await esClient.indices
        .delete({ index: ML_ANOMALIES_SHARED_INDEX, ignore_unavailable: true })
        .catch(() => {});
      await esClient.indices
        .delete({ index: ML_AD_DETAILS_INDEX, ignore_unavailable: true })
        .catch(() => {});
    });

    apiTest(
      'entity store documents are updated with anomaly job IDs after maintainer run',
      async ({ esClient }) => {
        const response = await esClient.search({
          index: LATEST_ALIAS,
          query: {
            terms: { 'entity.id': [CAROL_EUID, DAVID_EUID, WIN_APP01_EUID, NO_BEHAVIORS_EUID] },
          },
        });

        const getEntityWithId = (euid: string) =>
          response.hits.hits.find((hit) => hit._id === hashEuid(euid))?._source as
            | Record<string, unknown>
            | undefined;

        const carolEntity = getEntityWithId(CAROL_EUID);
        expect(carolEntity).toBeDefined();
        const carolJobIds = (carolEntity?.entity as Record<string, unknown> | undefined)
          ?.behaviors as Record<string, unknown> | undefined;
        const carolAnomalyJobIds = carolJobIds?.anomaly_job_ids as string[] | undefined;
        expect(Array.isArray(carolAnomalyJobIds)).toBe(true);
        expect(carolAnomalyJobIds?.length).toBe(2);
        expect(carolAnomalyJobIds?.includes('pad_windows_rare_region_name_by_user_ea')).toBe(true);
        expect(carolAnomalyJobIds?.includes('auth_high_count_logon_events_ea')).toBe(true);

        const davidEntity = getEntityWithId(DAVID_EUID);
        expect(davidEntity).toBeDefined();
        const davidJobIds = (davidEntity?.entity as Record<string, unknown> | undefined)
          ?.behaviors as Record<string, unknown> | undefined;
        const davidAnomalyJobIds = davidJobIds?.anomaly_job_ids as string[] | undefined;
        expect(Array.isArray(davidAnomalyJobIds)).toBe(true);
        expect(davidAnomalyJobIds?.length).toBe(1);
        expect(davidAnomalyJobIds?.includes('suspicious_login_activity_ea')).toBe(true);

        const winApp01Entity = getEntityWithId(WIN_APP01_EUID);
        expect(winApp01Entity).toBeDefined();
        const winApp01JobIds = (winApp01Entity?.entity as Record<string, unknown> | undefined)
          ?.behaviors as Record<string, unknown> | undefined;
        const winApp01AnomalyJobIds = winApp01JobIds?.anomaly_job_ids as string[] | undefined;
        expect(Array.isArray(winApp01AnomalyJobIds)).toBe(true);
        expect(winApp01AnomalyJobIds?.length).toBe(1);
        expect(winApp01AnomalyJobIds?.includes('suspicious_login_activity_ea')).toBe(true);

        const noBehaviorsEntity = getEntityWithId(NO_BEHAVIORS_EUID);
        expect(noBehaviorsEntity).toBeDefined();
        const noBehaviorsJobIds = (noBehaviorsEntity?.entity as Record<string, unknown> | undefined)
          ?.behaviors as Record<string, unknown> | undefined;
        expect(noBehaviorsJobIds?.anomaly_job_ids).toBeUndefined();
      }
    );

    apiTest(
      'details index entries are created with anomaly information after maintainer run',
      async ({ esClient }) => {
        await esClient.indices.refresh({ index: ML_AD_DETAILS_INDEX });
        const response = await esClient.search<EnrichedAnomalyRecord>({
          index: ML_AD_DETAILS_INDEX,
          query: {
            terms: {
              'entity.id': [CAROL_EUID, DAVID_EUID, WIN_APP01_EUID, NO_BEHAVIORS_EUID],
            },
          },
        });

        const getDocumentsForEntity = (euid: string) =>
          response.hits.hits
            .filter((hit) => hit?._source?.entity?.id === euid)
            .map((hit) => hit._source as EnrichedAnomalyRecord);

        // carol.davis should have 2 anomaly records (auth_high_count + pad_windows_rare_region)
        const carolDetails = getDocumentsForEntity(CAROL_EUID);
        expect(carolDetails).toHaveLength(2);

        const carolCountAnomaly = carolDetails.find(
          (d) => d.anomaly.job_id === 'auth_high_count_logon_events_ea'
        );
        expect(carolCountAnomaly).toBeDefined();
        // count detector: baseline_values = [typical]
        expect(Array.isArray(carolCountAnomaly?.anomaly.baseline_values)).toBe(true);
        expect(carolCountAnomaly?.anomaly.baseline_values?.length).toBe(1);

        const carolRareAnomaly = carolDetails.find(
          (d) => d.anomaly.job_id === 'pad_windows_rare_region_name_by_user_ea'
        );
        expect(carolRareAnomaly).toBeDefined();
        // rare detector: baseline_values = most common by_field_values from source index
        // Source events for carol.davis include 3 events with source.geo.region_name='New York'
        expect(Array.isArray(carolRareAnomaly?.anomaly.baseline_values)).toBe(true);
        expect(carolRareAnomaly?.anomaly.baseline_values?.length ?? 0).toBeGreaterThanOrEqual(1);
        expect(carolRareAnomaly?.anomaly.baseline_values?.[0]).toBe('New York');
        expect(carolRareAnomaly?.anomaly.anomalous_value_count).toBe(1);

        // david.martinez should have 1 anomaly record
        const davidDetails = getDocumentsForEntity(DAVID_EUID);
        expect(davidDetails).toHaveLength(1);

        const davidAnomaly = davidDetails.find(
          (d) => d.anomaly.job_id === 'suspicious_login_activity_ea'
        );
        expect(davidAnomaly).toBeDefined();
        // count detector: baseline_values = [typical], anomalous_value = actual
        expect(Array.isArray(davidAnomaly?.anomaly.baseline_values)).toBe(true);
        expect(davidAnomaly?.anomaly.baseline_values?.length).toBe(1);
        expect(davidAnomaly?.anomaly.baseline_values?.[0]).toBe(davidAnomaly?.anomaly.typical);
        expect(davidAnomaly?.anomaly.anomalous_value).toBe(davidAnomaly?.anomaly.actual);

        // WIN-APP01 should have 2 anomaly records (both suspicious_login_activity_ea)
        const winApp01Details = getDocumentsForEntity(WIN_APP01_EUID);
        expect(winApp01Details).toHaveLength(2);
        const winApp01Anomalies = winApp01Details.filter(
          (d) => d.anomaly.job_id === 'suspicious_login_activity_ea'
        );
        expect(winApp01Anomalies).toHaveLength(2);
        for (const anomaly of winApp01Anomalies) {
          // count detector: baseline_values = [typical]
          expect(Array.isArray(anomaly.anomaly.baseline_values)).toBe(true);
          expect(anomaly.anomaly.baseline_values?.length).toBe(1);
        }

        // entity with no anomalies should have no details index entries
        const noBehaviorsDetails = getDocumentsForEntity(NO_BEHAVIORS_EUID);
        expect(noBehaviorsDetails).toHaveLength(0);
      }
    );

    apiTest(
      'behavioral summary returns anomalies for an entity with anomaly records',
      async ({ apiClient }) => {
        const url = BEHAVIOR_DETAILS_INTERNAL_URL.replace(
          '{entity_id}',
          encodeURIComponent(CAROL_EUID)
        );
        const response = await apiClient.post(url, {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as { entityId: string; anomalies: AnomalySummaryEntry[] };
        expect(body.entityId).toBe(CAROL_EUID);
        expect(Array.isArray(body.anomalies)).toBe(true);
        expect(body.anomalies).toHaveLength(2);

        const jobIds = body.anomalies.map((a) => a.jobId);
        expect(jobIds).toContain('auth_high_count_logon_events_ea');
        expect(jobIds).toContain('pad_windows_rare_region_name_by_user_ea');

        for (const anomaly of body.anomalies) {
          expect(typeof anomaly.jobId).toBe('string');
          expect(typeof anomaly.detectorFunction).toBe('string');
          expect(typeof anomaly.recordScore).toBe('number');
          expect(typeof anomaly.timestamp).toBe('string');
          expect(Array.isArray(anomaly.actual)).toBe(true);
          expect(Array.isArray(anomaly.typical)).toBe(true);
          expect(Array.isArray(anomaly.baselineValues)).toBe(true);
        }

        // auth_high_count_logon_events_ea is defined in the local security_auth ML module with
        // known custom_settings: security_app_display_name, threat_tactics, threat_techniques
        const countAnomaly = body.anomalies.find(
          (a) => a.jobId === 'auth_high_count_logon_events_ea'
        );
        expect(countAnomaly?.jobName).toBe('Spike in Logon Events');
        expect(countAnomaly?.threatTactics).toStrictEqual(['Credential Access', 'Initial Access']);
        expect(countAnomaly?.threatTechniques).toStrictEqual([
          'Brute Force',
          'Password Spraying',
          'Valid Accounts',
        ]);
      }
    );

    apiTest(
      'behavioral summary returns correct jobName and threat fields for suspicious_login_activity_ea',
      async ({ apiClient }) => {
        const url = BEHAVIOR_DETAILS_INTERNAL_URL.replace(
          '{entity_id}',
          encodeURIComponent(DAVID_EUID)
        );
        const response = await apiClient.post(url, {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as { entityId: string; anomalies: AnomalySummaryEntry[] };
        expect(body.entityId).toBe(DAVID_EUID);
        expect(body.anomalies).toHaveLength(1);

        const anomaly = body.anomalies[0];
        expect(anomaly.jobId).toBe('suspicious_login_activity_ea');
        expect(anomaly.jobName).toBe('Unusual Login Activity');
        expect(anomaly.threatTactics).toStrictEqual(['Credential Access']);
        expect(anomaly.threatTechniques).toStrictEqual(['Brute Force']);
      }
    );

    apiTest(
      'behavioral summary returns empty anomalies for entity with no anomaly records',
      async ({ apiClient }) => {
        const url = BEHAVIOR_DETAILS_INTERNAL_URL.replace(
          '{entity_id}',
          encodeURIComponent(NO_BEHAVIORS_EUID)
        );
        const response = await apiClient.post(url, {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as { entityId: string; anomalies: AnomalySummaryEntry[] };
        expect(body.entityId).toBe(NO_BEHAVIORS_EUID);
        expect(body.anomalies).toHaveLength(0);
      }
    );

    apiTest('behavioral summary filters anomalies by jobIds', async ({ apiClient }) => {
      const url = BEHAVIOR_DETAILS_INTERNAL_URL.replace(
        '{entity_id}',
        encodeURIComponent(CAROL_EUID)
      );
      const response = await apiClient.post(url, {
        headers: { ...defaultHeaders, 'elastic-api-version': '1' },
        responseType: 'json',
        body: { jobIds: ['auth_high_count_logon_events_ea'] },
      });

      expect(response.statusCode).toBe(200);
      const body = response.body as { entityId: string; anomalies: AnomalySummaryEntry[] };
      expect(body.anomalies).toHaveLength(1);
      expect(body.anomalies[0].jobId).toBe('auth_high_count_logon_events_ea');
    });

    apiTest('behavioral summary respects pageSize and page', async ({ apiClient }) => {
      const url = BEHAVIOR_DETAILS_INTERNAL_URL.replace(
        '{entity_id}',
        encodeURIComponent(CAROL_EUID)
      );

      const page1Response = await apiClient.post(url, {
        headers: { ...defaultHeaders, 'elastic-api-version': '1' },
        responseType: 'json',
        body: { pageSize: 1, page: 1 },
      });
      expect(page1Response.statusCode).toBe(200);
      const page1Body = page1Response.body as { anomalies: AnomalySummaryEntry[] };
      expect(page1Body.anomalies).toHaveLength(1);

      const page2Response = await apiClient.post(url, {
        headers: { ...defaultHeaders, 'elastic-api-version': '1' },
        responseType: 'json',
        body: { pageSize: 1, page: 2 },
      });
      expect(page2Response.statusCode).toBe(200);
      const page2Body = page2Response.body as { anomalies: AnomalySummaryEntry[] };
      expect(page2Body.anomalies).toHaveLength(1);

      expect(page1Body.anomalies[0].jobId).not.toBe(page2Body.anomalies[0].jobId);
    });

    apiTest(
      'behavioral summary sorts anomalies by record_score descending',
      async ({ apiClient }) => {
        const url = BEHAVIOR_DETAILS_INTERNAL_URL.replace(
          '{entity_id}',
          encodeURIComponent(WIN_APP01_EUID)
        );
        const response = await apiClient.post(url, {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { sort: [{ field: 'record_score', order: 'desc' }] },
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as { anomalies: AnomalySummaryEntry[] };
        expect(body.anomalies).toHaveLength(2);
        expect(body.anomalies[0].recordScore).toBeGreaterThanOrEqual(body.anomalies[1].recordScore);
      }
    );
  }
);
