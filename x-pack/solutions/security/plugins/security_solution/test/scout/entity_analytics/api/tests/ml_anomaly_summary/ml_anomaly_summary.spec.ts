/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/common';
import type {
  AnomalyOverviewResponse,
  AnomalySummaryResponse,
} from '../../../../../../common/api/entity_analytics/anomaly_summary';
import {
  ENTITY_ANOMALY_OVERVIEW_INTERNAL_URL,
  ENTITY_ANOMALY_PRIVILEGES_INTERNAL_URL,
  ENTITY_ANOMALY_SUMMARY_INTERNAL_URL,
} from '../../../../../../common/entity_analytics/anomalies/constants';
import {
  CAROL_EUID,
  DAVID_EUID,
  WIN_APP01_EUID,
  NO_BEHAVIORS_EUID,
  OR_SEMANTICS_HOST_EUID,
  sourceTestData,
  anomalyTestData,
  entityTestData,
  ANOMALY_RECORD_IDS,
  SOURCE_EVENT_IDS,
} from '../../fixtures/ml_anomaly_summary_test_data';

const ML_ANOMALIES_SHARED_INDEX = '.ml-anomalies-shared';
const ENTITY_STORE_LATEST_ALIAS = 'entities-latest-default';
const UNKNOWN_ENTITY_EUID = 'user:does-not-exist@a1b2c3d4e5f6789012345678901234ab@local';
const SOURCE_EVENTS_INDEX = 'logs-windows.forwarded-default';
const SOURCE_EVENTS_INDEX_TEMPLATE = 'scout-ml-anomaly-summary-source-events';
const CAROL_USER_NAME = 'carol.davis';
const EXPECTED_CAROL_NY_BASELINE_COUNT = 3;
const KEYWORD_SOURCE_EVENT_FIELDS = [
  ['source', 'geo', 'region_name'],
  ['user', 'name'],
  ['host', 'os', 'type'],
  ['event', 'id'],
  ['event', 'code'],
] as const;

interface BulkOpResult {
  error?: { type?: string; reason?: string };
  _id?: string;
  status?: number;
}

interface BulkResponseLike {
  errors?: boolean;
  items?: Array<{
    create?: BulkOpResult;
    index?: BulkOpResult;
    update?: BulkOpResult;
    delete?: BulkOpResult;
  }>;
}

const formatBulkFailures = (response: BulkResponseLike): string[] =>
  (response.items ?? []).flatMap((item) => {
    const op = item.create ?? item.index ?? item.update ?? item.delete;
    if (!op?.error) {
      return [];
    }
    return [`${op._id ?? 'unknown id'}: ${op.error.type ?? 'error'}: ${op.error.reason ?? ''}`];
  });

const assertBulkIndexed = (
  response: BulkResponseLike,
  label: string,
  expectedCount: number,
  log: { info: (msg: string) => void }
): void => {
  const items = response.items ?? [];
  if (response.errors) {
    throw new Error(`${label} bulk had errors:\n${formatBulkFailures(response).join('\n')}`);
  }
  if (items.length !== expectedCount) {
    throw new Error(`${label} bulk returned ${items.length} items, expected ${expectedCount}`);
  }
  log.info(`${label}: bulk indexed ${items.length} docs with no errors`);
};

const getHitCount = (total: number | { value?: number } | undefined, hitLength: number): number => {
  if (typeof total === 'number') {
    return total;
  }
  return total?.value ?? hitLength;
};

interface SourceEventHit {
  event?: { id?: string; code?: string };
  user?: { name?: string };
  host?: { os?: { type?: string } };
  source?: { geo?: { region_name?: string } };
}

const getNestedMapping = (mappings: unknown, path: readonly string[]): unknown => {
  let current = mappings;
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    const obj = current as { properties?: Record<string, unknown> };
    current = obj.properties?.[segment] ?? (current as Record<string, unknown>)[segment];
  }
  return current;
};

const getMappingType = (mapping: unknown): string | undefined => {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    return undefined;
  }
  const type = (mapping as { type?: unknown }).type;
  return typeof type === 'string' ? type : undefined;
};

const sourceEventsMappingsAreAggregatable = (mappings: unknown): boolean =>
  KEYWORD_SOURCE_EVENT_FIELDS.every(
    (path) => getMappingType(getNestedMapping(mappings, path)) === 'keyword'
  );

