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
  getRelationshipIds,
  seedUserEntity,
  triggerMaintainerRun,
  waitForRelationshipIds,
  waitForEntityStoreRunning,
  assertNoRelationshipId,
} from '../../fixtures/maintainers/helpers';

/**
 * End-to-end suite for the `supervises` maintainer's raw_identifiers path
 * (user → user), exercised through the Okta source.
 *
 * Unlike the host-target `administers` suite, this maintainer unions all three
 * raw_identifiers fields (user.email, user.id, user.name) into a user EUID with
 * the IDP namespace suffix (`user:<value>@<ns>`), with VALUES() deduplicating
 * identical EUIDs within each actor group. Both actor and target are user
 * entities, so this suite seeds user entities (not hosts) and asserts the
 * entity.lifecycle.last_seen watermark gate end-to-end.
 *
 * The maintainer supports Okta and Entra ID by the same mechanism, differing
 * only in entity.source and namespace suffix; Entra ID is covered by the
 * unit/snapshot tests in configs.test.ts. Workday's log-inverted source has its
 * own suite in workday_supervises_maintainer.spec.ts.
 */
const MAINTAINER_ID = 'supervises';
const RELATIONSHIP_KEY = 'supervises';
const ENTITY_PREFIX = 'sup';
/** IDP namespace suffix on the user EUID and the seeded entity.namespace. */
const NAMESPACE = 'okta';
/**
 * The maintainer matches entity.source against both the bare integration name
 * and the <integration>.user dataset; the bare form is seeded here.
 */
const REQUIRED_ENTITY_SOURCE = 'entityanalytics_okta';

const domain = 'acmecrm.com';
const targetEmail = (suffix: string) => `${ENTITY_PREFIX}-${suffix}-mgr@${domain}`;
const userId = (email: string) => `user:${email}@${NAMESPACE}`;
const actorEmail = (suffix: string) => `${ENTITY_PREFIX}-${suffix}@${domain}`;

