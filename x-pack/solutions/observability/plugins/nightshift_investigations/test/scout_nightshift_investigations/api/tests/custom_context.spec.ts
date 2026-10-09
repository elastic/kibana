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
  getCustomContext,
  putCustomContext,
  replaceCustomContext,
  uniqueId,
} from '../fixtures';

const SPACE_ID = uniqueId('nightshift-custom-context-space');
const OTHER_SPACE_ID = uniqueId('nightshift-custom-context-other');
const SNIPPET = 'While debugging alerts, always rule out a release and config regression.';

const setNightshiftEnabled = (apiServices: ApiServicesFixture, enabled: boolean | null) =>
  apiServices.core.settings({ 'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: enabled } });

apiTest.describe(
  '/internal/nightshift/custom_context',
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

    // A worker has a single custom role slot, so log in right before use.
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

    apiTest('adds, keeps, edits and removes snippets', async ({ apiClient }) => {
      const empty = await getCustomContext(apiClient, manageCookie, SPACE_ID);
      expect(empty).toHaveStatusCode(200);
      expect(empty.body.snippets).toStrictEqual([]);

      const created = await putCustomContext(apiClient, manageCookie, SPACE_ID, {
        snippets: [{ text: SNIPPET }, { text: '   ' }],
      });
      expect(created).toHaveStatusCode(200);
      expect(created.body.snippets).toHaveLength(1);
      const [first] = created.body.snippets;
      expect(first.text).toBe(SNIPPET);
      expect(typeof first.id).toBe('string');
      expect(typeof first.author_name).toBe('string');
      expect(Number.isNaN(Date.parse(first.created_at))).toBe(false);

      const appended = await putCustomContext(apiClient, manageCookie, SPACE_ID, {
        snippets: [{ id: first.id, text: first.text }, { text: 'Payments runs in us-east-1.' }],
        version: created.body.version,
      });
      expect(appended).toHaveStatusCode(200);
      expect(appended.body.snippets).toHaveLength(2);
      expect(appended.body.snippets[0]).toStrictEqual(first);

      const edited = await putCustomContext(apiClient, manageCookie, SPACE_ID, {
        snippets: [
          { id: first.id, text: 'Rule out config regressions first.' },
          { id: appended.body.snippets[1].id, text: appended.body.snippets[1].text },
        ],
        version: appended.body.version,
      });
      expect(edited).toHaveStatusCode(200);
      const [editedFirst, untouched] = edited.body.snippets;
      expect(editedFirst).toMatchObject({
        id: first.id,
        text: 'Rule out config regressions first.',
        author_name: first.author_name,
        created_at: first.created_at,
      });
      expect(typeof editedFirst.updated_by).toBe('string');
      expect(Number.isNaN(Date.parse(editedFirst.updated_at ?? ''))).toBe(false);
      expect(untouched).toStrictEqual(appended.body.snippets[1]);

      const listed = await getCustomContext(apiClient, manageCookie, SPACE_ID);
      expect(listed.body.snippets).toStrictEqual(edited.body.snippets);

      const stale = await putCustomContext(apiClient, manageCookie, SPACE_ID, {
        snippets: [],
        version: created.body.version,
      });
      expect(stale).toHaveStatusCode(409);

      const unversioned = await putCustomContext(apiClient, manageCookie, SPACE_ID, {
        snippets: [],
      });
      expect(unversioned).toHaveStatusCode(409);

      const cleared = await putCustomContext(apiClient, manageCookie, SPACE_ID, {
        snippets: [],
        version: edited.body.version,
      });
      expect(cleared).toHaveStatusCode(200);
      expect(cleared.body.snippets).toStrictEqual([]);
    });

    apiTest('rejects snippets over the size limits', async ({ apiClient }) => {
      const tooLong = await replaceCustomContext(apiClient, manageCookie, SPACE_ID, [
        { text: 'a'.repeat(32_769) },
      ]);
      expect(tooLong).toHaveStatusCode(400);

      const tooMany = await replaceCustomContext(
        apiClient,
        manageCookie,
        SPACE_ID,
        Array.from({ length: 201 }, () => ({ text: 'a' }))
      );
      expect(tooMany).toHaveStatusCode(400);

      const tooLarge = await replaceCustomContext(
        apiClient,
        manageCookie,
        SPACE_ID,
        Array.from({ length: 9 }, () => ({ text: 'a'.repeat(30_000) }))
      );
      expect(tooLarge).toHaveStatusCode(400);
    });

    apiTest('keeps snippets isolated per space', async ({ apiClient }) => {
      const created = await replaceCustomContext(apiClient, manageCookie, SPACE_ID, [
        { text: SNIPPET },
      ]);
      expect(created).toHaveStatusCode(200);

      const other = await getCustomContext(apiClient, manageCookie, OTHER_SPACE_ID);
      expect(other).toHaveStatusCode(200);
      expect(other.body.snippets).toStrictEqual([]);

      await replaceCustomContext(apiClient, manageCookie, SPACE_ID, []);
    });

    apiTest(
      'lets read-only users list snippets but not change them',
      async ({ apiClient, samlAuth }) => {
        const seeded = await replaceCustomContext(apiClient, manageCookie, SPACE_ID, [
          { text: SNIPPET },
        ]);
        expect(seeded).toHaveStatusCode(200);

        const { cookieHeader: readCookie } = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ROLE);
        const listed = await getCustomContext(apiClient, readCookie, SPACE_ID);
        expect(listed).toHaveStatusCode(200);
        expect(listed.body.snippets[0].text).toBe(SNIPPET);

        const update = await putCustomContext(apiClient, readCookie, SPACE_ID, {
          snippets: [],
          version: listed.body.version,
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

        const listed = await getCustomContext(apiClient, noAccessCookie, SPACE_ID);
        expect(listed).toHaveStatusCode(403);

        const update = await putCustomContext(apiClient, noAccessCookie, SPACE_ID, {
          snippets: [{ text: SNIPPET }],
        });
        expect(update).toHaveStatusCode(403);
      }
    );

    apiTest('returns 404 while Nightshift is disabled', async ({ apiClient, apiServices }) => {
      await setNightshiftEnabled(apiServices, false);
      try {
        const listed = await getCustomContext(apiClient, manageCookie, SPACE_ID);
        expect(listed).toHaveStatusCode(404);
      } finally {
        await setNightshiftEnabled(apiServices, true);
      }
    });
  }
);
