/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  API_VERSIONS as ENTITY_STORE_API_VERSIONS,
  ENTITY_STORE_ROUTES,
  getEntitiesAlias,
  ENTITY_LATEST,
  ENTITY_METADATA,
  ENTITY_SCHEMA_VERSION_V2,
  getEntityIndexPattern,
  getLatestEntityIndexPattern,
} from '@kbn/entity-store/common';
import { API_VERSIONS } from '../../../../../../common/constants';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';

const BASE_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'Kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

// AI-summary read/write routes are internal (security_solution) — version comes from the
// same contract the routes register with, not hand-typed here.
const INTERNAL_HEADERS = {
  ...BASE_HEADERS,
  'elastic-api-version': API_VERSIONS.internal.v1,
};

// The Entity Store install route is a public (versioned) API — version comes from the
// entity-store contract.
const PUBLIC_HEADERS = {
  ...BASE_HEADERS,
  'elastic-api-version': ENTITY_STORE_API_VERSIONS.public.v1,
};

const ENTITIES_ALIAS_INDEX = getEntitiesAlias(ENTITY_LATEST, 'default');
const LATEST_ENTITY_INDEX = getLatestEntityIndexPattern('default');
// The metadata client reads/writes the datastream by its bare name (no `-*` suffix), and
// the route queries THIS exact name — so it's the only metadata identifier that matters
// here: a gated reader must hold read on it (an `-*` index pattern would NOT match it), it's
// the index we refresh in setup (the append write uses refresh:false), and it's what we
// clean up in teardown.
const METADATA_DATA_STREAM = getEntityIndexPattern({
  schemaVersion: ENTITY_SCHEMA_VERSION_V2,
  dataset: ENTITY_METADATA,
  namespace: 'default',
});

const TEST_ENTITY_ID = 'user:scout-ai-summary@test';
// Dedicated entity for the two-user parity test so it never depends on the write
// order of the other tests (the datastream is append-only → newest doc wins).
const PARITY_ENTITY_ID = 'user:scout-ai-summary-parity@test';
const TEST_ENTITY_TYPE = 'user';

const readUrl = (entityId: string, entityType: string): string =>
  `${ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL}?entityId=${encodeURIComponent(
    entityId
  )}&entityType=${encodeURIComponent(entityType)}`;

const buildSummaryBody = (overrides: { generated_at?: number } = {}) => ({
  entityId: TEST_ENTITY_ID,
  entityType: TEST_ENTITY_TYPE,
  summary: {
    highlights: [{ title: 'Risk overview', text: 'Entity shows elevated risk.' }],
    recommended_actions: ['Investigate recent logins'],
    generated_at: overrides.generated_at ?? Date.now(),
    staleness: {
      enabled_signals: ['risk_score'],
      snapshot: { risk_score: 72 },
    },
  },
});

/**
 * Permissions matrix for the Entity AI Summary read/write routes.
 *
 * Proves the access-control model:
 *  - generation is gated on FEATURE-level perms (securitySolution + entity-analytics)
 *    and an Enterprise license — not on the user's own metadata index write privilege.
 *  - persistence goes via `asInternalUser`, so a user WITHOUT metadata write can still
 *    persist — but only if they have metadata READ (probe before write).
 *  - no metadata read → POST returns `{ created: false }` (in-session / on-demand only);
 *    GET returns `{ summary: null, canRead: false }`.
 *  - with metadata read → the persisted summary is returned / written as today.
 */
