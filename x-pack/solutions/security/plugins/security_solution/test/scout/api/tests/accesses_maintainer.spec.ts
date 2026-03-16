/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { INTEGRATION_CONFIGS } from '../../../../server/lib/entity_analytics/entity_store/maintainers/accesses/integrations';
import { MAINTAINER_ID } from '../../../../server/lib/entity_analytics/entity_store/maintainers/accesses/constants';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  MAINTAINER_ROUTES,
  LATEST_INDEX,
  FF_ENABLE_ENTITY_STORE_V2,
} from '../fixtures/constants';

const ARCHIVES_BASE =
  'x-pack/solutions/security/plugins/security_solution/test/scout/api/es_archives';

/**
 * Per-integration test configuration that maps server-side integration IDs
 * to their test-specific data (archive paths, data streams, entity IDs).
 */
interface IntegrationTestConfig {
  archivePath: string;
  idpArchivePath: string;
  dataStreamName: string;
  templateName: string;
  /** Entity namespace derived from event.module via field evaluations */
  entityNamespace: string;
  /** Host ID used in the "frequently accessed" events */
  expectedFrequentHost: string;
  /** Host ID used in the "infrequently accessed" event */
  expectedInfrequentHost: string;
}

const TEST_CONFIGS: Record<string, IntegrationTestConfig> = {
  elastic_defend: {
    archivePath: `${ARCHIVES_BASE}/elastic_defend/events`,
    idpArchivePath: `${ARCHIVES_BASE}/elastic_defend/idp_events`,
    dataStreamName: 'logs-endpoint.events.security-default',
    templateName: 'scout-elastic-defend-events',
    entityNamespace: 'endpoint',
    expectedFrequentHost: 'test-host-a',
    expectedInfrequentHost: 'test-host-b',
  },
  aws_cloudtrail: {
    archivePath: `${ARCHIVES_BASE}/aws_cloudtrail/events`,
    idpArchivePath: `${ARCHIVES_BASE}/aws_cloudtrail/idp_events`,
    dataStreamName: 'logs-aws.cloudtrail-default',
    templateName: 'scout-aws-cloudtrail-events',
    entityNamespace: 'aws',
    expectedFrequentHost: 'i-0abc111111111111a',
    expectedInfrequentHost: 'i-0abc222222222222b',
  },
};

/** Normalise a field that may be a single string or an array into a string[]. */
function toArray(value: unknown): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? (value as string[]) : [value as string];
}

/** Resolve a dot-separated path from a nested _source object. */
function getField(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

interface MaintainerEntry {
  id: string;
  runs: number;
  customState: Record<string, unknown> | null;
  lastSuccessTimestamp: string | null;
  lastErrorTimestamp: string | null;
}

interface ApiClient {
  get: (url: string, options?: Record<string, unknown>) => Promise<{ body: unknown }>;
  post: (
    url: string,
    options?: Record<string, unknown>
  ) => Promise<{ statusCode: number; body: unknown }>;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

async function getMaintainerEntry(
  apiClient: ApiClient,
  headers: Record<string, string>,
  maintainerId: string
): Promise<MaintainerEntry | undefined> {
  const res = await apiClient.get(MAINTAINER_ROUTES.GET, {
    headers,
    responseType: 'json',
  });
  const body = res.body as { maintainers: MaintainerEntry[] };
  return body.maintainers.find((m) => m.id === maintainerId);
}

/**
 * Calls the `run` endpoint, retrying on 500 which can happen when Task Manager
 * hasn't finished registering the task after `init`.
 */
async function triggerMaintainerRun(
  apiClient: ApiClient,
  headers: Record<string, string>,
  maintainerId: string,
  maxAttempts = 5,
  delayMs = 2000
): Promise<void> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await apiClient.post(MAINTAINER_ROUTES.RUN(maintainerId), {
      headers,
      responseType: 'json',
    });
    lastStatus = res.statusCode;
    if (lastStatus === 200) return;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`run/${maintainerId} returned ${lastStatus} after ${maxAttempts} attempts`);
}

/**
 * Polls until the maintainer's `runs` count exceeds `minRuns` AND
 * `lastSuccessTimestamp` is set, ensuring we wait for the *current* run
 * rather than returning on stale state from a previous suite repetition.
 */
