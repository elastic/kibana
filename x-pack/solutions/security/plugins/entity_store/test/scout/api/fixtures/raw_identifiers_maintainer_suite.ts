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
} from './constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  clearEntityStoreIndices,
  seedHostEntity,
  triggerMaintainerRun,
  waitForRelationshipIds,
  assertNoRelationshipId,
} from './helpers';

/**
 * Config describing one raw_identifiers-based relationship maintainer under test.
 * Generic over the relationship key so the same suite covers `administers`,
 * `depends_on`, `supervises`, and any future maintainer that resolves
 * `entity.relationships.<key>.raw_identifiers.host.name` into `<key>.ids`.
 */
export interface RawIdentifiersMaintainerSuiteConfig {
  /** Maintainer id used by the run route, e.g. 'administers'. */
  maintainerId: string;
  /** Relationship key written under entity.relationships.<key>, e.g. 'administers'. */
  relationshipKey: string;
  /** Short prefix used to namespace the seeded entity ids so suites don't collide. */
  entityPrefix: string;
}

/**
 * Shared end-to-end suite for a raw_identifiers-based relationship maintainer's
 * incremental watermark (entity.lifecycle.last_seen).
 *
 * The maintainer persists a `lastProcessedTimestamp` after each run and, on the
 * next run, only processes entities whose `entity.lifecycle.last_seen` is
 * strictly greater than that watermark. These tests prove both sides of that
 * gate: an entity newer than the watermark is resolved, and an entity at/older
 * than the watermark is skipped.
 *
 * Invoke from a thin spec file:
 *
 *   registerRawIdentifiersMaintainerSuite({
 *     maintainerId: 'administers',
 *     relationshipKey: 'administers',
 *     entityPrefix: 'adm',
 *   });
 */
export const registerRawIdentifiersMaintainerSuite = (
  config: RawIdentifiersMaintainerSuiteConfig
): void => {
  const { maintainerId, relationshipKey, entityPrefix } = config;
  const domain = 'acmecrm.com';
  const actorId = (suffix: string) => `host:${entityPrefix}-${suffix}.${domain}`;
  const targetFqdn = (suffix: string) => `${entityPrefix}-${suffix}-target.${domain}`;
  const targetId = (suffix: string) => `host:${targetFqdn(suffix)}`;

  apiTest.describe(
    `Entity Store ${maintainerId} maintainer (raw_identifiers)`,
    { tag: ENTITY_STORE_TAGS },
    () => {
      let defaultHeaders: Record<string, string>;
      let internalHeaders: Record<string, string>;

      apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, samlAuth }) => {
        const credentials = await samlAuth.asInteractiveUser('admin');
        defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
        internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

        await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

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
          { headers: internalHeaders, responseType: 'json', body: {} }
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
        `resolves ${relationshipKey}.ids on the first run (no watermark — full scan)`,
        async ({ apiClient, esClient }) => {
          const actor = actorId('fresh');
          const tFqdn = targetFqdn('fresh');
          const target = targetId('fresh');

          // Target host exists as its own entity (so the EUID resolves to a real entity).
          await seedHostEntity(esClient, { entityId: target, hostName: tFqdn });

          // Actor host carries the relationship raw_identifier. On the first run the
          // watermark (lastProcessedTimestamp) is undefined, so the maintainer does a
          // full scan and picks up this actor regardless of its last_seen.
          await seedHostEntity(esClient, {
            entityId: actor,
            hostName: `${entityPrefix}-fresh.${domain}`,
            relationship: { key: relationshipKey, hostNames: [tFqdn] },
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId);

          await waitForRelationshipIds(esClient, relationshipKey, actor, target);
        }
      );

      apiTest(
        'skips an actor whose last_seen is older than the watermark, resolves a newer one',
        async ({ apiClient, esClient }) => {
          // Step 1 — priming run. The maintainer's watermark (lastProcessedTimestamp)
          // is undefined until a run completes, so we MUST run once first to set it.
          // This run is synchronous (sync: true) so the watermark is persisted to the
          // Task Manager task document BEFORE we proceed — the default async run
          // returns before the state is written and would leave the watermark unset
          // when we seed the stale/fresh actors below.
          const primingActor = actorId('prime');
          const primingTargetFqdn = targetFqdn('prime');
          const primingTarget = targetId('prime');

          await seedHostEntity(esClient, {
            entityId: primingTarget,
            hostName: primingTargetFqdn,
          });
          await seedHostEntity(esClient, {
            entityId: primingActor,
            hostName: `${entityPrefix}-prime.${domain}`,
            relationship: { key: relationshipKey, hostNames: [primingTargetFqdn] },
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });
          await waitForRelationshipIds(esClient, relationshipKey, primingActor, primingTarget);

          // The watermark is now ~the priming run time. Seed two more actors:
          //  - staleActor:  last_seen in the PAST   → at/older than watermark → skipped
          //  - freshActor:  last_seen in the FUTURE → newer than watermark   → resolved
          const staleTargetFqdn = targetFqdn('stale');
          const staleTarget = targetId('stale');
          const staleActor = actorId('stale');

          const freshTargetFqdn = targetFqdn('fresh2');
          const freshTarget = targetId('fresh2');
          const freshActor = actorId('fresh2');

          const pastTs = new Date(Date.now() - 3_600_000).toISOString();
          const futureTs = new Date(Date.now() + 3_600_000).toISOString();

          // Targets exist regardless of timestamp (they are not actors).
          await seedHostEntity(esClient, { entityId: staleTarget, hostName: staleTargetFqdn });
          await seedHostEntity(esClient, { entityId: freshTarget, hostName: freshTargetFqdn });

          await seedHostEntity(esClient, {
            entityId: staleActor,
            hostName: `${entityPrefix}-stale.${domain}`,
            relationship: { key: relationshipKey, hostNames: [staleTargetFqdn] },
            lastSeen: pastTs,
            firstSeen: pastTs,
          });
          await seedHostEntity(esClient, {
            entityId: freshActor,
            hostName: `${entityPrefix}-fresh2.${domain}`,
            relationship: { key: relationshipKey, hostNames: [freshTargetFqdn] },
            lastSeen: futureTs,
            firstSeen: futureTs,
          });

          // Second run, synchronous: against the watermark set by the priming run,
          // it should process only freshActor (last_seen > watermark) and skip
          // staleActor (last_seen <= watermark). Sync guarantees the run completes
          // before we assert.
          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          // Fresh actor (last_seen > watermark) is resolved.
          await waitForRelationshipIds(esClient, relationshipKey, freshActor, freshTarget);

          // Stale actor (last_seen <= watermark) is NOT fetched, so its
          // <relationshipKey>.ids never gains the target.
          await assertNoRelationshipId(esClient, relationshipKey, staleActor, staleTarget);
        }
      );
    }
  );
};
