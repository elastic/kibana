/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
  UPDATES_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices, ingestDoc } from '../fixtures/helpers';
import {
  LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
  LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
  LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT,
} from '../../../../server/domain/saved_objects';

const FROM_DATE = '2026-06-10T10:00:00Z';
const TO_DATE = '2026-06-10T11:00:00Z';

const HOST_TIMESTAMPS = [
  '2026-06-10T10:01:00Z',
  '2026-06-10T10:02:00Z',
  '2026-06-10T10:03:00Z',
  '2026-06-10T10:04:00Z',
  '2026-06-10T10:05:00Z',
];

apiTest.describe('Entity Store volume cap', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    internalHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(201);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
    await clearEntityStoreIndices(esClient);
  });

  // Defer: cap fires mid-window — caller uses lastSearchTimestamp to resume
  apiTest(
    'defer — logsCapApplied true, lastSearchTimestamp before window end',
    async ({ apiClient, esClient }) => {
      // Shrink the log-slice page and set a small per-window cap.
      // maxLogsPerPage=1 means each outer loop iteration processes exactly 1 raw log.
      // maxLogsPerWindow=2 causes the cap to fire after 2 entities are extracted.
      await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          logExtraction: {
            maxLogsPerPage: 1,
            maxLogsPerWindow: 2,
            maxLogsPerWindowCapBehavior: 'defer',
          },
        },
      });

      try {
        for (let i = 0; i < HOST_TIMESTAMPS.length; i++) {
          await ingestDoc(esClient, {
            '@timestamp': HOST_TIMESTAMPS[i],
            host: { name: `cap-defer-host-${i + 1}` },
          });
        }

        const response = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
          {
            headers: internalHeaders,
            responseType: 'json',
            body: { fromDateISO: FROM_DATE, toDateISO: TO_DATE },
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        expect(response.body.logsCapApplied).toBe(true);
        expect(response.body.count).toBeLessThanOrEqual(2);
        // logsProcessed counts raw log documents (not entities) — must not exceed the cap
        expect(response.body.logsProcessed).toBeLessThanOrEqual(2);
        // defer: cursor stops before window end so the caller can resume
        expect(response.body.lastSearchTimestamp).toBeDefined();
        // Use numeric timestamps for comparison — toBeLessThan/toBeGreaterThanOrEqual expect numbers
        const lastTs = new Date(response.body.lastSearchTimestamp).getTime();
        expect(lastTs).toBeLessThan(new Date(TO_DATE).getTime());
        expect(lastTs).toBeGreaterThanOrEqual(new Date(FROM_DATE).getTime());

        // A follow-up call from the resume point extracts more entities
        const resumeResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
          {
            headers: internalHeaders,
            responseType: 'json',
            body: { fromDateISO: response.body.lastSearchTimestamp, toDateISO: TO_DATE },
          }
        );
        expect(resumeResponse).toHaveStatusCode(200);
        expect(resumeResponse.body.success).toBe(true);
        expect(resumeResponse.body.count).toBeGreaterThanOrEqual(1);

        // All 5 entities should eventually appear in the LATEST index
        await esClient.indices.refresh({ index: LATEST_ALIAS });
        const entities = await esClient.search({
          index: LATEST_ALIAS,
          query: {
            bool: {
              filter: [
                { term: { 'entity.EngineMetadata.Type': 'host' } },
                { prefix: { 'host.name': 'cap-defer-host-' } },
              ],
            },
          },
          size: 10,
        });
        // At least the capped portion should be materialised
        expect(entities.hits.hits.length).toBeGreaterThanOrEqual(2);
      } finally {
        // Remove ingested docs and restore config to defaults
        await esClient.deleteByQuery({
          index: UPDATES_INDEX,
          refresh: true,
          query: { prefix: { 'host.name': 'cap-defer-host-' } },
        });
        await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            logExtraction: {
              maxLogsPerPage: LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
              maxLogsPerWindow: LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
              maxLogsPerWindowCapBehavior: LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT,
            },
          },
        });
      }
    }
  );

  // Drop: cap fires mid-window — lastSearchTimestamp jumps to window end
  apiTest(
    'drop — logsCapApplied true, lastSearchTimestamp equals window end',
    async ({ apiClient, esClient }) => {
      await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          logExtraction: {
            maxLogsPerPage: 1,
            maxLogsPerWindow: 2,
            maxLogsPerWindowCapBehavior: 'drop',
          },
        },
      });

      try {
        for (let i = 0; i < HOST_TIMESTAMPS.length; i++) {
          await ingestDoc(esClient, {
            '@timestamp': HOST_TIMESTAMPS[i],
            host: { name: `cap-drop-host-${i + 1}` },
          });
        }

        const response = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
          {
            headers: internalHeaders,
            responseType: 'json',
            body: { fromDateISO: FROM_DATE, toDateISO: TO_DATE },
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        expect(response.body.logsCapApplied).toBe(true);
        expect(response.body.count).toBeLessThanOrEqual(2);
        // logsProcessed counts raw log documents — must not exceed the cap
        expect(response.body.logsProcessed).toBeLessThanOrEqual(2);
        // drop: cursor advances to the window end
        expect(response.body.lastSearchTimestamp).toBe(TO_DATE);
      } finally {
        await esClient.deleteByQuery({
          index: UPDATES_INDEX,
          refresh: true,
          query: { prefix: { 'host.name': 'cap-drop-host-' } },
        });
        await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            logExtraction: {
              maxLogsPerPage: LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
              maxLogsPerWindow: LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
              maxLogsPerWindowCapBehavior: LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT,
            },
          },
        });
      }
    }
  );

  // Disabled: maxLogsPerWindow=0 means no cap — all entities extracted
  apiTest(
    'maxLogsPerWindow 0 disables the cap and extracts all docs',
    async ({ apiClient, esClient }) => {
      await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          logExtraction: {
            maxLogsPerPage: 1,
            maxLogsPerWindow: 0,
          },
        },
      });

      try {
        for (let i = 0; i < HOST_TIMESTAMPS.length; i++) {
          await ingestDoc(esClient, {
            '@timestamp': HOST_TIMESTAMPS[i],
            host: { name: `cap-disabled-host-${i + 1}` },
          });
        }

        const response = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
          {
            headers: internalHeaders,
            responseType: 'json',
            body: { fromDateISO: FROM_DATE, toDateISO: TO_DATE },
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.success).toBe(true);
        expect(response.body.logsCapApplied).toBe(false);
        expect(response.body.count).toBe(HOST_TIMESTAMPS.length);
        expect(response.body.logsProcessed).toBe(HOST_TIMESTAMPS.length);
      } finally {
        await esClient.deleteByQuery({
          index: UPDATES_INDEX,
          refresh: true,
          query: { prefix: { 'host.name': 'cap-disabled-host-' } },
        });
        await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            logExtraction: {
              maxLogsPerPage: LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
              maxLogsPerWindow: LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
            },
          },
        });
      }
    }
  );
});