apiTest.describe(
  'Entity AI Summary permissions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiClient, esClient }) => {
      const admin = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...admin.cookieHeader, ...INTERNAL_HEADERS };

      // Install the Entity Store so the metadata datastream exists before we seed.
      // The AI-summary write runs as the internal user (kibana_system), which can
      // append to — but not auto-create — the datastream, so it must be installed
      // first (otherwise the bulk `create` is dropped with an auto_create authz error
      // and reads come back with `summary: null`).
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: { ...admin.cookieHeader, ...PUBLIC_HEADERS },
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(install.statusCode);

      // Seed one persisted summary via the admin so there is a doc for the
      // gated-read assertions below (the datastream itself is created by the install above).
      const seed = await apiClient.post(ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL, {
        headers: adminHeaders,
        responseType: 'json',
        body: buildSummaryBody(),
      });
      expect(seed).toHaveStatusCode(200);
      expect(seed.body).toMatchObject({ created: true });

      // The append write uses refresh:false, so make the seeded doc searchable before
      // the gated-read assertions run (otherwise reads race the 1s auto-refresh).
      await esClient.indices.refresh({ index: METADATA_DATA_STREAM });
    });

    // Append-only datastream: clean up this entity's docs so state doesn't leak
    // across runs. Use `esClient` to sidestep per-user privileges on teardown.
    apiTest.afterAll(async ({ esClient }) => {
      await esClient
        .deleteByQuery({
          index: METADATA_DATA_STREAM,
          query: { terms: { 'entity.id': [TEST_ENTITY_ID, PARITY_ENTITY_ID] } },
          refresh: true,
          conflicts: 'proceed',
        })
        .catch(() => {
          // Datastream may not exist yet on a clean box; safe to ignore.
        });
    });

    apiTest(
      'admin can generate and read back the persisted summary (canRead: true)',
      async ({ apiClient }) => {
        const read = await apiClient.get(readUrl(TEST_ENTITY_ID, TEST_ENTITY_TYPE), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(read).toHaveStatusCode(200);
        expect(read.body).toMatchObject({
          canRead: true,
          summary: {
            highlights: [{ title: 'Risk overview', text: 'Entity shows elevated risk.' }],
            recommended_actions: ['Investigate recent logins'],
            staleness: { enabled_signals: ['risk_score'], snapshot: { risk_score: 72 } },
          },
        });
        // generated_by / generated_at are derived server-side; assert presence + type.
        expect(typeof read.body.summary.generated_by).toBe('string');
        expect(typeof read.body.summary.generated_at).toBe('number');
      }
    );

    apiTest(
      'without the entity-analytics feature privilege, generate and read are blocked (403)',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: { cluster: [] },
          kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
        });
        const headers = { ...cookieHeader, ...INTERNAL_HEADERS };

        const write = await apiClient.post(ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL, {
          headers,
          responseType: 'json',
          body: buildSummaryBody(),
        });
        expect(write).toHaveStatusCode(403);

        const read = await apiClient.get(readUrl(TEST_ENTITY_ID, TEST_ENTITY_TYPE), {
          headers,
          responseType: 'json',
        });
        expect(read).toHaveStatusCode(403);
      }
    );

    apiTest(
      'a user WITHOUT metadata write can still generate + persist (write goes via asInternalUser)',
      async ({ apiClient, samlAuth }) => {
        // Feature priv + entity-store read/write + metadata READ, but explicitly NO metadata write.
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: {
            cluster: [],
            indices: [
              { names: [ENTITIES_ALIAS_INDEX], privileges: ['read', 'write'] },
              { names: [LATEST_ENTITY_INDEX], privileges: ['read', 'write'] },
              { names: [METADATA_DATA_STREAM], privileges: ['read'] },
            ],
          },
          kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
        });
        const headers = { ...cookieHeader, ...INTERNAL_HEADERS };

        const write = await apiClient.post(ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL, {
          headers,
          responseType: 'json',
          body: buildSummaryBody({ generated_at: Date.now() }),
        });
        expect(write).toHaveStatusCode(200);
        expect(write.body).toMatchObject({ created: true });

        // Same user can read it back because they DO have metadata read.
        const read = await apiClient.get(readUrl(TEST_ENTITY_ID, TEST_ENTITY_TYPE), {
          headers,
          responseType: 'json',
        });
        expect(read).toHaveStatusCode(200);
        expect(read.body).toMatchObject({ canRead: true });
        expect(typeof read.body.summary.generated_by).toBe('string');
      }
    );

    apiTest(
      'a user WITHOUT metadata read gets the on-demand fallback (canRead: false)',
      async ({ apiClient, samlAuth }) => {
        // Feature priv + entity-store read, but NO metadata index privileges at all.
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: {
            cluster: [],
            indices: [
              { names: [ENTITIES_ALIAS_INDEX], privileges: ['read'] },
              { names: [LATEST_ENTITY_INDEX], privileges: ['read'] },
            ],
          },
          kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
        });
        const headers = { ...cookieHeader, ...INTERNAL_HEADERS };

        const read = await apiClient.get(readUrl(TEST_ENTITY_ID, TEST_ENTITY_TYPE), {
          headers,
          responseType: 'json',
        });

        // The datastream exists (seeded in beforeAll), so ES denies the read and the
        // route degrades gracefully rather than surfacing a 403 to the client.
        expect(read).toHaveStatusCode(200);
        expect(read.body).toMatchObject({ summary: null, canRead: false });
      }
    );

    apiTest(
      'a user WITHOUT metadata read cannot persist (POST returns created: false)',
      async ({ apiClient, samlAuth, esClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: {
            cluster: [],
            indices: [
              { names: [ENTITIES_ALIAS_INDEX], privileges: ['read'] },
              { names: [LATEST_ENTITY_INDEX], privileges: ['read'] },
            ],
          },
          kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
        });
        const headers = { ...cookieHeader, ...INTERNAL_HEADERS };

        const generatedAt = Date.now();
        const write = await apiClient.post(ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL, {
          headers,
          responseType: 'json',
          body: buildSummaryBody({ generated_at: generatedAt }),
        });
        expect(write).toHaveStatusCode(200);
        expect(write.body).toMatchObject({ created: false });

        // Confirm nothing was written for this timestamp (admin seed remains readable).
        await esClient.indices.refresh({ index: METADATA_DATA_STREAM });
        const adminRead = await apiClient.get(readUrl(TEST_ENTITY_ID, TEST_ENTITY_TYPE), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(adminRead).toHaveStatusCode(200);
        expect(adminRead.body.summary?.generated_at).not.toBe(generatedAt);
      }
    );

    apiTest(
      'a user WITH metadata read sees the persisted summary generated by another user',
      async ({ apiClient, samlAuth, esClient }) => {
        // Isolate to a dedicated entity so this test is self-contained and does not
        // depend on the write order of the other tests (append-only → newest doc wins).
        // User A (admin) generates the summary...
        const seed = await apiClient.post(ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL, {
          headers: adminHeaders,
          responseType: 'json',
          body: { ...buildSummaryBody(), entityId: PARITY_ENTITY_ID },
        });
        expect(seed).toHaveStatusCode(200);

        // The append write uses refresh:false; make the fresh PARITY doc searchable
        // before we read it back (this entity is only written here, so nothing else
        // has triggered a refresh).
        await esClient.indices.refresh({ index: METADATA_DATA_STREAM });

        // ...and we read it back as admin to capture the server-derived author (User A).
        const adminRead = await apiClient.get(readUrl(PARITY_ENTITY_ID, TEST_ENTITY_TYPE), {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(adminRead).toHaveStatusCode(200);
        const generatedByUserA = adminRead.body.summary.generated_by;
        expect(typeof generatedByUserA).toBe('string');

        // User B has metadata read only and did not generate anything.
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: {
            cluster: [],
            indices: [
              { names: [ENTITIES_ALIAS_INDEX], privileges: ['read'] },
              { names: [LATEST_ENTITY_INDEX], privileges: ['read'] },
              { names: [METADATA_DATA_STREAM], privileges: ['read'] },
            ],
          },
          kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
        });
        const headers = { ...cookieHeader, ...INTERNAL_HEADERS };

        const read = await apiClient.get(readUrl(PARITY_ENTITY_ID, TEST_ENTITY_TYPE), {
          headers,
          responseType: 'json',
        });

        expect(read).toHaveStatusCode(200);
        expect(read.body).toMatchObject({ canRead: true });
        // Anchor to User A's author: User B reads back the exact doc User A generated,
        // proving two-user parity rather than just "some doc exists".
        expect(read.body.summary.generated_by).toBe(generatedByUserA);
        expect(typeof read.body.summary.generated_at).toBe('number');
      }
    );
  }
);
