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
  LATEST_INDEX,
  UPDATES_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  clearEntityStoreIndices,
  seedUserEntity,
  triggerMaintainerRun,
} from '../fixtures/helpers';

/**
 * TODO(embedding-resolution): This suite is `.skip()` until BOTH preconditions land:
 *
 *   1. **Flag enabled in Scout's Kibana boot config.**
 *      `xpack.securitySolution.enableExperimental` needs to include
 *      `entityAnalyticsEmbeddingResolutionEmbedOnly`. Currently the default in
 *      `security_solution/common/experimental_features.ts` is `false` and no
 *      Scout config overrides it, so the maintainer is never registered and
 *      `POST /internal/security/entity_store/entity_maintainers/run/embedding-resolution`
 *      404s. Fix when ready: add to the Scout Kibana config alongside the
 *      other `enableExperimental` entries.
 *
 *   2. **A real `_inference/text_embedding/.jina-embeddings-v5-text-small`
 *      endpoint** (1024-dim, cosine) on the target ES. Surveyed the
 *      ship-with-cluster options on 2026-05-20 — none are usable as a
 *      drop-in:
 *        - `.multilingual-e5-small` → 384 dims (wrong dim, breaks the
 *          locked `dense_vector dims=1024` mapping with
 *          `mapper_parsing_exception` on every write).
 *        - `.elser_model_2` / `.elser-2-elasticsearch` → `sparse_embedding`
 *          task_type, not `text_embedding`, not a `dense_vector`.
 *        - No 1024-dim dense text-embedding model ships pre-installed.
 *      The two realistic paths to un-skip:
 *        (a) Provision a real Jina (or equivalent 1024-dim) endpoint in the
 *            Scout target cluster via `esClient.inference.put(...)` in
 *            `beforeAll`, gated on a CI-only API key secret. Highest fidelity,
 *            costs $.
 *        (b) Connect EIS in the Scout cluster (mirrors how customers + dev
 *            machines do it). Zero cost, but requires Scout infra to wire up
 *            the cloud_connect OAuth flow non-interactively.
 *      Validation done in the meantime: the embed-only path is exercised by
 *      69 unit tests in `server/maintainers/embedding_resolution/__tests__/`
 *      with the real `esClient.inference.inference` response shape verified
 *      against the elasticsearch-js typings (and a live call against the dev
 *      cluster's `.jina-embeddings-v5-text-small` endpoint on 2026-05-20).
 *
 *   3. **Phase 3 flag enabled** for the er-13/14/18/15 cases below:
 *      `entityAnalyticsEmbeddingResolutionEnabled` (separate from the Phase 2
 *      embed-only flag). Without this flag the maintainer still embeds but
 *      never writes `resolved_to`, so every Phase 3 case below would time out
 *      on `waitForEitherResolvedToVia(..., 'embedding')`.
 *
 * The body below is the shape we'd ship — close to `automated_resolution.spec.ts`
 * so the conversion from `.skip()` to running is mechanical (flip `.skip` →
 * `.serial`, drop the precondition block).
 */