apiTest.describe(
  `Entity Store ${MAINTAINER_ID} maintainer (raw_identifiers, user → user)`,
  { tag: ENTITY_STORE_TAGS },
  () => {
    // Each test may issue multiple synchronous maintainer runs plus polling loops.
    // The default 60s Playwright timeout is too tight; use the same 3-minute
    // ceiling as Playwright's global setup projects.
    apiTest.setTimeout(180_000);

    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      await clearEntityStoreIndices(esClient);

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(installResponse.statusCode);

      // Wait for all engine components to finish provisioning before seeding —
      // the `running` status flips before the latest alias is ready. The explicit
      // timeout matters: `apiTest.setTimeout` above applies to tests, not hooks,
      // so this poll must outlast Playwright's 60s hook default or provisioning
      // four engines on a loaded CI agent surfaces as an opaque hook timeout.
      await waitForEntityStoreRunning(apiClient, defaultHeaders, 150_000);

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
        const tEmail = targetEmail('fresh');
        const target = userId(tEmail);
        const aEmail = actorEmail('fresh');
        const actor = userId(aEmail);

        // The maintainer task auto-runs once on registration (ensureScheduled with
        // an interval schedules the first run ~immediately), persisting a watermark
        // before this test seeds anything. So we cannot rely on a pristine "no
        // watermark" state: seed the actor with a FUTURE last_seen so it is always
        // past whatever watermark the startup run left, and trigger synchronously
        // so the run completes before we poll.
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, { entityId: target, namespace: NAMESPACE, email: tEmail });
        await seedUserEntity(esClient, {
          entityId: actor,
          namespace: NAMESPACE,
          email: aEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userEmails: [tEmail] },
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
        const primingTargetEmail = targetEmail('prime');
        const primingTarget = userId(primingTargetEmail);
        const primingActorEmail = actorEmail('prime');
        const primingActor = userId(primingActorEmail);

        // Seed the priming actor with a FUTURE last_seen so it stays above any
        // watermark a prior/concurrent auto-run may have persisted — the same
        // mitigation every other resolvable actor in this suite already uses.
        // Without it, the actor defaults to seed-time "now" and can fall below a
        // run-start watermark, permanently skipping it (waitForRelationshipIds
        // then times out).
        const primingFutureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, {
          entityId: primingTarget,
          namespace: NAMESPACE,
          email: primingTargetEmail,
        });
        await seedUserEntity(esClient, {
          entityId: primingActor,
          namespace: NAMESPACE,
          email: primingActorEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userEmails: [primingTargetEmail] },
          lastSeen: primingFutureTs,
          firstSeen: primingFutureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, primingActor, primingTarget);

        const staleTargetEmail = targetEmail('stale');
        const staleTarget = userId(staleTargetEmail);
        const staleActorEmail = actorEmail('stale');
        const staleActor = userId(staleActorEmail);

        const freshTargetEmail = targetEmail('fresh2');
        const freshTarget = userId(freshTargetEmail);
        const freshActorEmail = actorEmail('fresh2');
        const freshActor = userId(freshActorEmail);

        const pastTs = new Date(Date.now() - 3_600_000).toISOString();
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, {
          entityId: staleTarget,
          namespace: NAMESPACE,
          email: staleTargetEmail,
        });
        await seedUserEntity(esClient, {
          entityId: freshTarget,
          namespace: NAMESPACE,
          email: freshTargetEmail,
        });

        await seedUserEntity(esClient, {
          entityId: staleActor,
          namespace: NAMESPACE,
          email: staleActorEmail,
          lastSeen: pastTs,
          firstSeen: pastTs,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userEmails: [staleTargetEmail] },
        });
        await seedUserEntity(esClient, {
          entityId: freshActor,
          namespace: NAMESPACE,
          email: freshActorEmail,
          lastSeen: futureTs,
          firstSeen: futureTs,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userEmails: [freshTargetEmail] },
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, freshActor, freshTarget);
        await assertNoRelationshipId(esClient, RELATIONSHIP_KEY, staleActor, staleTarget);
      }
    );

    apiTest(
      `deduplicates ${RELATIONSHIP_KEY}.ids when the same raw value appears in multiple identifier fields`,
      async ({ apiClient, esClient }) => {
        // Scenario: actor has two direct reports. Each report's raw identifiers
        // are stored across all three fields. user.name duplicates user.email
        // (Okta login == email), so after MV_APPEND + MV_EXPAND we get 6 candidate
        // EUIDs — VALUES() must collapse that to 4 unique ones (2 from email/name
        // deduplicated + 2 from id).
        const emailA = targetEmail('dup-a');
        const emailB = targetEmail('dup-b');
        const rawIdA = `okta-id-${ENTITY_PREFIX}-dup-a`;
        const rawIdB = `okta-id-${ENTITY_PREFIX}-dup-b`;

        const targetFromEmailA = userId(emailA);
        const targetFromEmailB = userId(emailB);
        const targetFromIdA = `user:${rawIdA}@${NAMESPACE}`;
        const targetFromIdB = `user:${rawIdB}@${NAMESPACE}`;

        const aEmail = actorEmail('dup');
        const actor = userId(aEmail);
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        // Seed target entities so the maintainer can resolve them.
        await seedUserEntity(esClient, {
          entityId: targetFromEmailA,
          namespace: NAMESPACE,
          email: emailA,
        });
        await seedUserEntity(esClient, {
          entityId: targetFromEmailB,
          namespace: NAMESPACE,
          email: emailB,
        });
        await seedUserEntity(esClient, {
          entityId: targetFromIdA,
          namespace: NAMESPACE,
          email: emailA,
        });
        await seedUserEntity(esClient, {
          entityId: targetFromIdB,
          namespace: NAMESPACE,
          email: emailB,
        });

        // Actor: all three raw_identifier fields populated.
        // user.name == user.email (Okta login == email) → duplicate EUIDs after CONCAT.
        await seedUserEntity(esClient, {
          entityId: actor,
          namespace: NAMESPACE,
          email: aEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: {
            key: RELATIONSHIP_KEY,
            userEmails: [emailA, emailB],
            userIds: [rawIdA, rawIdB],
            userNames: [emailA, emailB],
          },
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // Wait until at least one target is resolved, then assert exact count.
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, actor, targetFromEmailA);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, actor);
        // 2 from user.email + 2 from user.id = 4 unique EUIDs.
        // The 2 from user.name duplicate user.email and are collapsed by VALUES().
        expect(ids).toHaveLength(4);
        expect(ids).toContain(targetFromEmailA);
        expect(ids).toContain(targetFromEmailB);
        expect(ids).toContain(targetFromIdA);
        expect(ids).toContain(targetFromIdB);
      }
    );

    apiTest(
      `writes only targets that exist as entities, drops phantom raw_identifiers`,
      async ({ apiClient, esClient }) => {
        // Scenario: actor has one real report (seeded as an entity) and one
        // phantom report (raw value only — no entity document). validateTargetIds
        // must filter the phantom before writing so only the real EUID lands in ids.
        const realEmail = targetEmail('phantom-real');
        const realTarget = userId(realEmail);
        const phantomRawEmail = targetEmail('phantom-ghost');
        // phantomTarget is intentionally NOT seeded — it has no entity document.
        const phantomTarget = userId(phantomRawEmail);

        const aEmail = actorEmail('phantom');
        const actor = userId(aEmail);
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, {
          entityId: realTarget,
          namespace: NAMESPACE,
          email: realEmail,
        });

        await seedUserEntity(esClient, {
          entityId: actor,
          namespace: NAMESPACE,
          email: aEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userEmails: [realEmail, phantomRawEmail] },
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // Wait until the real target appears, then assert the phantom is absent.
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, actor, realTarget);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, actor);
        expect(ids).toContain(realTarget);
        expect(ids).not.toContain(phantomTarget);
      }
    );

    apiTest(
      `resolves ${RELATIONSHIP_KEY}.ids when raw identifier is in user.id only (no email)`,
      async ({ apiClient, esClient }) => {
        // Verify the MV_APPEND union picks up values from user.id even when
        // user.email is absent. The target entity is identified by its Okta id,
        // so the actor seeds user.id (not user.email) in the raw_identifiers bag.
        const rawId = `okta-id-${ENTITY_PREFIX}-idonly`;
        const target = `user:${rawId}@${NAMESPACE}`;
        const aEmail = actorEmail('idonly');
        const actor = userId(aEmail);

        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, { entityId: target, namespace: NAMESPACE, email: aEmail });
        await seedUserEntity(esClient, {
          entityId: actor,
          namespace: NAMESPACE,
          email: aEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userIds: [rawId] },
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, actor, target);
      }
    );

    apiTest(
      `skips an actor whose entity.source is not '${REQUIRED_ENTITY_SOURCE}'`,
      async ({ apiClient, esClient }) => {
        const tEmail = targetEmail('src');
        const target = userId(tEmail);
        const aEmail = actorEmail('src-wrong');
        const wrongSourceActor = userId(aEmail);

        await seedUserEntity(esClient, { entityId: target, namespace: NAMESPACE, email: tEmail });
        // Actor has the correct raw_identifiers but an entity.source that no
        // supervises config matches — the maintainer's exact entity.source filter
        // must exclude it. (Use an unrelated endpoint source, not another IDP EA
        // dataset, since those are valid supervises sources.)
        await seedUserEntity(esClient, {
          entityId: wrongSourceActor,
          namespace: NAMESPACE,
          email: aEmail,
          entitySource: 'elastic_defend',
          relationship: { key: RELATIONSHIP_KEY, userEmails: [tEmail] },
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await assertNoRelationshipId(esClient, RELATIONSHIP_KEY, wrongSourceActor, target);
      }
    );
  }
);
