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
 * End-to-end suite for the `supervises` maintainer's SailPoint Identity Security
 * Cloud source (user → user).
 *
 * SailPoint writes a manager's direct reports to
 * `user.entity.relationships.supervises.user.{id,name,email}`, which extraction
 * copies into `entity.relationships.supervises.raw_identifiers.user.*`. The
 * report users exist as entities from their own identity documents, so the
 * maintainer only resolves the raw values to canonical EUIDs
 * (`user:<value>@sailpoint_identity_sc`) and drops any that are not in the store.
 *
 * The SailPoint CEL emits `""` for a report without an email, so a blank raw
 * value is a realistic input and is covered explicitly here.
 */
const MAINTAINER_ID = 'supervises';
const RELATIONSHIP_KEY = 'supervises';
const ENTITY_PREFIX = 'sp';
/** Namespace suffix on the user EUID and the seeded entity.namespace. */
const NAMESPACE = 'sailpoint_identity_sc';
/**
 * The maintainer matches entity.source against both the bare integration name
 * and the `<integration>.identities` dataset; the bare form is seeded here.
 */
const REQUIRED_ENTITY_SOURCE = 'sailpoint_identity_sc';

const domain = 'acmecrm.com';
const reportEmail = (suffix: string) => `${ENTITY_PREFIX}-${suffix}-report@${domain}`;
const managerEmail = (suffix: string) => `${ENTITY_PREFIX}-${suffix}-mgr@${domain}`;
const userId = (value: string, namespace = NAMESPACE) => `user:${value}@${namespace}`;

