/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  seedUserEntity,
  seedLogDocument,
  triggerMaintainerRun,
  waitForRelationshipIds,
  waitForEntityStoreRunning,
  getRelationshipIds,
} from '../../fixtures/maintainers/helpers';

/**
 * Entra ID `owns` is a "log-inverted" maintainer: it reads documents where the
 * actor is NOT the document's subject. The document describes a device (the
 * target), and owner identifiers live under `device.registered_owners`, which
 * the maintainer inverts into user-keyed relationship writes.
 *
 * Contrast with raw_identifiers-based suites, where the actor IS the document
 * subject and the relationship target lives in raw_identifiers on the actor's
 * entity document.
 */
const MAINTAINER_ID = 'owns';
const RELATIONSHIP_KEY = 'owns';
const ACTOR_NAMESPACE = 'entra_id';
const ENTITY_SOURCE = 'entityanalytics_entra_id';
const LOG_INDEX = 'logs-entityanalytics_entra_id.device-default';

/**
 * Builds the `device.registered_owners` bag for a seeded device document.
 *
 * `registered_owners` has a plain object mapping (not nested) — Elasticsearch
 * flattens it to disjoint parallel arrays of potentially different lengths at
 * ingest time. Writing it the same way keeps the test faithful to the
 * production index layout. The ES|QL unions all three identifier arrays with
 * MV_APPEND, so every owner identifier emits a candidate row regardless of
 * which fields are present.
 *
 * Pass an empty array to produce a document with no actor references.
 */
const buildRegisteredOwnersFields = (
  actorIdentifiers: Array<{ id: string; mail?: string; upn?: string }>
): Record<string, unknown> => {
  const ids = actorIdentifiers.map((a) => a.id);
  const mails = actorIdentifiers.map((a) => a.mail).filter((m): m is string => Boolean(m));
  const upns = actorIdentifiers.map((a) => a.upn).filter((u): u is string => Boolean(u));
  const registeredOwners: Record<string, string[]> = { id: ids };
  if (mails.length > 0) {
    registeredOwners.mail = mails;
  }
  if (upns.length > 0) {
    registeredOwners.user_principal_name = upns;
  }

  return {
    data_stream: {
      dataset: 'entityanalytics_entra_id.device',
      namespace: 'default',
      type: 'logs',
    },
    // The ES|QL reads `device.registered_owners.*` (the ECS-native path). The
    // ingest pipeline also copies this to
    // `entityanalytics_entra_id.device.registered_owners`, but both paths resolve
    // identically in Elasticsearch, so we seed the ECS path directly.
    device: {
      registered_owners: registeredOwners,
    },
  };
};

