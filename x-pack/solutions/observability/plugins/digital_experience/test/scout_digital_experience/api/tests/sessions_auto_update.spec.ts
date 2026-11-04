/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, type ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_MANAGED_BY,
  SESSIONS_SOURCE_INDICES,
  SESSIONS_TRANSFORM_ID,
  type SessionsStatus,
} from '../../../../common/sessions';
import { deleteSessionsData } from '../../common/fixtures/sessions_data';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_STATEFUL_TAGS } from '../../tags';

const { COMMON_HEADERS } = testData;

const STATUS_PATH = 'internal/digital_experience/sessions/status';
const ENABLE_PATH = 'internal/digital_experience/sessions/enable';
const HEALTH_TASK_ID = 'digital_experience:sessions-health:1.0.0';
const API_KEY_NAME = 'Digital Experience sessions';

/** The health task runs within seconds of `run_soon`; a minute leaves room for the update. */
const UPDATE_TIMEOUT_MS = 60_000;
const UPDATE_POLL_MS = 1_000;

/** A transform an earlier Kibana would have left behind, as after an upgrade. */
const LEFTOVER_TRANSFORM_ID = 'digital-experience-sessions-0';

apiTest.describe(
  'Digital Experience sessions automatic update',
  { tag: DIGITAL_EXPERIENCE_STATEFUL_TAGS },
  () => {
    let headers: Record<string, string>;
    let apiKeyId: string | null = null;

    const getStatus = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.get(STATUS_PATH, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      return response.body as SessionsStatus;
    };

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      await deleteSessionsData(esClient);
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest.afterAll(async ({ esClient }) => {
      await deleteSessionsData(esClient);
      if (apiKeyId) {
        await esClient.security.invalidateApiKey({ ids: [apiKeyId] });
      }
    });

    apiTest(
      'updates outdated transforms with the stored API key, which only reads the source data and writes sessions',
      async ({ apiClient, esClient, kbnClient }) => {
        const enabled = await apiClient.post(ENABLE_PATH, { headers, responseType: 'json' });
        expect(enabled).toHaveStatusCode(200);
        const afterEnable = enabled.body as SessionsStatus;
        expect(afterEnable).toMatchObject({
          installed: true,
          needsUpdate: false,
          autoUpdate: true,
        });
        expect(afterEnable.authorization?.apiKeyName).toBe(API_KEY_NAME);
        const grantedKeyId = afterEnable.authorization?.apiKeyId;
        expect(typeof grantedKeyId).toBe('string');
        apiKeyId = grantedKeyId ?? null;

        // The key may only read the source data and manage the sessions index.
        const {
          api_keys: [apiKey],
        } = await esClient.security.getApiKey({ id: grantedKeyId ?? '' });
        expect(apiKey.invalidated).toBe(false);
        const { cluster, indices = [] } = Object.values(apiKey.role_descriptors ?? {})[0];
        expect(cluster).toStrictEqual([]);
        expect(indices.map(({ names }) => names)).toStrictEqual([
          [...SESSIONS_SOURCE_INDICES],
          [SESSIONS_INDEX_PATTERN],
        ]);

        await esClient.transform.putTransform({
          transform_id: LEFTOVER_TRANSFORM_ID,
          source: { index: [...SESSIONS_SOURCE_INDICES] },
          dest: { index: LEFTOVER_TRANSFORM_ID },
          pivot: {
            group_by: { service: { terms: { field: 'resource.attributes.service.name' } } },
            aggregations: { events: { value_count: { field: '@timestamp' } } },
          },
          _meta: { managed_by: SESSIONS_MANAGED_BY, version: 0, partition: 0 },
          defer_validation: true,
        });
        // The leftover transform is stopped, so health is degraded; what matters is the update.
        expect(await getStatus(apiClient)).toMatchObject({ needsUpdate: true, autoUpdate: true });

        await kbnClient.request({
          method: 'POST',
          path: `/internal/ftr/task_manager/${encodeURIComponent(HEALTH_TASK_ID)}/run_soon`,
          headers: COMMON_HEADERS,
        });

        await expect
          .poll(async () => (await getStatus(apiClient)).needsUpdate, {
            timeout: UPDATE_TIMEOUT_MS,
            intervals: [UPDATE_POLL_MS],
          })
          .toBe(false);
        const afterUpdate = await getStatus(apiClient);
        expect(afterUpdate.transforms.map(({ id }) => id)).toStrictEqual([SESSIONS_TRANSFORM_ID]);
        // Same key, and who enabled sessions, and when, are kept from enable time.
        expect(afterUpdate.authorization?.apiKeyId).toBe(apiKeyId);
        expect(afterUpdate.enabledBy).toBe(afterEnable.enabledBy);
        expect(afterUpdate.enabledAt).toBe(afterEnable.enabledAt);
        expect(afterUpdate.autoUpdate).toBe(true);
      }
    );
  }
);
