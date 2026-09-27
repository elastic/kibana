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
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  seedHostEntity,
  seedUserEntity,
  triggerMaintainerRun,
  waitForRelationshipIds,
  waitForEntityStoreRunning,
  assertNoRelationshipId,
  getRelationshipIds,
} from '../../fixtures/maintainers/helpers';

/**
 * End-to-end suite for the `administers` maintainer, which resolves
 * `entity.relationships.administers.raw_identifiers.host.name` into
 * `administers.ids` as namespace-less `host:<name>` EUIDs.
 *
 * The actor may be a host OR a user — AD `managedObjects` applies to both, and
 * the engine derives the actor type from its `entity.id` prefix. Most tests seed
 * a host actor; one covers the user → host path.
 *
 * These tests also prove both sides of the incremental watermark gate: the
 * maintainer persists a `lastProcessedTimestamp` after each run and, on the next
 * run, only processes entities whose `entity.lifecycle.last_seen` is strictly
 * greater than it.
 */
const MAINTAINER_ID = 'administers';
const RELATIONSHIP_KEY = 'administers';
const ENTITY_PREFIX = 'adm';
/** The maintainer filters on this entity.source; a negative test asserts others are skipped. */
const REQUIRED_ENTITY_SOURCE = 'entityanalytics_ad';
/** IDP namespace for the user actor that administers a host target. */
const USER_ACTOR_NAMESPACE = 'active_directory';

const domain = 'acmecrm.com';
const actorId = (suffix: string) => `host:${ENTITY_PREFIX}-${suffix}.${domain}`;
const targetFqdn = (suffix: string) => `${ENTITY_PREFIX}-${suffix}-target.${domain}`;
const targetId = (suffix: string) => `host:${targetFqdn(suffix)}`;

