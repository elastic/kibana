/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  getEntitiesAlias,
  ENTITY_LATEST,
  getLatestEntityIndexPattern,
  getEntityMetadataAlias,
  getMetadataEntityIndexPattern,
} from '@kbn/entity-store/common';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'Kibana',
  'elastic-api-version': '1',
  'Content-Type': 'application/json;charset=UTF-8',
};

const ENTITIES_ALIAS_INDEX = getEntitiesAlias(ENTITY_LATEST, 'default');
const LATEST_ENTITY_INDEX = getLatestEntityIndexPattern('default');
const METADATA_ALIAS_INDEX = getEntityMetadataAlias('default');
const METADATA_INDEX_PATTERN = getMetadataEntityIndexPattern('default');

const TEST_ENTITY_ID = 'user:scout-ai-summary@test';
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
    recommendedActions: ['Investigate recent logins'],
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
 * Proves the access-control model documented in Issue 2:
 *  - generation is gated on FEATURE-level perms (securitySolution + entity-analytics)
 *    and an Enterprise license — not on the user's own metadata index write privilege.
 *  - persistence goes via `asInternalUser`, so a user WITHOUT metadata write can still
 *    generate + persist.
 *  - the read is gated on the user's OWN metadata read privilege: no read → on-demand
 *    fallback (`canRead: false`); with read → the persisted summary is returned.
 */
apiTest.describe(
  'Entity AI Summary permissions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      const admin = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...admin.cookieHeader, ...INTERNAL_HEADERS };

      // Seed one persisted summary via the admin so the datastream exists for the
      // gated-read assertions below.
      const seed = await apiClient.post(ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL, {
        headers: adminHeaders,
        responseType: 'json',
        body: buildSummaryBody(),
      });
      expect(seed).toHaveStatusCode(200);
      expect(seed.body).toMatchObject({ created: true });
    });

    // Append-only datastream: clean up this entity's docs so state doesn't leak
    // across runs. Use `esClient` to sidestep per-user privileges on teardown.
    apiTest.afterAll(async ({ esClient }) => {
      await esClient
        .deleteByQuery({
          index: METADATA_ALIAS_INDEX,
          query: { term: { 'entity.id': TEST_ENTITY_ID } },
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
            recommendedActions: ['Investigate recent logins'],
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
              { names: [METADATA_ALIAS_INDEX], privileges: ['read'] },
              { names: [METADATA_INDEX_PATTERN], privileges: ['read'] },
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
      'a user WITH metadata read sees the persisted summary generated by another user',
      async ({ apiClient, samlAuth }) => {
        // Two-user parity: this user only reads; the summary was generated by admin.
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: {
            cluster: [],
            indices: [
              { names: [ENTITIES_ALIAS_INDEX], privileges: ['read'] },
              { names: [LATEST_ENTITY_INDEX], privileges: ['read'] },
              { names: [METADATA_ALIAS_INDEX], privileges: ['read'] },
              { names: [METADATA_INDEX_PATTERN], privileges: ['read'] },
            ],
          },
          kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
        });
        const headers = { ...cookieHeader, ...INTERNAL_HEADERS };

        const read = await apiClient.get(readUrl(TEST_ENTITY_ID, TEST_ENTITY_TYPE), {
          headers,
          responseType: 'json',
        });

        expect(read).toHaveStatusCode(200);
        expect(read.body).toMatchObject({ canRead: true });
        // generated_by / generated_at flow from the metadata doc so User B sees User A's generation.
        expect(typeof read.body.summary.generated_by).toBe('string');
        expect(typeof read.body.summary.generated_at).toBe('number');
      }
    );
  }
);