const SOURCE_EVENTS_INDEX_MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' as const },
    event: {
      properties: {
        id: { type: 'keyword' as const },
        code: { type: 'keyword' as const },
      },
    },
    user: { properties: { name: { type: 'keyword' as const } } },
    host: {
      properties: {
        os: { properties: { type: { type: 'keyword' as const } } },
      },
    },
    source: {
      properties: {
        geo: {
          properties: {
            region_name: { type: 'keyword' as const },
            city_name: { type: 'keyword' as const },
            country_name: { type: 'keyword' as const },
          },
        },
      },
    },
  },
};

const ensureSourceEventsIndexIsAggregatable = async (
  esClient: {
    indices: {
      putIndexTemplate: (req: Record<string, unknown>) => Promise<unknown>;
      exists: (req: { index: string }) => Promise<boolean>;
      getMapping: (req: { index: string }) => Promise<Record<string, { mappings?: unknown }>>;
      deleteDataStream: (req: { name: string }, opts?: { ignore?: number[] }) => Promise<unknown>;
      delete: (req: { index: string; ignore_unavailable?: boolean }) => Promise<unknown>;
    };
  },
  log: { info: (msg: string) => void }
): Promise<void> => {
  // Fleet logs-* templates on serverless often dynamically map strings as
  // match_only_text. A more specific, higher-priority template wins for this
  // index so the rare detector's terms agg on source.geo.region_name works.
  await esClient.indices.putIndexTemplate({
    name: SOURCE_EVENTS_INDEX_TEMPLATE,
    index_patterns: [SOURCE_EVENTS_INDEX],
    priority: 1000,
    data_stream: {},
    template: { mappings: SOURCE_EVENTS_INDEX_MAPPINGS },
  });
  log.info(`Put index template ${SOURCE_EVENTS_INDEX_TEMPLATE} for ${SOURCE_EVENTS_INDEX}`);

  const exists = await esClient.indices.exists({ index: SOURCE_EVENTS_INDEX });
  if (!exists) {
    return;
  }

  const mappingResp = await esClient.indices.getMapping({ index: SOURCE_EVENTS_INDEX });
  const firstMapping = Object.values(mappingResp)[0]?.mappings;
  if (sourceEventsMappingsAreAggregatable(firstMapping)) {
    log.info(`${SOURCE_EVENTS_INDEX} already has keyword mappings for rare-baseline fields`);
    return;
  }

  log.info(
    `${SOURCE_EVENTS_INDEX} mapping is not aggregatable (${JSON.stringify(
      getNestedMapping(firstMapping, ['source', 'geo', 'region_name'])
    )}); deleting so the template can recreate it`
  );
  try {
    await esClient.indices.deleteDataStream({ name: SOURCE_EVENTS_INDEX }, { ignore: [404] });
  } catch {
    await esClient.indices.delete({ index: SOURCE_EVENTS_INDEX, ignore_unavailable: true });
  }
};

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'Kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

const buildUrl = (entityEuid: string, entityType: 'user' | 'host'): string =>
  ENTITY_ANOMALY_SUMMARY_INTERNAL_URL.replace('{entity_type}', entityType).replace(
    '{entity_id}',
    encodeURIComponent(entityEuid)
  );

const buildOverviewUrl = (entityEuid: string, entityType: 'user' | 'host'): string =>
  ENTITY_ANOMALY_OVERVIEW_INTERNAL_URL.replace('{entity_type}', entityType).replace(
    '{entity_id}',
    encodeURIComponent(entityEuid)
  );