apiTest.describe.skip(
  'Embedding-resolution integration tests',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, samlAuth }) => {
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

      await esClient.indices.delete({
        index: [LATEST_INDEX, UPDATES_INDEX],
        ignore_unavailable: true,
      });

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(installResponse.statusCode);

      const initResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT,
        {
          headers: internalHeaders,
          responseType: 'json',
          body: {},
        }
      );
      expect([200, 201]).toContain(initResponse.statusCode);
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await esClient.deleteByQuery({
        index: LATEST_ALIAS,
        refresh: true,
        query: { match_all: {} },
        ignore_unavailable: true,
      });
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

    apiTest(
      'embeds an unresolved user entity and stamps embedding_source + embedded_at',
      async ({ apiClient, esClient }) => {
        const entityId = 'embed-1-alice';
        await seedUserEntity(esClient, {
          entityId,
          namespace: 'okta',
          email: 'alice@corp.com',
          userName: 'alice',
          fullName: 'Alice Patterson',
        });

        await triggerMaintainerRun(apiClient, internalHeaders, 'embedding-resolution');

        const embedded = await waitForEmbedding(esClient, entityId);
        expect(embedded.entity.resolution.embedding).toHaveLength(1024);
        expect(typeof embedded.entity.resolution.embedded_at).toBe('string');
        expect(embedded.entity.resolution.embedding_source).toMatch(/^v1:name,full_name,email\|/);
      }
    );

    apiTest(
      'does NOT embed entities that are already resolved',
      async ({ apiClient, esClient }) => {
        const targetId = 'embed-2-target';
        const aliasId = 'embed-2-alias';
        await seedUserEntity(esClient, { entityId: targetId, namespace: 'okta', email: 'b@corp.com' });
        await seedUserEntity(esClient, { entityId: aliasId, namespace: 'entra_id', email: 'b@corp.com' });

        // First let the rules-based resolver link them so aliasId has resolved_to.
        await triggerMaintainerRun(apiClient, internalHeaders, 'automated-resolution');
        await waitForResolvedTo(esClient, aliasId);

        // Then run the embedding maintainer. The alias should not gain an embedding.
        await triggerMaintainerRun(apiClient, internalHeaders, 'embedding-resolution');
        await waitForEmbedding(esClient, targetId);

        const aliasDoc = await getEntity(esClient, aliasId);
        expect(aliasDoc.entity.resolution?.embedding).toBeUndefined();
      }
    );

    /**
     * Phase 3 — auto-link cases that the rules engine cannot resolve. These
     * are the documented `er-v2-9.4-test-data.md` gaps (#13/#14/#18) that
     * Phase 3's kNN + threshold pipeline closes. Each test:
     *   1. Seeds the two-or-more variants of one fixture.
     *   2. Runs the rules engine FIRST (must leave them split — that's the gap).
     *   3. Runs the embedding maintainer (must link them via embeddings).
     *   4. Asserts BOTH `resolved_to` AND `resolved_by === 'embedding'` so we
     *      never accidentally pass on a rules-engine link.
     *
     * Pre-req: Phase 3 flag (`entityAnalyticsEmbeddingResolutionEnabled`) is
     * enabled in the Scout Kibana boot config. The whole suite is `.skip()`'d
     * above until that AND a real 1024-dim Jina endpoint land — see the
     * top-of-file TODO.
     */
    apiTest(
      'er-13: case-mismatched emails (Alice@Corp.com vs alice@corp.com) are linked via embedding',
      async ({ apiClient, esClient }) => {
        await seedUserEntity(esClient, {
          entityId: 'er-13-okta',
          namespace: 'okta',
          email: 'Alice@Corp.com',
          userName: 'alice',
        });
        await seedUserEntity(esClient, {
          entityId: 'er-13-entra',
          namespace: 'entra_id',
          email: 'alice@corp.com',
          userName: 'alice',
        });

        // Rules engine: must NOT link (case-sensitive `keyword` term query).
        await triggerMaintainerRun(apiClient, internalHeaders, 'automated-resolution');
        await sleep(2_000);
        expect((await getEntity(esClient, 'er-13-entra')).entity?.relationships?.resolution?.resolved_to).toBeUndefined();

        // Embedding maintainer: links them. Either entity may be picked as
        // target depending on which embeds first; assert "any link with
        // resolved_by='embedding' between the two".
        await triggerMaintainerRun(apiClient, internalHeaders, 'embedding-resolution');
        const linkedId = await waitForEitherResolvedToVia(
          esClient,
          ['er-13-okta', 'er-13-entra'],
          'embedding'
        );
        expect(['er-13-okta', 'er-13-entra']).toContain(linkedId);
      }
    );

    apiTest(
      'er-14: plus-aliased emails (bob+work@… vs bob@…) are linked via embedding',
      async ({ apiClient, esClient }) => {
        await seedUserEntity(esClient, {
          entityId: 'er-14-okta',
          namespace: 'okta',
          email: 'bob+work@corp.com',
          userName: 'bob',
        });
        await seedUserEntity(esClient, {
          entityId: 'er-14-entra',
          namespace: 'entra_id',
          email: 'bob@corp.com',
          userName: 'bob',
        });

        await triggerMaintainerRun(apiClient, internalHeaders, 'automated-resolution');
        await sleep(2_000);
        expect((await getEntity(esClient, 'er-14-entra')).entity?.relationships?.resolution?.resolved_to).toBeUndefined();

        await triggerMaintainerRun(apiClient, internalHeaders, 'embedding-resolution');
        const linkedId = await waitForEitherResolvedToVia(
          esClient,
          ['er-14-okta', 'er-14-entra'],
          'embedding'
        );
        expect(['er-14-okta', 'er-14-entra']).toContain(linkedId);
      }
    );

    apiTest(
      'er-18: name-only entities (no email, security-ml#417) are linked via embedding',
      async ({ apiClient, esClient }) => {
        await seedUserEntity(esClient, {
          entityId: 'er-18-a',
          namespace: 'ad',
          userName: 'npatterson',
          fullName: 'Nora Patterson',
        });
        await seedUserEntity(esClient, {
          entityId: 'er-18-b',
          namespace: 'okta',
          userName: 'nora.patterson',
          fullName: 'Nora Patterson',
        });

        await triggerMaintainerRun(apiClient, internalHeaders, 'automated-resolution');
        await sleep(2_000);
        // Rules engine is name-blind — both stay unresolved (this is the gap).
        expect((await getEntity(esClient, 'er-18-a')).entity?.relationships?.resolution?.resolved_to).toBeUndefined();
        expect((await getEntity(esClient, 'er-18-b')).entity?.relationships?.resolution?.resolved_to).toBeUndefined();

        await triggerMaintainerRun(apiClient, internalHeaders, 'embedding-resolution');
        const linkedId = await waitForEitherResolvedToVia(
          esClient,
          ['er-18-a', 'er-18-b'],
          'embedding'
        );
        expect(['er-18-a', 'er-18-b']).toContain(linkedId);
      }
    );

    apiTest(
      'er-15: role-account false positive — three svc accounts + one admin sharing noreply@… stay split',
      async ({ apiClient, esClient }) => {
        const ids = ['er-15-svc-1', 'er-15-svc-2', 'er-15-svc-3', 'er-15-admin'];
        for (const id of ids) {
          await seedUserEntity(esClient, {
            entityId: id,
            namespace: id === 'er-15-admin' ? 'entra_id' : 'okta',
            email: 'noreply@corp.com',
            userName: id,
          });
        }

        await triggerMaintainerRun(apiClient, internalHeaders, 'embedding-resolution');
        // Give the maintainer a generous window to finish — 4 entities to
        // process, plus the no-op for role-account skip.
        await sleep(5_000);
        await esClient.indices.refresh({ index: LATEST_ALIAS });

        for (const id of ids) {
          const doc = await getEntity(esClient, id);
          const resolvedTo = doc.entity?.relationships?.resolution?.resolved_to;
          const resolvedBy = doc.entity?.relationships?.resolution?.resolved_by;
          expect(
            resolvedTo,
            `er-15 entity '${id}' must NOT be linked — role-account guard should have kept it split (got resolved_to=${resolvedTo}, resolved_by=${resolvedBy})`
          ).toBeUndefined();
        }
      }
    );
  }
);

