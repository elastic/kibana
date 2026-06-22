/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/common';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
  LATEST_INDEX,
  UPDATES_INDEX,
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  seedUserEntity,
  triggerMaintainerRun,
  waitForRelationshipIds,
  assertNoRelationshipId,
} from '../../fixtures/maintainers/helpers';

/**
 * Config describing one user-TARGET raw_identifiers-based relationship
 * maintainer under test. Generic over the relationship key so the same suite
 * covers `supervises` and any future user → user maintainer.
 *
 * Unlike the host-target suite in
 * `host_target_raw_identifiers_maintainer_suite.spec.ts`, these maintainers
 * resolve a user actor's `raw_identifiers.user.email` into a user EUID *with*
 * the IDP namespace suffix (`user:<email>@<ns>`). Both actor and target are user
 * entities, so this suite seeds user entities (not hosts) and asserts the same
 * entity.lifecycle.last_seen watermark gate end-to-end.
 */
interface UserTargetRawIdentifiersMaintainerSuiteConfig {
  /** Maintainer id used by the run route, e.g. 'supervises'. */
  maintainerId: string;
  /** Relationship key written under entity.relationships.<key>, e.g. 'supervises'. */
  relationshipKey: string;
  /** Short prefix used to namespace the seeded entity ids so suites don't collide. */
  entityPrefix: string;
  /** IDP namespace suffix on the user EUID (and seeded entity.namespace), e.g. 'okta'. */
  namespace: string;
  /** entity.source the maintainer filters on (e.g. 'entityanalytics_okta'). */
  requiredEntitySource: string;
}

const registerUserTargetRawIdentifiersMaintainerSuite = (
  config: UserTargetRawIdentifiersMaintainerSuiteConfig
): void => {
  const { maintainerId, relationshipKey, entityPrefix, namespace, requiredEntitySource } = config;
  const domain = 'acmecrm.com';
  const targetEmail = (suffix: string) => `${entityPrefix}-${suffix}-mgr@${domain}`;
  const userId = (email: string) => `user:${email}@${namespace}`;
  const actorEmail = (suffix: string) => `${entityPrefix}-${suffix}@${domain}`;

  apiTest.describe(
    `Entity Store ${maintainerId} maintainer (raw_identifiers, user → user)`,
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
        `resolves ${relationshipKey}.ids for a freshly-seen actor`,
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

          await seedUserEntity(esClient, { entityId: target, namespace, email: tEmail });
          await seedUserEntity(esClient, {
            entityId: actor,
            namespace,
            email: aEmail,
            entitySource: requiredEntitySource,
            relationship: { key: relationshipKey, userEmails: [tEmail] },
            lastSeen: futureTs,
            firstSeen: futureTs,
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          await waitForRelationshipIds(esClient, relationshipKey, actor, target);
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

          await seedUserEntity(esClient, {
            entityId: primingTarget,
            namespace,
            email: primingTargetEmail,
          });
          await seedUserEntity(esClient, {
            entityId: primingActor,
            namespace,
            email: primingActorEmail,
            entitySource: requiredEntitySource,
            relationship: { key: relationshipKey, userEmails: [primingTargetEmail] },
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });
          await waitForRelationshipIds(esClient, relationshipKey, primingActor, primingTarget);

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
            namespace,
            email: staleTargetEmail,
          });
          await seedUserEntity(esClient, {
            entityId: freshTarget,
            namespace,
            email: freshTargetEmail,
          });

          await seedUserEntity(esClient, {
            entityId: staleActor,
            namespace,
            email: staleActorEmail,
            lastSeen: pastTs,
            firstSeen: pastTs,
            entitySource: requiredEntitySource,
            relationship: { key: relationshipKey, userEmails: [staleTargetEmail] },
          });
          await seedUserEntity(esClient, {
            entityId: freshActor,
            namespace,
            email: freshActorEmail,
            lastSeen: futureTs,
            firstSeen: futureTs,
            entitySource: requiredEntitySource,
            relationship: { key: relationshipKey, userEmails: [freshTargetEmail] },
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          await waitForRelationshipIds(esClient, relationshipKey, freshActor, freshTarget);
          await assertNoRelationshipId(esClient, relationshipKey, staleActor, staleTarget);
        }
      );

      apiTest(
        `skips an actor whose entity.source is not '${requiredEntitySource}'`,
        async ({ apiClient, esClient }) => {
          const tEmail = targetEmail('src');
          const target = userId(tEmail);
          const aEmail = actorEmail('src-wrong');
          const wrongSourceActor = userId(aEmail);

          await seedUserEntity(esClient, { entityId: target, namespace, email: tEmail });
          // Actor has the correct raw_identifiers but an entity.source that no
          // supervises config matches — the maintainer's exact entity.source filter
          // must exclude it. (Use an unrelated endpoint source, not another IDP EA
          // dataset, since those are valid supervises sources.)
          await seedUserEntity(esClient, {
            entityId: wrongSourceActor,
            namespace,
            email: aEmail,
            entitySource: 'elastic_defend',
            relationship: { key: relationshipKey, userEmails: [tEmail] },
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          await assertNoRelationshipId(esClient, relationshipKey, wrongSourceActor, target);
        }
      );
    }
  );
};

// Add a new entry here as each user → user maintainer is onboarded; the shared
// suite seeds user entities, runs the maintainer, and asserts the
// entity.lifecycle.last_seen watermark gate end-to-end.
//
// supervises is user → user, reconstructing the target EUID with the IDP
// namespace suffix. The maintainer supports both Okta and Entra ID (identical
// mechanism, differing only in entity.source + namespace suffix). This e2e suite
// exercises the Okta source; the Entra ID source is covered by the unit/snapshot
// tests in configs.test.ts (a second e2e registration would need its own spec
// file — the scout_max_one_describe lint rule allows one root describe per file).
//
// The maintainer matches entity.source against both the bare integration name
// and the <integration>.user dataset; we seed the bare form here.
registerUserTargetRawIdentifiersMaintainerSuite({
  maintainerId: 'supervises',
  relationshipKey: 'supervises',
  entityPrefix: 'sup',
  namespace: 'okta',
  requiredEntitySource: 'entityanalytics_okta',
});
