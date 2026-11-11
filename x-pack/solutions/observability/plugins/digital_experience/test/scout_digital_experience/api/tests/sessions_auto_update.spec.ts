/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, type ApiClientFixture, type EsClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { BROWSER_SDK_LANGUAGE } from '../../../../common/otel_data';
import {
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_MANAGED_BY,
  SESSIONS_SOURCE_INDICES,
  SESSIONS_TRANSFORM_ID,
  type SessionsStatus,
} from '../../../../common/sessions';
import { deleteSessionsData } from '../../common/fixtures/sessions_data';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS } = testData;

const STATUS_PATH = 'internal/digital_experience/sessions/status';
const ENABLE_PATH = 'internal/digital_experience/sessions/enable';
const HEALTH_TASK_ID = 'digital_experience:sessions-health:1.0.0';
const API_KEY_NAME = 'Digital Experience sessions (used by the sessions transforms)';

/** The health task runs within seconds of `run_soon`; a minute leaves room for the update. */
const UPDATE_TIMEOUT_MS = 60_000;
const UPDATE_POLL_MS = 1_000;

/** Checkpoints are triggered with `_schedule_now`, so summarizing takes seconds, not minutes. */
const RECOVERY_TIMEOUT_MS = 60_000;
/** The deleted key case waits for three checkpoints, beyond the default test timeout. */
const RECOVERY_TEST_TIMEOUT_MS = 4 * RECOVERY_TIMEOUT_MS;
const RECOVERY_POLL_MS = 2_000;

/** Raw EDOT Browser events of the deleted key case, under a service no other suite uses. */
const RAW_EVENTS_INDEX = 'logs-generic.otel-default';
const RECOVERY_SERVICE = 'dx-key-recovery';
const SESSION_BEFORE_DELETE = 'dx-recovery-before';
const SESSION_WHILE_DELETED = 'dx-recovery-while-deleted';
const SESSION_AFTER_NEW_KEY = 'dx-recovery-after-new-key';

/** A page view the sessions transform summarizes: a browser SDK event with a session. */
const ingestPageView = async (esClient: EsClient, sessionId: string, timestampMs: number) => {
  await esClient.index({
    index: RAW_EVENTS_INDEX,
    op_type: 'create',
    refresh: 'wait_for',
    document: {
      '@timestamp': new Date(timestampMs).toISOString(),
      event_name: 'browser.navigation',
      resource: {
        attributes: {
          'service.name': RECOVERY_SERVICE,
          'telemetry.sdk.language': BROWSER_SDK_LANGUAGE,
        },
      },
      attributes: {
        'session.id': sessionId,
        'url.full': `https://${RECOVERY_SERVICE}.example.com/`,
      },
    },
  });
};

const isSummarized = async (esClient: EsClient, sessionId: string) => {
  const { count } = await esClient.count({
    index: SESSIONS_INDEX,
    query: { term: { 'session.id': sessionId } },
    ignore_unavailable: true,
  });
  return count > 0;
};

/** Runs a checkpoint now instead of at the next `frequency`. */
const runCheckpoint = (esClient: EsClient) =>
  esClient.transform.scheduleNowTransform({ transform_id: SESSIONS_TRANSFORM_ID });

/** A transform an earlier Kibana would have left behind, as after an upgrade. */
const LEFTOVER_TRANSFORM_ID = 'digital-experience-sessions-0';

apiTest.describe(
  'Digital Experience sessions automatic update',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    let headers: Record<string, string>;
    /** Every key enabling granted, so none outlives the suite. */
    const grantedKeyIds = new Set<string>();

    const getStatus = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.get(STATUS_PATH, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      return response.body as SessionsStatus;
    };

    const enable = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.post(ENABLE_PATH, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      const status = response.body as SessionsStatus;
      const keyId = status.authorization?.apiKeyId;
      expect(typeof keyId).toBe('string');
      grantedKeyIds.add(keyId ?? '');
      return { status, keyId: keyId ?? '' };
    };

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      await deleteSessionsData(esClient);
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest.afterAll(async ({ esClient }) => {
      await deleteSessionsData(esClient);
      await esClient.deleteByQuery({
        index: RAW_EVENTS_INDEX,
        query: { term: { 'resource.attributes.service.name': RECOVERY_SERVICE } },
        refresh: true,
        ignore_unavailable: true,
      });
      if (grantedKeyIds.size > 0) {
        await esClient.security.invalidateApiKey({ ids: [...grantedKeyIds] });
      }
    });

    apiTest(
      'updates outdated transforms with the stored API key, which only reads the source data and writes sessions',
      async ({ apiClient, esClient, kbnClient }) => {
        const { status: afterEnable, keyId: grantedKeyId } = await enable(apiClient);
        expect(afterEnable).toMatchObject({
          installed: true,
          needsUpdate: false,
          autoUpdate: true,
        });
        expect(afterEnable.authorization?.apiKeyName).toBe(API_KEY_NAME);

        // The key may only read the source data and manage the sessions index.
        const {
          api_keys: [apiKey],
        } = await esClient.security.getApiKey({ id: grantedKeyId });
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
        expect(afterUpdate.authorization?.apiKeyId).toBe(grantedKeyId);
        expect(afterUpdate.enabledBy).toBe(afterEnable.enabledBy);
        expect(afterUpdate.enabledAt).toBe(afterEnable.enabledAt);
        expect(afterUpdate.autoUpdate).toBe(true);
      }
    );

    apiTest(
      'keeps summarizing sessions after its API key is deleted, and enabling again restores automatic updates',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(RECOVERY_TEST_TIMEOUT_MS);
        // A fresh transform, whose first checkpoint covers everything up to the sync delay.
        await deleteSessionsData(esClient);
        await ingestPageView(esClient, SESSION_BEFORE_DELETE, Date.now() - 5 * 60_000);
        const { keyId: deletedKeyId } = await enable(apiClient);
        const waitUntilSummarized = (sessionId: string) =>
          expect
            .poll(
              async () => {
                await runCheckpoint(esClient);
                return isSummarized(esClient, sessionId);
              },
              { timeout: RECOVERY_TIMEOUT_MS, intervals: [RECOVERY_POLL_MS] }
            )
            .toBe(true);
        await waitUntilSummarized(SESSION_BEFORE_DELETE);

        await esClient.security.invalidateApiKey({ ids: [deletedKeyId] });

        // The last checkpoint ended at least the 60s sync delay before now, so an event 50s ago
        // is only summarized by a later one, which runs after the key is gone.
        await ingestPageView(esClient, SESSION_WHILE_DELETED, Date.now() - 50_000);
        await waitUntilSummarized(SESSION_WHILE_DELETED);
        const {
          transforms: [stats],
        } = await esClient.transform.getTransformStats({ transform_id: SESSIONS_TRANSFORM_ID });
        expect(stats.health?.status?.toLowerCase()).toBe('green');

        // Only updating without a user stops working.
        expect(await getStatus(apiClient)).toMatchObject({
          apiKeyInvalid: true,
          autoUpdate: false,
          needsUpdate: false,
        });

        // What the Sessions tab does when a user who can set sessions up opens it.
        const { status: restored, keyId: newKeyId } = await enable(apiClient);
        expect(newKeyId).not.toBe(deletedKeyId);
        expect(restored).toMatchObject({ apiKeyInvalid: false, autoUpdate: true });

        await ingestPageView(esClient, SESSION_AFTER_NEW_KEY, Date.now() - 50_000);
        await waitUntilSummarized(SESSION_AFTER_NEW_KEY);
      }
    );
  }
);