const EMBEDDING_PATH = 'entity.resolution.embedding';
const RESOLVED_TO_PATH = 'entity.relationships.resolution.resolved_to';

async function waitForEmbedding(
  esClient: Parameters<typeof seedUserEntity>[0],
  entityId: string,
  timeoutMs = 30_000
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index: LATEST_ALIAS });
    const response = await esClient.search({
      index: LATEST_ALIAS,
      query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
      size: 1,
    });
    const source = response.hits.hits[0]?._source as any;
    if (source) {
      const flat = source[EMBEDDING_PATH];
      const nested = source.entity?.resolution?.embedding;
      if (flat || nested) {
        return source;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `Timed out waiting for entity '${entityId}' to be embedded after ${timeoutMs}ms`
  );
}

async function waitForResolvedTo(
  esClient: Parameters<typeof seedUserEntity>[0],
  entityId: string,
  timeoutMs = 30_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index: LATEST_ALIAS });
    const response = await esClient.search({
      index: LATEST_ALIAS,
      query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
      size: 1,
    });
    const source = response.hits.hits[0]?._source as any;
    if (
      source &&
      (source[RESOLVED_TO_PATH] || source.entity?.relationships?.resolution?.resolved_to)
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for entity '${entityId}' to gain resolved_to`);
}

async function getEntity(
  esClient: Parameters<typeof seedUserEntity>[0],
  entityId: string
): Promise<any> {
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  const response = await esClient.search({
    index: LATEST_ALIAS,
    query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
    size: 1,
  });
  return response.hits.hits[0]?._source ?? {};
}

const RESOLVED_BY_PATH = 'entity.relationships.resolution.resolved_by';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Phase 3 helper. Waits until the given `entityId` has BOTH `resolved_to`
 * (any value) AND `resolved_by === expectedSourceTag`. The source-tag check
 * matters because the rules engine and the embedding maintainer both write to
 * the same `resolved_to` field; without it, a Phase 3 test could falsely pass
 * on a rules-engine link that just happened to land first.
 *
 * Mirrors `waitForResolvedTo` (single field, any source) — kept side-by-side
 * so we don't have to retrofit the existing tests.
 */
async function waitForResolvedToVia(
  esClient: Parameters<typeof seedUserEntity>[0],
  entityId: string,
  expectedSourceTag: 'embedding' | 'rule' | 'csv' | 'manual',
  timeoutMs = 30_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index: LATEST_ALIAS });
    const response = await esClient.search({
      index: LATEST_ALIAS,
      query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
      size: 1,
    });
    const source = response.hits.hits[0]?._source as any;
    if (source) {
      const resolvedTo =
        source[RESOLVED_TO_PATH] ?? source.entity?.relationships?.resolution?.resolved_to;
      const resolvedBy =
        source[RESOLVED_BY_PATH] ?? source.entity?.relationships?.resolution?.resolved_by;
      if (resolvedTo && resolvedBy === expectedSourceTag) {
        return;
      }
    }
    await sleep(200);
  }
  throw new Error(
    `Timed out waiting for entity '${entityId}' to gain resolved_to with resolved_by='${expectedSourceTag}'`
  );
}

/**
 * Same as {@link waitForResolvedToVia} but waits for ANY of the given entity
 * IDs to satisfy the predicate (since either side of a pair can be the alias
 * — `automated_resolution/run.ts:selectTarget` plus the embedding step's
 * "candidate becomes target" branch can yield either as the alias). Returns
 * the entity id that became the alias so callers can assert on it.
 */
async function waitForEitherResolvedToVia(
  esClient: Parameters<typeof seedUserEntity>[0],
  entityIds: string[],
  expectedSourceTag: 'embedding' | 'rule' | 'csv' | 'manual',
  timeoutMs = 30_000
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index: LATEST_ALIAS });
    for (const id of entityIds) {
      const response = await esClient.search({
        index: LATEST_ALIAS,
        query: { bool: { filter: [{ term: { 'entity.id': id } }] } },
        size: 1,
      });
      const source = response.hits.hits[0]?._source as any;
      const resolvedTo =
        source?.[RESOLVED_TO_PATH] ?? source?.entity?.relationships?.resolution?.resolved_to;
      const resolvedBy =
        source?.[RESOLVED_BY_PATH] ?? source?.entity?.relationships?.resolution?.resolved_by;
      if (resolvedTo && resolvedBy === expectedSourceTag) {
        return id;
      }
    }
    await sleep(200);
  }
  throw new Error(
    `Timed out waiting for any of [${entityIds.join(', ')}] to gain resolved_to with resolved_by='${expectedSourceTag}'`
  );
}

// Re-export the single-entity helper so future tests can use it without
// importing `waitForEitherResolvedToVia` and a one-element array.
export { waitForResolvedToVia };
