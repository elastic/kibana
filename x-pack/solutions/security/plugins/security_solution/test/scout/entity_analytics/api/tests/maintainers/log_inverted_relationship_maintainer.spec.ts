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
 * Config for a log-inverted relationship maintainer suite.
 *
 * A "log-inverted" maintainer reads documents where the actor is NOT the
 * document's subject. The document describes a device or resource (the target),
 * and actor identifiers live in an integration-namespaced field that the
 * maintainer inverts into user-keyed relationship writes.
 *
 * Contrast with raw_identifiers-based suites, where the actor IS the document
 * subject and the relationship target lives in raw_identifiers on the actor's
 * entity document.
 */
interface LogInvertedRelationshipMaintainerSuiteConfig {
  /** Maintainer id used by the run route, e.g. 'owns'. */
  maintainerId: string;
  /** Relationship key written under entity.relationships.<key>, e.g. 'owns'. */
  relationshipKey: string;
  /**
   * Namespace suffix appended to user actor EUIDs.
   * Actor EUIDs take the form `user:<identifier>@<actorNamespace>`.
   */
  actorNamespace: string;
  /**
   * entity.source value written to seeded user entities — must match what the
   * maintainer's composite agg filters on (if any).
   */
  entitySource: string;
  /**
   * Elasticsearch data-stream index that log documents are written into.
   * Must be a `logs-*` data-stream target; `op_type: 'create'` is required.
   */
  logIndex: string;
  /**
   * Returns the integration-specific field bag to merge into a seeded log
   * document. The callback receives the actor identifiers for the document so
   * the caller controls the exact field paths and structure without the suite
   * needing to know the integration's schema.
   *
   * For plain-object mapped fields (like `registered_owners`), return flattened
   * parallel arrays — that is how Elasticsearch stores them at ingest time, and
   * per-object correlation is not preserved.
   *
   * @param actorIdentifiers - array of actor identifier objects. Each object
   *   carries the identifiers that should resolve to one actor entity. Pass an
   *   empty array to produce a document with no actor references (the "no
   *   relationship" test case).
   */
  buildIntegrationFields: (
    actorIdentifiers: Array<{ id: string; mail?: string; upn?: string }>
  ) => Record<string, unknown>;
}