apiTest.describe(
  `Entity Store ${MAINTAINER_ID} maintainer (raw_identifiers)`,
  { tag: ENTITY_STORE_TAGS },
  () => {
    // Each test may issue multiple synchronous maintainer runs plus polling loops.
    // The default 60s Playwright timeout is too tight; use the same 3-minute
    // ceiling as Playwright's global setup projects.
    apiTest.setTimeout(180_000);

    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
      // `admin` is required: the install route enforces `securitySolution` +
      // `entity-analytics` Kibana privileges that lower roles (e.g. platform_engineer)
      // do not hold.
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      // Uninstall first: this suite runs late in the config, so a previous suite's
      // store is typically still installed. Installing over it leaves the engines
      // reconciling against indices this hook is about to delete, which is what
      // pushed provisioning past the 60s hook budget on loaded CI agents.
      await apiClient
        .post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        })
        .catch(() => {});

      // Covers all three index families; deleting only latest+updates would leak
      // stale history snapshots from ~100 preceding tests into this install.
      await clearEntityStoreIndices(esClient);

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(installResponse.statusCode);

      // Wait for all engine components to finish provisioning before seeding —
      // the `running` status flips before the latest alias is ready. Note the poll
      // cannot outlast Playwright's 60s hook budget (`apiTest.setTimeout` applies
      // to tests, not hooks), so this hook has to stay cheap rather than patient.
      await waitForEntityStoreRunning(apiClient, defaultHeaders);

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
      `resolves ${RELATIONSHIP_KEY}.ids for a freshly-seen actor`,
      async ({ apiClient, esClient }) => {
        const actor = actorId('fresh');
        const tFqdn = targetFqdn('fresh');
        const target = targetId('fresh');

        // The maintainer task auto-runs once on registration (ensureScheduled with
        // an interval schedules the first run ~immediately), persisting a watermark
        // before this test seeds anything. So we cannot rely on a pristine "no
        // watermark" state: seed the actor with a FUTURE last_seen so it is always
        // past whatever watermark the startup run left, and trigger synchronously
        // so the run completes before we poll.
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedHostEntity(esClient, { entityId: target, hostName: tFqdn });
        await seedHostEntity(esClient, {
          entityId: actor,
          hostName: `${ENTITY_PREFIX}-fresh.${domain}`,
          relationship: { key: RELATIONSHIP_KEY, hostNames: [tFqdn] },
          entitySource: REQUIRED_ENTITY_SOURCE,
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, actor, target);
      }
    );

    apiTest(
      'skips an actor whose last_seen is older than the watermark, resolves a newer one',
      async ({ apiClient, esClient }) => {
        // Priming run: sets the watermark before we seed stale/fresh actors.
        // Must be synchronous so the watermark is persisted before we proceed.
        const primingActor = actorId('prime');
        const primingTargetFqdn = targetFqdn('prime');
        const primingTarget = targetId('prime');

        // Seed the priming actor with a FUTURE last_seen so it stays above any
        // watermark a prior/concurrent auto-run may have persisted — the same
        // mitigation every other resolvable actor in this suite already uses.
        // Without it, the actor defaults to seed-time "now" and can fall below a
        // run-start watermark, permanently skipping it (waitForRelationshipIds
        // then times out).
        const primingFutureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedHostEntity(esClient, { entityId: primingTarget, hostName: primingTargetFqdn });
        await seedHostEntity(esClient, {
          entityId: primingActor,
          hostName: `${ENTITY_PREFIX}-prime.${domain}`,
          relationship: { key: RELATIONSHIP_KEY, hostNames: [primingTargetFqdn] },
          entitySource: REQUIRED_ENTITY_SOURCE,
          lastSeen: primingFutureTs,
          firstSeen: primingFutureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, primingActor, primingTarget);

        // staleActor: last_seen in the past → older than the priming run's start watermark → skipped
        // freshActor: last_seen after the priming run started → newer than watermark → resolved
        const staleTargetFqdn = targetFqdn('stale');
        const staleTarget = targetId('stale');
        const staleActor = actorId('stale');

        const freshTargetFqdn = targetFqdn('fresh2');
        const freshTarget = targetId('fresh2');
        const freshActor = actorId('fresh2');

        const pastTs = new Date(Date.now() - 3_600_000).toISOString();
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedHostEntity(esClient, { entityId: staleTarget, hostName: staleTargetFqdn });
        await seedHostEntity(esClient, { entityId: freshTarget, hostName: freshTargetFqdn });

        await seedHostEntity(esClient, {
          entityId: staleActor,
          hostName: `${ENTITY_PREFIX}-stale.${domain}`,
          relationship: { key: RELATIONSHIP_KEY, hostNames: [staleTargetFqdn] },
          lastSeen: pastTs,
          firstSeen: pastTs,
          entitySource: REQUIRED_ENTITY_SOURCE,
        });
        await seedHostEntity(esClient, {
          entityId: freshActor,
          hostName: `${ENTITY_PREFIX}-fresh2.${domain}`,
          relationship: { key: RELATIONSHIP_KEY, hostNames: [freshTargetFqdn] },
          lastSeen: futureTs,
          firstSeen: futureTs,
          entitySource: REQUIRED_ENTITY_SOURCE,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, freshActor, freshTarget);
        await assertNoRelationshipId(esClient, RELATIONSHIP_KEY, staleActor, staleTarget);
      }
    );

    apiTest(
      `writes only targets that exist as entities, drops phantom raw_identifiers`,
      async ({ apiClient, esClient }) => {
        const actor = actorId('multi');
        const existingTargetFqdn = targetFqdn('multi-real');
        const existingTarget = targetId('multi-real');
        const phantomFqdn = `${ENTITY_PREFIX}-multi-phantom.${domain}`;
        // phantomTarget is intentionally NOT seeded — it has no entity document.

        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        // Seed the real target entity and the actor referencing both targets.
        await seedHostEntity(esClient, {
          entityId: existingTarget,
          hostName: existingTargetFqdn,
        });
        await seedHostEntity(esClient, {
          entityId: actor,
          hostName: `${ENTITY_PREFIX}-multi.${domain}`,
          relationship: {
            key: RELATIONSHIP_KEY,
            hostNames: [existingTargetFqdn, phantomFqdn],
          },
          entitySource: REQUIRED_ENTITY_SOURCE,
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // Wait until the real target appears (sync run has settled, this absorbs refresh lag).
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, actor, existingTarget);

        // Read back the full ids array and assert it contains exactly the real target —
        // the phantom FQDN must never appear because it has no entity document.
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, actor);
        const phantomEuid = `host:${phantomFqdn}`;
        expect(ids).toContain(existingTarget);
        expect(ids).not.toContain(phantomEuid);
      }
    );

    apiTest(
      `skips an actor whose entity.source is not '${REQUIRED_ENTITY_SOURCE}'`,
      async ({ apiClient, esClient }) => {
        const tFqdn = targetFqdn('src');
        const target = targetId('src');
        const wrongSourceActor = actorId('src-wrong');

        await seedHostEntity(esClient, { entityId: target, hostName: tFqdn });
        // Actor has the correct raw_identifiers but entity.source from a different
        // integration — the maintainer's entity.source filter must exclude it.
        await seedHostEntity(esClient, {
          entityId: wrongSourceActor,
          hostName: `${ENTITY_PREFIX}-src-wrong.${domain}`,
          relationship: { key: RELATIONSHIP_KEY, hostNames: [tFqdn] },
          entitySource: 'elastic_defend',
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await assertNoRelationshipId(esClient, RELATIONSHIP_KEY, wrongSourceActor, target);
      }
    );

    apiTest(
      `resolves ${RELATIONSHIP_KEY}.ids for a USER actor pointing at a host target (user → host)`,
      async ({ apiClient, esClient }) => {
        const tFqdn = targetFqdn('user-actor');
        const target = targetId('user-actor');
        // The user actor's EUID is namespace-suffixed; the host TARGET it
        // resolves to is namespace-less (`host:<fqdn>`), proving the engine
        // derives the actor type from its entity.id prefix and resolves a
        // host target regardless of actor type.
        const userActor = `user:${ENTITY_PREFIX}-admin@${domain}@${USER_ACTOR_NAMESPACE}`;

        await seedHostEntity(esClient, { entityId: target, hostName: tFqdn });
        await seedUserEntity(esClient, {
          entityId: userActor,
          namespace: USER_ACTOR_NAMESPACE,
          email: `${ENTITY_PREFIX}-admin@${domain}`,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, hostNames: [tFqdn] },
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, userActor, target);
      }
    );
  }
);