apiTest.describe(
  'Entity ML Anomaly Detection APIs',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let defaultHeaders: Record<string, string>;
    let noMlPrivsHeaders: Record<string, string>;
    let noEntityStorePrivsHeaders: Record<string, string>;
    let agentPolicyId = '';
    let packagePolicyId = '';

    apiTest.beforeAll(async ({ samlAuth, apiClient, esClient, log }) => {
      apiTest.setTimeout(300_000);
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      const noMlPrivsCredentials = await samlAuth.asInteractiveUser({
        elasticsearch: {
          cluster: [],
          indices: [{ names: [ENTITY_STORE_LATEST_ALIAS], privileges: ['read'] }],
        },
        kibana: [{ base: [], feature: { siem: ['all'] }, spaces: ['*'] }],
      });
      noMlPrivsHeaders = { ...noMlPrivsCredentials.cookieHeader, ...INTERNAL_HEADERS };

      const noEntityStorePrivsCredentials = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { siem: ['all'] }, spaces: ['*'] }],
      });
      noEntityStorePrivsHeaders = {
        ...noEntityStorePrivsCredentials.cookieHeader,
        ...INTERNAL_HEADERS,
      };

      log.debug(`Installing entity store...`);
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: { ...defaultHeaders, 'elastic-api-version': '2023-10-31' },
        responseType: 'json',
        body: {},
      });

      // Put a keyword template before PAD/Fleet can create logs-* with
      // match_only_text. ES cannot change an existing field to keyword, so if
      // the stream already exists with a non-aggregatable mapping, delete it
      // so bulk recreate uses this template.
      await ensureSourceEventsIndexIsAggregatable(esClient, log);

      const startMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

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
          package: { name: 'pad', version: '2.1.1' },
          name: 'pad-1',
          description: '',
          namespace: '',
          inputs: {},
        },
      });
      packagePolicyId = packagePolicyRes.body?.item?.id ?? '';

      // The pad-ml module registers asynchronously after the PAD integration install, so retry
      // until it is recognized instead of firing a setup that fails silently before it exists.
      const setupMlModuleWithRetry = async (
        module: string,
        body: Record<string, unknown>
      ): Promise<void> => {
        const maxAttempts = 10;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const response = await apiClient.post(`/internal/ml/modules/setup/${module}`, {
            headers: { ...defaultHeaders, 'elastic-api-version': '1' },
            responseType: 'json',
            body,
          });
          const jobs: Array<{ success?: boolean; error?: { status?: number } }> =
            response.body?.jobs ?? [];
          const succeeded =
            response.statusCode === 200 &&
            jobs.length > 0 &&
            jobs.every((job) => job.success || (job.error?.status ?? 500) < 500);
          if (succeeded) {
            return;
          }
          if (attempt < maxAttempts) {
            await setTimeoutAsync(3000);
          }
        }
        throw new Error(`Failed to set up ML module "${module}" after ${maxAttempts} attempts`);
      };

      // Create PAD ML jobs
      log.debug(`Setting up PAD ML jobs...`);
      await setupMlModuleWithRetry('pad-ml', {
        prefix: '',
        groups: ['security', 'ftr'],
        indexPatternName: 'logs-*',
        useDedicatedIndex: false,
        startDatafeed: true,
        start: startMs,
      });

      // Create Security: Authentication ML jobs
      log.debug(`Setting up Security: Authentication ML jobs...`);
      await setupMlModuleWithRetry('security_auth', {
        prefix: '',
        groups: ['security', 'authentication', 'ftr'],
        indexPatternName: 'logs-*',
        useDedicatedIndex: false,
        startDatafeed: true,
        start: startMs,
      });

      // Index source events that determine baseline behavior for the rare detector.
      log.debug(`Indexing test source events...`);
      const sourceData = sourceTestData();
      const sourceBulk = await esClient.bulk({
        operations: sourceData.flatMap((data) => [
          { create: { _index: SOURCE_EVENTS_INDEX } },
          data,
        ]),
        refresh: true,
      });
      assertBulkIndexed(sourceBulk, 'Source events', sourceData.length, log);

      const sourceSearch = await esClient.search<SourceEventHit>({
        index: SOURCE_EVENTS_INDEX,
        ignore_unavailable: true,
        size: SOURCE_EVENT_IDS.length,
        query: { terms: { 'event.id': [...SOURCE_EVENT_IDS] } },
        _source: [
          'event.id',
          'event.code',
          'user.name',
          'host.os.type',
          'source.geo.region_name',
          '@timestamp',
        ],
      });
      const sourceHits = sourceSearch.hits.hits;
      const sourceCount = getHitCount(sourceSearch.hits.total, sourceHits.length);
      log.info(
        `Source events searchable in ${SOURCE_EVENTS_INDEX}: ${sourceCount}/${SOURCE_EVENT_IDS.length}`
      );
      for (const hit of sourceHits) {
        log.info(
          `  source hit _index=${hit._index} ${JSON.stringify({
            eventId: hit._source?.event?.id,
            user: hit._source?.user?.name,
            region: hit._source?.source?.geo?.region_name,
            osType: hit._source?.host?.os?.type,
            eventCode: hit._source?.event?.code,
          })}`
        );
      }

      const carolNyHits = sourceHits.filter(
        (hit) =>
          hit._source?.user?.name === CAROL_USER_NAME &&
          hit._source?.source?.geo?.region_name === 'New York'
      );
      log.info(`Carol New York baseline events found: ${carolNyHits.length}`);

      const mappingResp = await esClient.indices.getMapping({
        index: SOURCE_EVENTS_INDEX,
      });
      const firstMapping = Object.values(mappingResp)[0]?.mappings;
      const regionMapping = getNestedMapping(firstMapping, ['source', 'geo', 'region_name']);
      log.info(`source.geo.region_name mapping: ${JSON.stringify(regionMapping)}`);
      if (getMappingType(regionMapping) !== 'keyword') {
        throw new Error(
          `source.geo.region_name must be keyword for rare baseline aggregation, got ${JSON.stringify(
            regionMapping
          )}`
        );
      }

      const regionAgg = await esClient.search({
        index: SOURCE_EVENTS_INDEX,
        ignore_unavailable: true,
        size: 0,
        query: { term: { 'user.name': CAROL_USER_NAME } },
        aggs: {
          regions: { terms: { field: 'source.geo.region_name', size: 10 } },
        },
      });
      const buckets = (
        regionAgg.aggregations as
          | { regions?: { buckets?: Array<{ key: string; doc_count: number }> } }
          | undefined
      )?.regions?.buckets;
      log.info(`Carol region terms agg: ${JSON.stringify(buckets)}`);
      const newYorkBucket = buckets?.find((bucket) => bucket.key === 'New York');
      if (!newYorkBucket || newYorkBucket.doc_count < EXPECTED_CAROL_NY_BASELINE_COUNT) {
        throw new Error(
          `Expected a source.geo.region_name terms bucket for New York with at least ${EXPECTED_CAROL_NY_BASELINE_COUNT} docs, got ${JSON.stringify(
            buckets
          )}`
        );
      }

      if (sourceCount !== SOURCE_EVENT_IDS.length) {
        throw new Error(
          `Expected ${SOURCE_EVENT_IDS.length} searchable source events in ${SOURCE_EVENTS_INDEX}, found ${sourceCount}`
        );
      }
      if (carolNyHits.length < EXPECTED_CAROL_NY_BASELINE_COUNT) {
        throw new Error(
          `Expected at least ${EXPECTED_CAROL_NY_BASELINE_COUNT} Carol New York source events, found ${carolNyHits.length}`
        );
      }

      // Index anomaly records for the test entities.
      log.debug(`Indexing test anomaly records...`);
      const anomalyData = anomalyTestData();
      const anomalyBulk = await esClient.bulk({
        operations: anomalyData.flatMap(({ _id, ...data }) => [
          { index: { _index: ML_ANOMALIES_SHARED_INDEX, _id } },
          data,
        ]),
        refresh: true,
      });
      assertBulkIndexed(anomalyBulk, 'Anomaly records', anomalyData.length, log);

      // Index the entity store documents backing the anomaly test entities.
      // The anomaly overview/summary routes 404 when the entity isn't present
      // in the entity store's latest index, independent of ML data.
      log.debug(`Indexing test entity store documents...`);
      const entityBulk = await esClient.bulk({
        operations: entityTestData.flatMap((data) => [
          { index: { _index: ENTITY_STORE_LATEST_ALIAS } },
          data,
        ]),
        refresh: true,
      });
      assertBulkIndexed(entityBulk, 'Entity store documents', entityTestData.length, log);
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
      // Clean up test source events and anomaly records.
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
      await esClient.indices
        .delete({ index: ML_ANOMALIES_SHARED_INDEX, ignore_unavailable: true })
        .catch(() => {});
      await esClient.indices
        .deleteIndexTemplate({ name: SOURCE_EVENTS_INDEX_TEMPLATE })
        .catch(() => {});
      // Uninstall the entity store
      await apiClient
        .post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
          headers: { ...defaultHeaders, 'elastic-api-version': '2023-10-31' },
          responseType: 'json',
          body: {},
        })
        .catch(() => {});
    });

    apiTest(
      'Anomaly summary API: returns anomalies for an entity with anomaly records',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.entity_id).toBe(CAROL_EUID);
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
      'Anomaly summary API: returns correct jobName and threat fields for suspicious_login_activity_ea',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(DAVID_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.entity_id).toBe(DAVID_EUID);
        expect(body.anomalies).toHaveLength(1);

        const anomaly = body.anomalies[0];
        expect(anomaly.jobId).toBe('suspicious_login_activity_ea');
        expect(anomaly.jobName).toBe('Unusual Login Activity');
        expect(anomaly.threatTactics).toStrictEqual(['Credential Access']);
        expect(anomaly.threatTechniques).toStrictEqual(['Brute Force']);
      }
    );

    apiTest(
      'Anomaly summary API: returns empty anomalies for entity with no anomaly records',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(NO_BEHAVIORS_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.entity_id).toBe(NO_BEHAVIORS_EUID);
        expect(body.anomalies).toHaveLength(0);
      }
    );

    apiTest(
      'Anomaly summary API: returns 400 when from is older than 1 year',
      async ({ apiClient }) => {
        const twoYearsAgoMs = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { from: twoYearsAgoMs },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('`from` must not be older than 1 year');
      }
    );

    apiTest(
      'Anomaly summary API: returns 200 when from is within 1 year',
      async ({ apiClient }) => {
        const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const response = await apiClient.post(buildUrl(NO_BEHAVIORS_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { from: thirtyDaysAgoMs },
        });

        expect(response.statusCode).toBe(200);
      }
    );

    apiTest('Anomaly summary API: filters anomalies by jobIds', async ({ apiClient }) => {
      const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
        headers: { ...defaultHeaders, 'elastic-api-version': '1' },
        responseType: 'json',
        body: { job_ids: ['auth_high_count_logon_events_ea'] },
      });

      expect(response.statusCode).toBe(200);
      const body = response.body as AnomalySummaryResponse;
      expect(body.anomalies).toHaveLength(1);
      expect(body.anomalies[0].jobId).toBe('auth_high_count_logon_events_ea');
    });

    apiTest('Anomaly summary API: respects pageSize and page', async ({ apiClient }) => {
      const page1Response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
        headers: { ...defaultHeaders, 'elastic-api-version': '1' },
        responseType: 'json',
        body: { page_size: 1, page: 1 },
      });
      expect(page1Response.statusCode).toBe(200);
      const page1Body = page1Response.body as AnomalySummaryResponse;
      expect(page1Body.anomalies).toHaveLength(1);
      expect(page1Body.total).toBe(2);
      expect(page1Body.page).toBe(1);
      expect(page1Body.page_size).toBe(1);

      const page2Response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
        headers: { ...defaultHeaders, 'elastic-api-version': '1' },
        responseType: 'json',
        body: { page_size: 1, page: 2 },
      });
      expect(page2Response.statusCode).toBe(200);
      const page2Body = page2Response.body as AnomalySummaryResponse;
      expect(page2Body.anomalies).toHaveLength(1);
      expect(page2Body.total).toBe(2);
      expect(page2Body.page).toBe(2);
      expect(page2Body.page_size).toBe(1);

      expect(page1Body.anomalies[0].jobId).not.toBe(page2Body.anomalies[0].jobId);
    });

    apiTest(
      'Anomaly summary API: sorts anomalies by record_score descending',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(WIN_APP01_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { sort: [{ field: 'record_score', order: 'desc' }] },
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.anomalies).toHaveLength(2);
        expect(body.anomalies[0].recordScore).toBeGreaterThanOrEqual(body.anomalies[1].recordScore);
      }
    );

    apiTest(
      'Anomaly summary API: enriches anomalies with baseline values from source index',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;

        const rareAnomaly = body.anomalies.find(
          (a) => a.jobId === 'pad_windows_rare_region_name_by_user_ea'
        );
        expect(rareAnomaly).toBeDefined();
        // rare detector: baseline_values = most common by_field_values from source index
        // Source events for carol.davis include 3 events with source.geo.region_name='New York'
        expect(Array.isArray(rareAnomaly?.baselineValues)).toBe(true);
        expect(rareAnomaly?.baselineValues?.length ?? 0).toBeGreaterThanOrEqual(1);
        expect(rareAnomaly?.baselineValues?.[0]).toBe('New York');
        expect(rareAnomaly?.anomalousValueCount).toBe(1);

        const countAnomaly = body.anomalies.find(
          (a) => a.jobId === 'auth_high_count_logon_events_ea'
        );
        expect(countAnomaly).toBeDefined();
        // count detector: baseline_values = [typical]
        expect(Array.isArray(countAnomaly?.baselineValues)).toBe(true);
        expect(countAnomaly?.baselineValues?.length).toBe(1);
      }
    );

    apiTest(
      'Anomaly summary API: score_ranges filters out anomalies below the threshold',
      async ({ apiClient }) => {
        // WIN_APP01 has two anomalies: scores 5.65 and 31.06. min_score=10 should exclude 5.65.
        const response = await apiClient.post(buildUrl(WIN_APP01_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 10 }] },
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.anomalies).toHaveLength(1);
        expect(body.anomalies[0].recordScore).toBeGreaterThanOrEqual(10);
      }
    );

    apiTest(
      'Anomaly summary API: score_ranges filters out anomalies above the threshold',
      async ({ apiClient }) => {
        // WIN_APP01 has two anomalies: scores 5.65 and 31.06. max_score=10 should exclude 31.06.
        const response = await apiClient.post(buildUrl(WIN_APP01_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 0, max_score: 10 }] },
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.anomalies).toHaveLength(1);
        expect(body.anomalies[0].recordScore).toBeLessThanOrEqual(10);
      }
    );

    apiTest(
      'Anomaly summary API: a single score_ranges entry with both bounds narrows results to that range',
      async ({ apiClient }) => {
        // Carol has scores 24.37 and 25.44. Range [24, 25] includes only 24.37.
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 24, max_score: 25 }] },
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.anomalies).toHaveLength(1);
        expect(body.anomalies[0].jobId).toBe('auth_high_count_logon_events_ea');
        expect(body.anomalies[0].recordScore).toBeGreaterThanOrEqual(24);
        expect(body.anomalies[0].recordScore).toBeLessThanOrEqual(25);
      }
    );

    apiTest(
      'Anomaly summary API: multiple score_ranges are combined with OR semantics, not collapsed into one span',
      async ({ apiClient }) => {
        // The OR-semantics host has three anomalies: scores 5 (low), 50 (gap), and 90 (high).
        // [0,10) and [75,∞) each match one of the outer scores.
        const response = await apiClient.post(buildUrl(OR_SEMANTICS_HOST_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 0, max_score: 10 }, { min_score: 75 }] },
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.anomalies).toHaveLength(2);
        const scores = body.anomalies.map((a) => a.recordScore).sort((a, b) => a - b);
        expect(scores).toStrictEqual([5, 90]);
      }
    );

    apiTest(
      'Anomaly summary API: score_ranges that exclude all anomalies returns empty results',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 50 }] },
        });

        expect(response.statusCode).toBe(200);
        const body = response.body as AnomalySummaryResponse;
        expect(body.anomalies).toHaveLength(0);
        expect(body.total).toBe(0);
      }
    );

    apiTest(
      'Anomaly summary API: returns 400 when a score_ranges min_score is negative',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: -1 }] },
        });

        expect(response.statusCode).toBe(400);
      }
    );

    apiTest(
      'Anomaly summary API: returns 400 when a score_ranges max_score exceeds 100',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 0, max_score: 101 }] },
        });

        expect(response.statusCode).toBe(400);
      }
    );

    apiTest(
      'Anomaly summary API: returns 400 when a score_ranges min_score is greater than its max_score',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 50, max_score: 25 }] },
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(
          "each `score_ranges` entry's `min_score` must not be greater than its `max_score`"
        );
      }
    );

    apiTest(
      'Anomaly overview API: returns expected response for entity with anomaly records',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;

        // Response shape
        expect(body.entityId).toBe(CAROL_EUID);
        expect(body.entityType).toBe('user');
        expect(Array.isArray(body.anomalyByTimeBucket)).toBe(true);
        expect(typeof body.from).toBe('number');
        expect(typeof body.to).toBe('number');
        expect(body.to).toBeGreaterThan(body.from);

        // Carol has 2 indexed anomaly records: pad_windows_rare_region_name_by_user_ea and auth_high_count_logon_events_ea
        expect(body.totalAnomaliesCount).toBe(2);

        // Per-bucket entry shape
        expect(body.anomalyByTimeBucket.length).toBeGreaterThanOrEqual(1);
        for (const entry of body.anomalyByTimeBucket) {
          expect(typeof entry.timestamp).toBe('string');
          expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
          expect(typeof entry.maxScore).toBe('number');
          expect(entry.maxScore).toBeGreaterThan(0);
          expect(Array.isArray(entry.threatTactics)).toBe(true);
          expect(typeof entry.tacticCounts).toBe('object');
          for (const c of Object.values(entry.tacticCounts ?? {})) {
            expect(c).toBeGreaterThan(0);
          }
        }

        // auth_high_count_logon_events_ea contributes 'Credential Access' and 'Initial Access'
        expect(Object.keys(body.tacticCounts)).toContain('Credential Access');
        expect(Object.keys(body.tacticCounts)).toContain('Initial Access');
        for (const count of Object.values(body.tacticCounts)) {
          expect(count).toBeGreaterThan(0);
        }
      }
    );

    apiTest(
      'Anomaly overview API: maxScore in each bucket is the highest record_score within that bucket',
      async ({ apiClient }) => {
        // WIN_APP01 has 2 suspicious_login_activity_ea records with scores 5.65 and 31.06.
        // Both have the same timestamp so they land in the same bucket; max should be ~31.06.
        const response = await apiClient.post(buildOverviewUrl(WIN_APP01_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;
        expect(body.anomalyByTimeBucket.length).toBeGreaterThanOrEqual(1);
        const highestBucketMax = Math.max(...body.anomalyByTimeBucket.map((a) => a.maxScore));
        expect(highestBucketMax).toBeGreaterThanOrEqual(31);
        // Both records share the same timestamp so they land in one bucket; tacticCounts reflects both.
        const bucket = body.anomalyByTimeBucket[0];
        expect(bucket.tacticCounts?.['Credential Access']).toBe(2);
      }
    );

    apiTest(
      'Anomaly overview API: returns empty anomalies for entity with no anomaly records',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(NO_BEHAVIORS_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;
        expect(body.entityId).toBe(NO_BEHAVIORS_EUID);
        expect(body.anomalyByTimeBucket).toHaveLength(0);
        expect(body.totalAnomaliesCount).toBe(0);
        expect(body.tacticCounts).toStrictEqual({});
      }
    );

    apiTest(
      'Anomaly overview API: returns 400 when from is older than 1 year',
      async ({ apiClient }) => {
        const twoYearsAgoMs = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
        const response = await apiClient.post(buildOverviewUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { from: twoYearsAgoMs },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.message).toContain('`from` must not be older than 1 year');
      }
    );

    apiTest(
      'Anomaly overview API: returns 200 when from is within 1 year',
      async ({ apiClient }) => {
        const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const response = await apiClient.post(buildOverviewUrl(NO_BEHAVIORS_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { from: thirtyDaysAgoMs },
        });

        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'Anomaly overview API: echoes explicit from and to in response',
      async ({ apiClient }) => {
        const fromMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const toMs = Date.now();
        const response = await apiClient.post(buildOverviewUrl(NO_BEHAVIORS_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { from: fromMs, to: toMs },
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;
        expect(body.from).toBe(fromMs);
        expect(body.to).toBe(toMs);
      }
    );

    apiTest(
      'Anomaly overview API: threat_tactics filter restricts anomalies to jobs with matching tactics',
      async ({ apiClient }) => {
        // WIN_APP01 has 2 anomalies, both from suspicious_login_activity_ea which only has
        // ['Credential Access']. Filtering by 'Initial Access' excludes that job, so no
        // anomalies are returned for this entity.
        const response = await apiClient.post(buildOverviewUrl(WIN_APP01_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { threat_tactics: ['Initial Access'] },
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;
        expect(body.anomalyByTimeBucket).toHaveLength(0);
        expect(body.totalAnomaliesCount).toBe(0);
      }
    );

    apiTest(
      'Anomaly overview API: score_ranges reduces totalAnomaliesCount to matching records',
      async ({ apiClient }) => {
        // WIN_APP01 has two anomalies: scores 5.65 and 31.06. min_score=10 excludes 5.65.
        const response = await apiClient.post(buildOverviewUrl(WIN_APP01_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 10 }] },
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;
        expect(body.totalAnomaliesCount).toBe(1);
        expect(body.anomalyByTimeBucket.length).toBeGreaterThanOrEqual(1);
        for (const entry of body.anomalyByTimeBucket) {
          expect(entry.maxScore).toBeGreaterThanOrEqual(10);
        }
      }
    );

    apiTest(
      'Anomaly overview API: score_ranges upper bound reduces totalAnomaliesCount to matching records',
      async ({ apiClient }) => {
        // WIN_APP01 has two anomalies: scores 5.65 and 31.06. max_score=10 excludes 31.06.
        const response = await apiClient.post(buildOverviewUrl(WIN_APP01_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 0, max_score: 10 }] },
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;
        expect(body.totalAnomaliesCount).toBe(1);
        expect(body.anomalyByTimeBucket.length).toBeGreaterThanOrEqual(1);
        for (const entry of body.anomalyByTimeBucket) {
          expect(entry.maxScore).toBeLessThanOrEqual(10);
        }
      }
    );

    apiTest(
      'Anomaly overview API: multiple score_ranges are combined with OR semantics, not collapsed into one span',
      async ({ apiClient }) => {
        // The OR-semantics host has three anomalies: scores 5 (low), 50 (gap), and 90 (high).
        // [0,10) and [75,∞) each match one of the outer scores.
        const response = await apiClient.post(buildOverviewUrl(OR_SEMANTICS_HOST_EUID, 'host'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 0, max_score: 10 }, { min_score: 75 }] },
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;
        expect(body.totalAnomaliesCount).toBe(2);
      }
    );

    apiTest(
      'Anomaly overview API: score_ranges that exclude all anomalies returns empty response',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 50 }] },
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as AnomalyOverviewResponse;
        expect(body.anomalyByTimeBucket).toHaveLength(0);
        expect(body.totalAnomaliesCount).toBe(0);
        expect(body.tacticCounts).toStrictEqual({});
      }
    );

    apiTest(
      'Anomaly overview API: returns 400 when a score_ranges min_score is negative',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: -1 }] },
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'Anomaly overview API: returns 400 when a score_ranges max_score exceeds 100',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 0, max_score: 101 }] },
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'Anomaly overview API: returns 400 when a score_ranges min_score is greater than its max_score',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(CAROL_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: { score_ranges: [{ min_score: 50, max_score: 25 }] },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.message).toContain(
          "each `score_ranges` entry's `min_score` must not be greater than its `max_score`"
        );
      }
    );

    apiTest(
      'Anomaly summary API: returns 404 for an entity that does not exist in the entity store',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(UNKNOWN_ENTITY_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'Anomaly overview API: returns 404 for an entity that does not exist in the entity store',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(UNKNOWN_ENTITY_EUID, 'user'), {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'Anomaly summary API: returns error for user without ML read access',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...noMlPrivsHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toBe('Insufficient privileges to access feature');
      }
    );

    apiTest(
      'Anomaly overview API: returns error for user without ML read access',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(CAROL_EUID, 'user'), {
          headers: { ...noMlPrivsHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toBe('Insufficient privileges to access feature');
      }
    );

    apiTest(
      'Anomaly summary API: returns error for user without entity store access',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildUrl(CAROL_EUID, 'user'), {
          headers: { ...noEntityStorePrivsHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toBe('Insufficient privileges to access feature');
      }
    );

    apiTest(
      'Anomaly overview API: returns error for user without entity store access',
      async ({ apiClient }) => {
        const response = await apiClient.post(buildOverviewUrl(CAROL_EUID, 'user'), {
          headers: { ...noEntityStorePrivsHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toBe('Insufficient privileges to access feature');
      }
    );

    apiTest(
      'Anomaly privileges API: returns has_all_required false for user without .ml-anomlies* access',
      async ({ apiClient }) => {
        const response = await apiClient.get(ENTITY_ANOMALY_PRIVILEGES_INTERNAL_URL, {
          headers: { ...noMlPrivsHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.has_all_required).toBe(false);
      }
    );

    apiTest(
      'Anomaly privileges API: returns has_all_required true for admin with ML index access',
      async ({ apiClient }) => {
        const response = await apiClient.get(ENTITY_ANOMALY_PRIVILEGES_INTERNAL_URL, {
          headers: { ...defaultHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.has_all_required).toBe(true);
        expect(response.body.privileges).toBeDefined();
      }
    );

    apiTest(
      'Anomaly privileges API: returns has_all_required false for user without ML Kibana feature privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(ENTITY_ANOMALY_PRIVILEGES_INTERNAL_URL, {
          headers: { ...noMlPrivsHeaders, 'elastic-api-version': '1' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.has_all_required).toBe(false);
      }
    );
  }
);