apiTest.describe(
  `Entity Store ${MAINTAINER_ID} maintainer (${ENTITY_SOURCE}, log-inverted)`,
  { tag: ENTITY_STORE_TAGS },
  () => {
    // Each test issues a synchronous maintainer run plus polling loops; the
    // default 60s Playwright timeout is too tight.
    apiTest.setTimeout(180_000);

    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
      // `admin` is required: the install route enforces `securitySolution` +
      // `entity-analytics` Kibana privileges that lower roles do not hold.
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      // Covers all three index families; deleting only latest+updates would leak
      // stale history snapshots into the next run.
      await clearEntityStoreIndices(esClient);
      await esClient.deleteByQuery({
        index: LOG_INDEX,
        query: { match_all: {} },
        refresh: true,
        ignore_unavailable: true,
      });

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(installResponse.statusCode);

      // The `running` status flips before the latest alias is ready, so seeding
      // immediately after install races entity-store initialization. The explicit
      // timeout matters: `apiTest.setTimeout` above applies to tests, not hooks,
      // so this poll must outlast Playwright's 60s hook default or provisioning
      // four engines on a loaded CI agent surfaces as an opaque hook timeout.
      await waitForEntityStoreRunning(apiClient, defaultHeaders, 150_000);

      // Schedules the maintainer task records, matching the raw_identifiers
      // suites. `runSync` persists run state against that task afterwards.
      const initResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT,
        { headers: internalHeaders, responseType: 'json', body: {} }
      );
      expect([200, 201]).toContain(initResponse.statusCode);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await esClient
        .deleteByQuery({
          index: LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        })
        .catch(() => {});
      await clearEntityStoreIndices(esClient);
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest(
      `resolves a single-actor log document into a ${RELATIONSHIP_KEY} relationship on the actor`,
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const actorMail = `single.actor.${runId}@example.com`;
        const actorId = `actor-id-${runId}`;
        const targetId = `target-${runId}`;
        const actorEntityId = `user:${actorMail}@${ACTOR_NAMESPACE}`;

        // The actor entity must exist for the write to land — a missing actor
        // 404s and is counted in notFound.
        await seedUserEntity(esClient, {
          entityId: actorEntityId,
          namespace: ACTOR_NAMESPACE,
          email: actorMail,
          entitySource: ENTITY_SOURCE,
        });

        await seedLogDocument(esClient, {
          index: LOG_INDEX,
          hostId: targetId,
          hostName: `workstation-${runId}`,
          integrationFields: buildRegisteredOwnersFields([{ id: actorId, mail: actorMail }]),
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, actorEntityId, `host:${targetId}`);

        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, actorEntityId);
        expect(ids).toStrictEqual([`host:${targetId}`]);
      }
    );

    apiTest(
      `emits one ${RELATIONSHIP_KEY} relationship per actor for a multi-actor log document`,
      async ({ apiClient, esClient }) => {
        // Regression test for the `registered_owners` flattening hazard: the
        // field is `type: group`, not `nested`, so ES flattens the array and
        // loses per-actor correlation. Both actors must still receive the
        // relationship.
        const runId = randomUUID().slice(0, 8);
        const aliceMail = `alice.${runId}@example.com`;
        const bobMail = `bob.${runId}@example.com`;
        const targetId = `shared-target-${runId}`;
        const aliceEntityId = `user:${aliceMail}@${ACTOR_NAMESPACE}`;
        const bobEntityId = `user:${bobMail}@${ACTOR_NAMESPACE}`;

        for (const [entityId, email] of [
          [aliceEntityId, aliceMail],
          [bobEntityId, bobMail],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: ACTOR_NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }

        await seedLogDocument(esClient, {
          index: LOG_INDEX,
          hostId: targetId,
          hostName: `shared-workstation-${runId}`,
          integrationFields: buildRegisteredOwnersFields([
            { id: `alice-id-${runId}`, mail: aliceMail },
            { id: `bob-id-${runId}`, mail: bobMail },
          ]),
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, aliceEntityId, `host:${targetId}`);
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, bobEntityId, `host:${targetId}`);
      }
    );

    apiTest(
      `resolves an actor with no mail via the id fallback (${RELATIONSHIP_KEY}, rank 2)`,
      async ({ apiClient, esClient }) => {
        // Non-mailbox-enabled accounts have no mail on the device doc, so the
        // ranked CASE falls back to id (rank 2). The entity-store EUID ranking
        // is email > id, so an entity minted without an email is keyed
        // user:<id>@<ACTOR_NAMESPACE>.
        const runId = randomUUID().slice(0, 8);
        const actorId = `nomail-actor-${runId}`;
        const targetId = `nomail-target-${runId}`;
        const actorEntityId = `user:${actorId}@${ACTOR_NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: actorEntityId,
          namespace: ACTOR_NAMESPACE,
          // Not the identity used for the EUID — the entity is keyed on id.
          email: `unused.${runId}@example.com`,
          entitySource: ENTITY_SOURCE,
        });

        await seedLogDocument(esClient, {
          index: LOG_INDEX,
          hostId: targetId,
          hostName: `nomail-workstation-${runId}`,
          integrationFields: buildRegisteredOwnersFields([{ id: actorId }]),
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, actorEntityId, `host:${targetId}`);

        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, actorEntityId);
        expect(ids).toStrictEqual([`host:${targetId}`]);
      }
    );

    apiTest(
      `resolves an actor with only a user_principal_name via the upn fallback (${RELATIONSHIP_KEY}, rank 3)`,
      async ({ apiClient, esClient }) => {
        // Accounts where only user_principal_name is available (no mail, no id
        // on the device doc) exercise the final CASE branch. The entity-store
        // EUID ranking falls to user.name, so the entity is keyed
        // user:<upn>@<ACTOR_NAMESPACE>.
        const runId = randomUUID().slice(0, 8);
        const actorUpn = `upn-actor-${runId}@example.com`;
        const targetId = `upn-target-${runId}`;
        const actorEntityId = `user:${actorUpn}@${ACTOR_NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: actorEntityId,
          namespace: ACTOR_NAMESPACE,
          email: `unused.${runId}@example.com`,
          entitySource: ENTITY_SOURCE,
        });

        await seedLogDocument(esClient, {
          index: LOG_INDEX,
          hostId: targetId,
          hostName: `upn-workstation-${runId}`,
          integrationFields: buildRegisteredOwnersFields([{ id: `id-${runId}`, upn: actorUpn }]),
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, actorEntityId, `host:${targetId}`);

        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, actorEntityId);
        expect(ids).toStrictEqual([`host:${targetId}`]);
      }
    );

    apiTest(
      `writes no ${RELATIONSHIP_KEY} relationship for a log document with no actor references`,
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const probeMail = `unlinked.probe.${runId}@example.com`;
        const targetId = `unlinked-target-${runId}`;
        const probeEntityId = `user:${probeMail}@${ACTOR_NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: probeEntityId,
          namespace: ACTOR_NAMESPACE,
          email: probeMail,
          entitySource: ENTITY_SOURCE,
        });

        await seedLogDocument(esClient, {
          index: LOG_INDEX,
          hostId: targetId,
          hostName: `unlinked-workstation-${runId}`,
          integrationFields: buildRegisteredOwnersFields([]),
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, probeEntityId);
        expect(ids).not.toContain(`host:${targetId}`);
      }
    );
  }
);