const registerLogInvertedRelationshipMaintainerSuite = (
  config: LogInvertedRelationshipMaintainerSuiteConfig
): void => {
  const {
    maintainerId,
    relationshipKey,
    actorNamespace,
    entitySource,
    logIndex,
    buildIntegrationFields,
  } = config;

  apiTest.describe(
    `Entity Store ${maintainerId} maintainer (${entitySource}, log-inverted)`,
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
          index: logIndex,
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
        // immediately after install races entity-store initialization.
        await waitForEntityStoreRunning(apiClient, defaultHeaders);

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
            index: logIndex,
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
        `resolves a single-actor log document into a ${relationshipKey} relationship on the actor`,
        async ({ apiClient, esClient }) => {
          const runId = randomUUID().slice(0, 8);
          const actorMail = `single.actor.${runId}@example.com`;
          const actorId = `actor-id-${runId}`;
          const targetId = `target-${runId}`;
          const actorEntityId = `user:${actorMail}@${actorNamespace}`;

          // The actor entity must exist for the write to land — a missing actor
          // 404s and is counted in notFound.
          await seedUserEntity(esClient, {
            entityId: actorEntityId,
            namespace: actorNamespace,
            email: actorMail,
            entitySource,
          });

          await seedLogDocument(esClient, {
            index: logIndex,
            hostId: targetId,
            hostName: `workstation-${runId}`,
            integrationFields: buildIntegrationFields([{ id: actorId, mail: actorMail }]),
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          await waitForRelationshipIds(
            esClient,
            relationshipKey,
            actorEntityId,
            `host:${targetId}`
          );

          const ids = await getRelationshipIds(esClient, relationshipKey, actorEntityId);
          expect(ids).toStrictEqual([`host:${targetId}`]);
        }
      );

      apiTest(
        `emits one ${relationshipKey} relationship per actor for a multi-actor log document`,
        async ({ apiClient, esClient }) => {
          // Regression test for the `registered_owners` flattening hazard: the
          // field is `type: group`, not `nested`, so ES flattens the array and
          // loses per-actor correlation. Both actors must still receive the
          // relationship.
          const runId = randomUUID().slice(0, 8);
          const aliceMail = `alice.${runId}@example.com`;
          const bobMail = `bob.${runId}@example.com`;
          const targetId = `shared-target-${runId}`;
          const aliceEntityId = `user:${aliceMail}@${actorNamespace}`;
          const bobEntityId = `user:${bobMail}@${actorNamespace}`;

          for (const [entityId, email] of [
            [aliceEntityId, aliceMail],
            [bobEntityId, bobMail],
          ]) {
            await seedUserEntity(esClient, {
              entityId,
              namespace: actorNamespace,
              email,
              entitySource,
            });
          }

          await seedLogDocument(esClient, {
            index: logIndex,
            hostId: targetId,
            hostName: `shared-workstation-${runId}`,
            integrationFields: buildIntegrationFields([
              { id: `alice-id-${runId}`, mail: aliceMail },
              { id: `bob-id-${runId}`, mail: bobMail },
            ]),
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          await waitForRelationshipIds(
            esClient,
            relationshipKey,
            aliceEntityId,
            `host:${targetId}`
          );
          await waitForRelationshipIds(esClient, relationshipKey, bobEntityId, `host:${targetId}`);
        }
      );

      apiTest(
        `resolves an actor with no mail via the id fallback (${relationshipKey}, rank 2)`,
        async ({ apiClient, esClient }) => {
          // Non-mailbox-enabled accounts have no mail on the device doc, so the
          // ranked CASE falls back to id (rank 2). The entity-store EUID ranking
          // is email > id, so an entity minted without an email is keyed
          // user:<id>@<actorNamespace>.
          const runId = randomUUID().slice(0, 8);
          const actorId = `nomail-actor-${runId}`;
          const targetId = `nomail-target-${runId}`;
          const actorEntityId = `user:${actorId}@${actorNamespace}`;

          await seedUserEntity(esClient, {
            entityId: actorEntityId,
            namespace: actorNamespace,
            // Not the identity used for the EUID — the entity is keyed on id.
            email: `unused.${runId}@example.com`,
            entitySource,
          });

          await seedLogDocument(esClient, {
            index: logIndex,
            hostId: targetId,
            hostName: `nomail-workstation-${runId}`,
            integrationFields: buildIntegrationFields([{ id: actorId }]),
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          await waitForRelationshipIds(
            esClient,
            relationshipKey,
            actorEntityId,
            `host:${targetId}`
          );

          const ids = await getRelationshipIds(esClient, relationshipKey, actorEntityId);
          expect(ids).toStrictEqual([`host:${targetId}`]);
        }
      );

      apiTest(
        `resolves an actor with only a user_principal_name via the upn fallback (${relationshipKey}, rank 3)`,
        async ({ apiClient, esClient }) => {
          // Accounts where only user_principal_name is available (no mail, no id
          // on the device doc) exercise the final CASE branch. The entity-store
          // EUID ranking falls to user.name, so the entity is keyed
          // user:<upn>@<actorNamespace>.
          const runId = randomUUID().slice(0, 8);
          const actorUpn = `upn-actor-${runId}@example.com`;
          const targetId = `upn-target-${runId}`;
          const actorEntityId = `user:${actorUpn}@${actorNamespace}`;

          await seedUserEntity(esClient, {
            entityId: actorEntityId,
            namespace: actorNamespace,
            email: `unused.${runId}@example.com`,
            entitySource,
          });

          await seedLogDocument(esClient, {
            index: logIndex,
            hostId: targetId,
            hostName: `upn-workstation-${runId}`,
            integrationFields: buildIntegrationFields([{ id: `id-${runId}`, upn: actorUpn }]),
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          await waitForRelationshipIds(
            esClient,
            relationshipKey,
            actorEntityId,
            `host:${targetId}`
          );

          const ids = await getRelationshipIds(esClient, relationshipKey, actorEntityId);
          expect(ids).toStrictEqual([`host:${targetId}`]);
        }
      );

      apiTest(
        `writes no ${relationshipKey} relationship for a log document with no actor references`,
        async ({ apiClient, esClient }) => {
          const runId = randomUUID().slice(0, 8);
          const probeMail = `unlinked.probe.${runId}@example.com`;
          const targetId = `unlinked-target-${runId}`;
          const probeEntityId = `user:${probeMail}@${actorNamespace}`;

          await seedUserEntity(esClient, {
            entityId: probeEntityId,
            namespace: actorNamespace,
            email: probeMail,
            entitySource,
          });

          await seedLogDocument(esClient, {
            index: logIndex,
            hostId: targetId,
            hostName: `unlinked-workstation-${runId}`,
            integrationFields: buildIntegrationFields([]),
          });

          await triggerMaintainerRun(apiClient, internalHeaders, maintainerId, { sync: true });

          const ids = await getRelationshipIds(esClient, relationshipKey, probeEntityId);
          expect(ids).not.toContain(`host:${targetId}`);
        }
      );
    }
  );
};

registerLogInvertedRelationshipMaintainerSuite({
  maintainerId: 'owns',
  relationshipKey: 'owns',
  actorNamespace: 'entra_id',
  entitySource: 'entityanalytics_entra_id',
  logIndex: 'logs-entityanalytics_entra_id.device-default',
  buildIntegrationFields: (actorIdentifiers) => {
    // `registered_owners` has a plain object mapping (not nested) — Elasticsearch
    // flattens it to disjoint parallel arrays of potentially different lengths at
    // ingest time. Write it the same way so the test reflects production index layout.
    // The ES|QL uses MV_APPEND to union all three identifier arrays, so every owner
    // identifier emits a candidate row regardless of which fields are present.
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
      // The ES|QL reads `device.registered_owners.*` (the ECS-native path).
      // The ingest pipeline copies this to `entityanalytics_entra_id.device.registered_owners`
      // but both paths resolve identically in Elasticsearch; we seed the ECS path directly.
      device: {
        registered_owners: registeredOwners,
      },
    };
  },
});