async function waitForMaintainerSuccess(
  apiClient: ApiClient,
  headers: Record<string, string>,
  maintainerId: string,
  minRuns: number = 0
): Promise<MaintainerEntry> {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const entry = await getMaintainerEntry(apiClient, headers, maintainerId);

    if (entry && entry.runs > minRuns && entry.lastSuccessTimestamp) {
      return entry;
    }

    if (entry && entry.runs > minRuns && entry.lastErrorTimestamp) {
      throw new Error(
        `Maintainer "${maintainerId}" failed (runs=${entry.runs}, minRuns=${minRuns}). ` +
          `Entry: ${JSON.stringify(entry)}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Maintainer "${maintainerId}" did not complete within ${POLL_TIMEOUT_MS}ms`);
}

/**
 * Integration tests for the `accesses_frequently_and_infrequently` entity
 * maintainer. For each configured integration a small dataset of 6 synthetic
 * authentication events is loaded via esArchiver:
 *   - 5 events for user-a → host-a (access_count > 4 → accesses_frequently)
 *   - 1 event for user-b → host-b (access_count ≤ 4 → accesses_infrequently)
 *
 * Each integration also loads 2 IDP-like events (event.category: iam,
 * event.type: user) so entities pass the postAggFilter during extraction.
 *
 * The maintainer is triggered, and the resulting entity relationships are verified.
 */
for (const integration of INTEGRATION_CONFIGS) {
  const testConfig = TEST_CONFIGS[integration.id];
  if (!testConfig) {
    // eslint-disable-next-line no-continue
    continue;
  }

  apiTest.describe(`Accesses Maintainer [${integration.name}]`, { tag: ENTITY_STORE_TAGS }, () => {
    let defaultHeaders: Record<string, string>;

    const expectedUserAId = `user:test-user-a@${testConfig.entityNamespace}`;
    const expectedUserBId = `user:test-user-b@${testConfig.entityNamespace}`;

    apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient, esArchiver, esClient }) => {
      apiTest.setTimeout(120_000);

      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...COMMON_HEADERS,
      };

      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      // Clean up any leftover entity store from a previous run
      await apiClient
        .post(ENTITY_STORE_ROUTES.UNINSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        })
        .catch(() => {});

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(installResponse.statusCode).toBe(201);

      const initResponse = await apiClient.post(MAINTAINER_ROUTES.INIT, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(initResponse.statusCode).toBe(200);

      // Delete the data stream if it exists so esArchiver re-creates it with
      // the correct mappings and seed documents on every suite run.
      try {
        await esClient.indices.deleteDataStream({ name: testConfig.dataStreamName });
      } catch {
        // Data stream may not exist on the very first run
      }
      try {
        await esClient.indices.deleteIndexTemplate({ name: testConfig.templateName });
      } catch {
        // Template may not exist
      }

      // Load the data stream template, mappings, and 6 seed documents.
      await esArchiver.loadIfNeeded(testConfig.archivePath);

      // Load IDP-like events (event.category: iam, event.type: user) so that
      // entities pass the user postAggFilter during extraction.
      await esArchiver.loadIfNeeded(testConfig.idpArchivePath);

      // Refresh timestamps so events fall within the maintainer's lookback
      // window (now-4w). esArchiver data has static timestamps that would
      // eventually age out.
      const now = new Date().toISOString();
      await esClient.updateByQuery({
        index: testConfig.dataStreamName,
        script: {
          source: "ctx._source['@timestamp'] = params.now",
          params: { now },
          lang: 'painless',
        },
        query: { match_all: {} },
        refresh: true,
      });

      // Run the maintainer and wait for it to complete
      const entryBeforeRun = await getMaintainerEntry(apiClient, defaultHeaders, MAINTAINER_ID);
      const runsBefore = entryBeforeRun?.runs ?? 0;

      await triggerMaintainerRun(apiClient, defaultHeaders, MAINTAINER_ID);

      const maintainerEntry = await waitForMaintainerSuccess(
        apiClient,
        defaultHeaders,
        MAINTAINER_ID,
        runsBefore
      );

      expect(maintainerEntry.customState).toBeDefined();

      // Force log extraction to populate the latest entity index
      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'),
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            fromDateISO: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            toDateISO: new Date().toISOString(),
          },
        }
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect((extractionResponse.body as Record<string, unknown>).success).toBe(true);

      await esClient.indices.refresh({ index: LATEST_INDEX });
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      // Unload esArchiver data: delete data stream and its index template
      await esClient.indices.deleteDataStream({ name: testConfig.dataStreamName }).catch(() => {});
      await esClient.indices.deleteIndexTemplate({ name: testConfig.templateName }).catch(() => {});

      await apiClient
        .post(ENTITY_STORE_ROUTES.UNINSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        })
        .catch(() => {});
    });

    apiTest('Should classify user-a as accesses_frequently', async ({ esClient }) => {
      const entities = await esClient.search({
        index: LATEST_INDEX,
        query: {
          bool: {
            filter: { term: { 'entity.id': expectedUserAId } },
          },
        },
        size: 1,
      });

      expect(entities.hits.hits).toHaveLength(1);

      const source = entities.hits.hits[0]._source as Record<string, unknown>;
      expect(getField(source, 'entity.id')).toBe(expectedUserAId);
      expect(toArray(getField(source, 'entity.relationships.accesses_frequently'))).toStrictEqual([
        testConfig.expectedFrequentHost,
      ]);
      expect(toArray(getField(source, 'entity.relationships.accesses_infrequently'))).toStrictEqual(
        []
      );
    });

    apiTest('Should classify user-b as accesses_infrequently', async ({ esClient }) => {
      const entities = await esClient.search({
        index: LATEST_INDEX,
        query: {
          bool: {
            filter: { term: { 'entity.id': expectedUserBId } },
          },
        },
        size: 1,
      });

      expect(entities.hits.hits).toHaveLength(1);

      const source = entities.hits.hits[0]._source as Record<string, unknown>;
      expect(getField(source, 'entity.id')).toBe(expectedUserBId);
      expect(toArray(getField(source, 'entity.relationships.accesses_frequently'))).toStrictEqual(
        []
      );
      expect(toArray(getField(source, 'entity.relationships.accesses_infrequently'))).toStrictEqual(
        [testConfig.expectedInfrequentHost]
      );
    });
  });
}