apiTest.describe(
  `Entity Store ${MAINTAINER_ID} maintainer (SailPoint, user → user)`,
  { tag: ENTITY_STORE_TAGS },
  () => {
    // Each test may issue a synchronous maintainer run plus polling loops. The
    // default 60s Playwright timeout is too tight; use the same 3-minute ceiling
    // as Playwright's global setup projects.
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

      // The explicit timeout matters: `apiTest.setTimeout` applies to tests, not
      // hooks, so this poll must outlast Playwright's 60s hook default.
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
      `resolves ${RELATIONSHIP_KEY}.ids for a manager's email-keyed reports`,
      async ({ apiClient, esClient }) => {
        const emailA = reportEmail('mgr-a');
        const emailB = reportEmail('mgr-b');
        const mgrEmail = managerEmail('resolve');
        const manager = userId(mgrEmail);

        // The maintainer task auto-runs once on registration and persists a
        // watermark before this test seeds anything, so seed the manager with a
        // FUTURE last_seen to stay above it, and trigger synchronously.
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, {
          entityId: userId(emailA),
          namespace: NAMESPACE,
          email: emailA,
        });
        await seedUserEntity(esClient, {
          entityId: userId(emailB),
          namespace: NAMESPACE,
          email: emailB,
        });
        await seedUserEntity(esClient, {
          entityId: manager,
          namespace: NAMESPACE,
          email: mgrEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userEmails: [emailA, emailB] },
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, manager, userId(emailA));
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, manager);
        expect(ids).toHaveLength(2);
        expect(ids).toContain(userId(emailA));
        expect(ids).toContain(userId(emailB));
      }
    );

    apiTest(
      `resolves ${RELATIONSHIP_KEY}.ids from user.id when a report has no email`,
      async ({ apiClient, esClient }) => {
        // A report without an email is keyed by its SailPoint identity id, so the
        // manager carries only user.id in its raw_identifiers bag.
        const rawId = `sp-identity-${ENTITY_PREFIX}-idonly`;
        const target = userId(rawId);
        const targetEmail = reportEmail('idonly');
        const mgrEmail = managerEmail('idonly');
        const manager = userId(mgrEmail);
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, {
          entityId: target,
          namespace: NAMESPACE,
          email: targetEmail,
        });
        await seedUserEntity(esClient, {
          entityId: manager,
          namespace: NAMESPACE,
          email: mgrEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userIds: [rawId] },
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, manager, target);
      }
    );

    apiTest(
      `does not build a target from an empty-string email`,
      async ({ apiClient, esClient }) => {
        // The CEL emits "" for a report without an email, so the raw bag holds a
        // blank email next to the real id. A decoy entity with the id the blank
        // value would build (`user:@sailpoint_identity_sc`) is seeded so that, if
        // the blank value leaked through, target validation would keep it and the
        // assertion below would catch it.
        const rawId = `sp-identity-${ENTITY_PREFIX}-blank`;
        const target = userId(rawId);
        const targetEmail = reportEmail('blank');
        const blankTarget = userId('');
        const mgrEmail = managerEmail('blank');
        const manager = userId(mgrEmail);
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, {
          entityId: target,
          namespace: NAMESPACE,
          email: targetEmail,
        });
        await seedUserEntity(esClient, {
          entityId: blankTarget,
          namespace: NAMESPACE,
          email: reportEmail('blank-decoy'),
        });
        await seedUserEntity(esClient, {
          entityId: manager,
          namespace: NAMESPACE,
          email: mgrEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userEmails: [''], userIds: [rawId] },
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, manager, target);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, manager);
        expect(ids).toStrictEqual([target]);
        expect(ids).not.toContain(blankTarget);
      }
    );

    apiTest(
      `writes only reports that exist as entities, drops phantom raw_identifiers`,
      async ({ apiClient, esClient }) => {
        // The manager names one real report (seeded as an entity) and one report
        // with no entity document. validateTargetIds must filter the phantom out
        // so no dangling EUID lands in the relationship.
        const realEmail = reportEmail('phantom-real');
        const realTarget = userId(realEmail);
        const phantomEmail = reportEmail('phantom-ghost');
        const phantomTarget = userId(phantomEmail);
        const mgrEmail = managerEmail('phantom');
        const manager = userId(mgrEmail);
        const futureTs = new Date(Date.now() + 3_600_000).toISOString();

        await seedUserEntity(esClient, {
          entityId: realTarget,
          namespace: NAMESPACE,
          email: realEmail,
        });
        await seedUserEntity(esClient, {
          entityId: manager,
          namespace: NAMESPACE,
          email: mgrEmail,
          entitySource: REQUIRED_ENTITY_SOURCE,
          relationship: { key: RELATIONSHIP_KEY, userEmails: [realEmail, phantomEmail] },
          lastSeen: futureTs,
          firstSeen: futureTs,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, manager, realTarget);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, manager);
        expect(ids).toContain(realTarget);
        expect(ids).not.toContain(phantomTarget);
      }
    );

    apiTest(`leaves an actor from another source untouched`, async ({ apiClient, esClient }) => {
      // An Okta-sourced actor shares a raw email with a SailPoint-namespaced
      // entity. The SailPoint config must only read SailPoint-sourced actors, so
      // it must not write that SailPoint-namespaced EUID onto the Okta actor.
      const sharedEmail = reportEmail('cross');
      const sailpointTarget = userId(sharedEmail);
      const oktaActorEmail = managerEmail('okta-actor');
      const oktaActor = userId(oktaActorEmail, 'okta');
      const futureTs = new Date(Date.now() + 3_600_000).toISOString();

      await seedUserEntity(esClient, {
        entityId: sailpointTarget,
        namespace: NAMESPACE,
        email: sharedEmail,
      });
      await seedUserEntity(esClient, {
        entityId: oktaActor,
        namespace: 'okta',
        email: oktaActorEmail,
        entitySource: 'entityanalytics_okta',
        relationship: { key: RELATIONSHIP_KEY, userEmails: [sharedEmail] },
        lastSeen: futureTs,
        firstSeen: futureTs,
      });

      await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

      await assertNoRelationshipId(esClient, RELATIONSHIP_KEY, oktaActor, sailpointTarget);
    });
  }
);
