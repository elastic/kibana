/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags, type ApiServicesFixture } from '@kbn/scout-oblt';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import {
  apiTest,
  NIGHTSHIFT_MANAGE_ROLE,
  NIGHTSHIFT_READ_ROLE,
  getSandboxSecrets,
  putSandboxSecrets,
  uniqueId,
} from '../fixtures';

const SPACE_ID = uniqueId('nightshift-secrets-space');
const OTHER_SPACE_ID = uniqueId('nightshift-secrets-other');
const GITHUB_TOKEN = 'ghp_scout_secret_value';

const setNightshiftEnabled = (apiServices: ApiServicesFixture, enabled: boolean | null) =>
  apiServices.core.settings({ 'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: enabled } });

apiTest.describe(
  '/internal/nightshift/sandbox_secrets',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let manageCookie: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, config }) => {
      // The API is gated on the nightshift.enabled flag, which can only be overridden where
      // coreApp.allowDynamicConfigOverrides is set (Scout's local configs), not on Cloud.
      apiTest.skip(
        config.isCloud === true,
        `Cannot override '${NIGHTSHIFT_ENABLED_FLAG}' on Cloud deployments`
      );
      if (config.isCloud) {
        return;
      }
      await setNightshiftEnabled(apiServices, true);
      await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });
    });

    // A worker has a single custom role slot, so logging in with another custom role changes the
    // privileges behind every earlier cookie. Log in right before use instead of once up front.
    apiTest.beforeEach(async ({ samlAuth }) => {
      ({ cookieHeader: manageCookie } = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGE_ROLE));
    });

    apiTest.afterAll(async ({ apiServices, config }) => {
      if (config.isCloud) {
        return;
      }
      try {
        await Promise.all([
          apiServices.spaces.delete(SPACE_ID),
          apiServices.spaces.delete(OTHER_SPACE_ID),
        ]);
      } finally {
        await setNightshiftEnabled(apiServices, null);
      }
    });

    apiTest('stores secrets and only ever returns their keys', async ({ apiClient }) => {
      const empty = await getSandboxSecrets(apiClient, manageCookie, SPACE_ID);
      expect(empty).toHaveStatusCode(200);
      expect(empty.body.keys).toStrictEqual([]);

      const created = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [
          { key: 'GITHUB_TOKEN', value: GITHUB_TOKEN },
          { key: 'OTHER_KEY', value: 'other-value' },
        ],
      });
      expect(created).toHaveStatusCode(200);
      expect(created.body.keys).toStrictEqual(['GITHUB_TOKEN', 'OTHER_KEY']);
      expect(JSON.stringify(created.body)).not.toContain(GITHUB_TOKEN);

      const listed = await getSandboxSecrets(apiClient, manageCookie, SPACE_ID);
      expect(listed).toHaveStatusCode(200);
      expect(listed.body.keys).toStrictEqual(['GITHUB_TOKEN', 'OTHER_KEY']);
      expect(listed.body.canEncrypt).toBe(true);
      expect(JSON.stringify(listed.body)).not.toContain(GITHUB_TOKEN);

      // Omitting a value keeps it; omitting a key removes it.
      const kept = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [{ key: 'GITHUB_TOKEN' }],
        version: listed.body.version,
      });
      expect(kept).toHaveStatusCode(200);
      expect(kept.body.keys).toStrictEqual(['GITHUB_TOKEN']);

      const stale = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [{ key: 'GITHUB_TOKEN' }],
        version: listed.body.version,
      });
      expect(stale).toHaveStatusCode(409);

      const cleared = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [],
      });
      expect(cleared).toHaveStatusCode(200);
      expect(cleared.body.keys).toStrictEqual([]);
    });

    apiTest(
      'rejects new keys without a value, too short values and reserved keys',
      async ({ apiClient }) => {
        const missingValue = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
          entries: [{ key: 'NO_VALUE' }],
        });
        expect(missingValue).toHaveStatusCode(400);

        const tooShort = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
          entries: [{ key: 'TOO_SHORT', value: 'short' }],
        });
        expect(tooShort).toHaveStatusCode(400);

        const reserved = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
          entries: [{ key: 'CONNECTOR_TOKEN', value: 'reserved-value' }],
        });
        expect(reserved).toHaveStatusCode(400);
      }
    );

    apiTest('keeps secrets isolated per space', async ({ apiClient }) => {
      const created = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [{ key: 'SPACE_SCOPED', value: 'space-value' }],
      });
      expect(created).toHaveStatusCode(200);

      const other = await getSandboxSecrets(apiClient, manageCookie, OTHER_SPACE_ID);
      expect(other).toHaveStatusCode(200);
      expect(other.body.keys).toStrictEqual([]);

      await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, { entries: [] });
    });

    apiTest(
      'lets read-only users list keys but not change secrets',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: readCookie } = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ROLE);
        const listed = await getSandboxSecrets(apiClient, readCookie, SPACE_ID);
        expect(listed).toHaveStatusCode(200);

        const update = await putSandboxSecrets(apiClient, readCookie, SPACE_ID, {
          entries: [{ key: 'READ_ONLY', value: 'read-only-value' }],
        });
        expect(update).toHaveStatusCode(403);
      }
    );

    apiTest('returns 404 while Nightshift is disabled', async ({ apiClient, apiServices }) => {
      await setNightshiftEnabled(apiServices, false);
      try {
        const listed = await getSandboxSecrets(apiClient, manageCookie, SPACE_ID);
        expect(listed).toHaveStatusCode(404);

        const update = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
          entries: [{ key: 'DISABLED', value: 'disabled-value' }],
        });
        expect(update).toHaveStatusCode(404);
      } finally {
        await setNightshiftEnabled(apiServices, true);
      }
    });
  }
);
