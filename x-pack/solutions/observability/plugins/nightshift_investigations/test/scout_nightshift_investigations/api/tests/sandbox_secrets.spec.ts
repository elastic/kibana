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
  NIGHTSHIFT_NO_ACCESS_ROLE,
  getSandboxSecrets,
  putSandboxSecrets,
  replaceSandboxSecrets,
  uniqueId,
} from '../fixtures';

const SPACE_ID = uniqueId('nightshift-secrets-space');
const OTHER_SPACE_ID = uniqueId('nightshift-secrets-other');
const GITHUB_TOKEN = 'ghp_scout_secret_value';
const OTHER_VALUE = 'other-secret-value';

// Neither submitted secret value may appear in any response; a check that only excludes one of
// them would still pass if the API leaked the other.
const expectNoSecretValuesLeaked = (body: unknown) => {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain(GITHUB_TOKEN);
  expect(serialized).not.toContain(OTHER_VALUE);
};

const setNightshiftEnabled = (apiServices: ApiServicesFixture, enabled: boolean | null) =>
  apiServices.core.settings({ 'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: enabled } });

apiTest.describe(
  '/internal/nightshift/sandbox_secrets',
  { tag: [...tags.local.stateful.classic, ...tags.local.serverless.observability.complete] },
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

      const created = await replaceSandboxSecrets(apiClient, manageCookie, SPACE_ID, [
        { key: 'GITHUB_TOKEN', value: GITHUB_TOKEN },
        { key: 'OTHER_KEY', value: OTHER_VALUE },
      ]);
      expect(created).toHaveStatusCode(200);
      expect(created.body.keys).toStrictEqual(['GITHUB_TOKEN', 'OTHER_KEY']);
      expectNoSecretValuesLeaked(created.body);

      const listed = await getSandboxSecrets(apiClient, manageCookie, SPACE_ID);
      expect(listed).toHaveStatusCode(200);
      expect(listed.body.keys).toStrictEqual(['GITHUB_TOKEN', 'OTHER_KEY']);
      expect(listed.body.canEncrypt).toBe(true);
      expectNoSecretValuesLeaked(listed.body);

      // Omitting a value keeps it; omitting a key removes it.
      const kept = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [{ key: 'GITHUB_TOKEN' }],
        version: listed.body.version,
      });
      expect(kept).toHaveStatusCode(200);
      expect(kept.body.keys).toStrictEqual(['GITHUB_TOKEN']);
      expectNoSecretValuesLeaked(kept.body);

      const stale = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [{ key: 'GITHUB_TOKEN' }],
        version: listed.body.version,
      });
      expect(stale).toHaveStatusCode(409);

      // Once the object exists, an unversioned write is treated like a stale one.
      const unversioned = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [{ key: 'GITHUB_TOKEN' }],
      });
      expect(unversioned).toHaveStatusCode(409);

      const cleared = await putSandboxSecrets(apiClient, manageCookie, SPACE_ID, {
        entries: [],
        version: kept.body.version,
      });
      expect(cleared).toHaveStatusCode(200);
      expect(cleared.body.keys).toStrictEqual([]);
    });

    apiTest(
      'rejects new keys without a value, too short or multi-line values and reserved keys',
      async ({ apiClient }) => {
        const missingValue = await replaceSandboxSecrets(apiClient, manageCookie, SPACE_ID, [
          { key: 'NO_VALUE' },
        ]);
        expect(missingValue).toHaveStatusCode(400);

        const tooShort = await replaceSandboxSecrets(apiClient, manageCookie, SPACE_ID, [
          { key: 'TOO_SHORT', value: 'short' },
        ]);
        expect(tooShort).toHaveStatusCode(400);

        const multiLine = await replaceSandboxSecrets(apiClient, manageCookie, SPACE_ID, [
          { key: 'MULTI_LINE', value: 'first-line\nsecond-line' },
        ]);
        expect(multiLine).toHaveStatusCode(400);

        const reserved = await replaceSandboxSecrets(apiClient, manageCookie, SPACE_ID, [
          { key: 'CONNECTOR_TOKEN', value: 'reserved-value' },
        ]);
        expect(reserved).toHaveStatusCode(400);
      }
    );

    apiTest('keeps secrets isolated per space', async ({ apiClient }) => {
      const created = await replaceSandboxSecrets(apiClient, manageCookie, SPACE_ID, [
        { key: 'SPACE_SCOPED', value: 'space-value' },
      ]);
      expect(created).toHaveStatusCode(200);

      const other = await getSandboxSecrets(apiClient, manageCookie, OTHER_SPACE_ID);
      expect(other).toHaveStatusCode(200);
      expect(other.body.keys).toStrictEqual([]);

      await replaceSandboxSecrets(apiClient, manageCookie, SPACE_ID, []);
    });

    apiTest(
      'lets read-only users list keys but not change secrets',
      async ({ apiClient, samlAuth }) => {
        // Seed before switching roles: logging in as another custom role changes the privileges
        // behind manageCookie too.
        const seeded = await replaceSandboxSecrets(apiClient, manageCookie, SPACE_ID, [
          { key: 'READ_ONLY_VISIBLE', value: 'read-only-visible-value' },
        ]);
        expect(seeded).toHaveStatusCode(200);

        const { cookieHeader: readCookie } = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ROLE);
        const listed = await getSandboxSecrets(apiClient, readCookie, SPACE_ID);
        expect(listed).toHaveStatusCode(200);
        expect(listed.body.keys).toContain('READ_ONLY_VISIBLE');

        const update = await putSandboxSecrets(apiClient, readCookie, SPACE_ID, {
          entries: [{ key: 'READ_ONLY', value: 'read-only-value' }],
        });
        expect(update).toHaveStatusCode(403);
      }
    );

    apiTest(
      'rejects users without any Nightshift privilege in the space',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: noAccessCookie } = await samlAuth.asInteractiveUser(
          NIGHTSHIFT_NO_ACCESS_ROLE
        );

        const listed = await getSandboxSecrets(apiClient, noAccessCookie, SPACE_ID);
        expect(listed).toHaveStatusCode(403);

        const update = await putSandboxSecrets(apiClient, noAccessCookie, SPACE_ID, {
          entries: [{ key: 'NO_ACCESS', value: 'no-access-value' }],
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
