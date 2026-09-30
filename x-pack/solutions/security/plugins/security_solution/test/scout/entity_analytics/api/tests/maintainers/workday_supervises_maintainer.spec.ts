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
  getRelationshipRawUserEmails,
  assertNoRelationshipId,
  assertEntityDoesNotExist,
} from '../../fixtures/maintainers/helpers';

const LOG_INDEX = 'logs-workday.user-default';
const NAMESPACE = 'workday';
const ENTITY_SOURCE = 'workday';
const RELATIONSHIP_KEY = 'supervises';
const MAINTAINER_ID = 'supervises';

// Workday's ingest pipeline sets @timestamp from Hire_Date. This value must stay
// more than 30 days in the past: test 5 proves the maintainer does NOT apply
// the engine's @timestamp lookback — freshening it inside 30 days would let
// test 5 pass while silently guarding nothing.
const HIRE_DATE = '2024-03-19T00:00:00.000Z';

interface WorkdayRow {
  userEmail: string;
  managerEmail?: string;
  managerId?: string;
  /** How long ago this snapshot was ingested; lets a test seed an older row. */
  ingestedAgoMinutes?: number;
}

// Workday field names use PascalCase_with_underscores, which the ESLint naming-
// convention rule does not allow as identifier-style property names. Using
// bracket-notation assignment avoids both the rule and any eslint-disable comment.
const buildWorkdayUserFields = ({
  managerEmail,
  managerId,
}: Pick<WorkdayRow, 'managerEmail' | 'managerId'>): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  // Display name, never a resolvable identity — seeded to prove it is ignored.
  fields['Worker_s_Manager'] = 'Alex Manager (000687)';
  if (managerEmail !== undefined) {
    fields['Manager_Email'] = managerEmail;
  }
  if (managerId !== undefined) {
    fields['Manager_ID'] = managerId;
  }
  return fields;
};

const seedWorkdayRow = async (
  esClient: Parameters<typeof seedLogDocument>[0],
  { userEmail, managerEmail, managerId, ingestedAgoMinutes = 5 }: WorkdayRow
) =>
  seedLogDocument(esClient, {
    index: LOG_INDEX,
    timestamp: HIRE_DATE,
    eventIngested: new Date(Date.now() - ingestedAgoMinutes * 60_000).toISOString(),
    event: { kind: 'asset', category: ['iam'], type: ['user'] },
    integrationFields: {
      user: { email: userEmail },
      data_stream: { dataset: 'workday.user' },
      workday: { user: buildWorkdayUserFields({ managerEmail, managerId }) },
    },
  });

apiTest.describe(
  'Entity Store supervises maintainer (workday, log-inverted)',
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

    apiTest('writes one report onto the manager entity', async ({ apiClient, esClient }) => {
      const runId = randomUUID().slice(0, 8);
      const managerEmail = `bob.${runId}@example.com`;
      const reportEmail = `alice.${runId}@example.com`;
      const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
      const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

      await seedUserEntity(esClient, {
        entityId: managerEntityId,
        namespace: NAMESPACE,
        email: managerEmail,
        entitySource: ENTITY_SOURCE,
      });
      await seedUserEntity(esClient, {
        entityId: reportEntityId,
        namespace: NAMESPACE,
        email: reportEmail,
        entitySource: ENTITY_SOURCE,
      });
      await seedWorkdayRow(esClient, { userEmail: reportEmail, managerEmail });

      await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

      await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);
      const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId);
      expect(ids).toStrictEqual([reportEntityId]);
    });

    apiTest(
      'writes both reports of a shared manager onto that manager',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `shared.${runId}@example.com`;
        const firstReport = `first.${runId}@example.com`;
        const secondReport = `second.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const firstEntityId = `user:${firstReport}@${NAMESPACE}`;
        const secondEntityId = `user:${secondReport}@${NAMESPACE}`;

        for (const [entityId, email] of [
          [managerEntityId, managerEmail],
          [firstEntityId, firstReport],
          [secondEntityId, secondReport],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }
        await seedWorkdayRow(esClient, { userEmail: firstReport, managerEmail });
        await seedWorkdayRow(esClient, { userEmail: secondReport, managerEmail });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, firstEntityId);
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, secondEntityId);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId);
        expect(ids.sort()).toStrictEqual([firstEntityId, secondEntityId].sort());
      }
    );

    apiTest(
      'writes nothing for a worker with no manager fields',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const loneEmail = `lone.${runId}@example.com`;
        const loneEntityId = `user:${loneEmail}@${NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: loneEntityId,
          namespace: NAMESPACE,
          email: loneEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedWorkdayRow(esClient, { userEmail: loneEmail });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, loneEntityId);
        expect(ids).toStrictEqual([]);
      }
    );

    apiTest(
      'drops the relationship when the manager is not in the entity store',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const reportEmail = `orphan.${runId}@example.com`;
        const absentManagerEmail = `absent.${runId}@example.com`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;
        const absentManagerEntityId = `user:${absentManagerEmail}@${NAMESPACE}`;

        // Only the report exists; the manager is deliberately never seeded.
        await seedUserEntity(esClient, {
          entityId: reportEntityId,
          namespace: NAMESPACE,
          email: reportEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedWorkdayRow(esClient, {
          userEmail: reportEmail,
          managerEmail: absentManagerEmail,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // The write 404s rather than minting a manager entity from a foreign key.
        // Both assertions are needed: assertNoRelationshipId maps a missing
        // document to [], so on its own it would also pass if the maintainer had
        // created an empty manager entity.
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          absentManagerEntityId,
          reportEntityId
        );
        await assertEntityDoesNotExist(esClient, absentManagerEntityId);
      }
    );

    apiTest(
      'resolves a worker whose Hire_Date is years old but whose event.ingested is recent',
      async ({ apiClient, esClient }) => {
        // Regression guard for the Hire_Date trap: if the config ever falls back
        // to the engine's @timestamp lookback, this row is excluded and no
        // relationship is written.
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `tenured.mgr.${runId}@example.com`;
        const reportEmail = `tenured.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: managerEntityId,
          namespace: NAMESPACE,
          email: managerEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedUserEntity(esClient, {
          entityId: reportEntityId,
          namespace: NAMESPACE,
          email: reportEmail,
          entitySource: ENTITY_SOURCE,
        });
        // HIRE_DATE is 2024; event.ingested is minutes ago.
        await seedWorkdayRow(esClient, { userEmail: reportEmail, managerEmail });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);
      }
    );

    apiTest(
      'writes the report onto the email-keyed manager when both manager fields are present',
      async ({ apiClient, esClient }) => {
        // Covers the production-dominant shape: real Workday rows populate both
        // Manager_Email and Manager_ID, so the managerKey CASE takes the
        // MV_APPEND branch and expands two actor EUIDs per report. The email-
        // keyed actor matches the entity in the store and receives the
        // relationship; the id-keyed actor (user:<managerId>@workday) 404s
        // because no entity with that EUID was seeded — that 404 is the
        // intended drop path, not a bug.
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `dual.mgr.${runId}@example.com`;
        const managerId = `000687-${runId}`;
        const reportEmail = `dual.report.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const managerIdEntityId = `user:${managerId}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId: managerEntityId,
          namespace: NAMESPACE,
          email: managerEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedUserEntity(esClient, {
          entityId: reportEntityId,
          namespace: NAMESPACE,
          email: reportEmail,
          entitySource: ENTITY_SOURCE,
        });
        // Both manager fields present — exercises the MV_APPEND arm of managerKey.
        await seedWorkdayRow(esClient, { userEmail: reportEmail, managerEmail, managerId });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // The email-keyed actor has an entity and must receive the supervises target.
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId);
        expect(ids).toStrictEqual([reportEntityId]);

        // The id-keyed actor has no entity; its write 404s and must produce
        // nothing — neither a relationship nor an entity minted from the id.
        await assertNoRelationshipId(esClient, RELATIONSHIP_KEY, managerIdEntityId, reportEntityId);
        await assertEntityDoesNotExist(esClient, managerIdEntityId);
      }
    );

    apiTest(
      'follows a manager change instead of reporting to both managers',
      async ({ apiClient, esClient }) => {
        // The integration re-ingests the full inventory every poll, so a worker
        // who changes managers has snapshots naming each. Grouping all snapshots
        // would put the report under BOTH managers, and because writes are
        // additive that stale edge would never be retracted.
        const runId = randomUUID().slice(0, 8);
        const oldManagerEmail = `old.mgr.${runId}@example.com`;
        const newManagerEmail = `new.mgr.${runId}@example.com`;
        const reportEmail = `moved.${runId}@example.com`;
        const oldManagerEntityId = `user:${oldManagerEmail}@${NAMESPACE}`;
        const newManagerEntityId = `user:${newManagerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        for (const [entityId, email] of [
          [oldManagerEntityId, oldManagerEmail],
          [newManagerEntityId, newManagerEmail],
          [reportEntityId, reportEmail],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }

        // Two snapshots of the same worker: the older names the previous manager.
        await seedWorkdayRow(esClient, {
          userEmail: reportEmail,
          managerEmail: oldManagerEmail,
          ingestedAgoMinutes: 60,
        });
        await seedWorkdayRow(esClient, {
          userEmail: reportEmail,
          managerEmail: newManagerEmail,
          ingestedAgoMinutes: 5,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          newManagerEntityId,
          reportEntityId
        );
        expect(
          await getRelationshipIds(esClient, RELATIONSHIP_KEY, newManagerEntityId)
        ).toStrictEqual([reportEntityId]);

        // The previous manager must not keep the report.
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          oldManagerEntityId,
          reportEntityId
        );
      }
    );

    apiTest(
      'moves the report to the new manager when the worker is reassigned',
      async ({ apiClient, esClient }) => {
        // Two runs, not two snapshots: run 1 establishes the edge, run 2 must
        // remove it. Only the pre-run reset can do that — additive writes never
        // retract.
        const runId = randomUUID().slice(0, 8);
        const oldManagerEmail = `reassign.old.${runId}@example.com`;
        const newManagerEmail = `reassign.new.${runId}@example.com`;
        const reportEmail = `reassign.report.${runId}@example.com`;
        const oldManagerEntityId = `user:${oldManagerEmail}@${NAMESPACE}`;
        const newManagerEntityId = `user:${newManagerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        for (const [entityId, email] of [
          [oldManagerEntityId, oldManagerEmail],
          [newManagerEntityId, newManagerEmail],
          [reportEntityId, reportEmail],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }

        // Run 1: reports to the old manager.
        await seedWorkdayRow(esClient, {
          userEmail: reportEmail,
          managerEmail: oldManagerEmail,
        });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          oldManagerEntityId,
          reportEntityId
        );

        // Run 2: Workday now reports a different manager.
        await esClient.deleteByQuery({
          index: LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        });
        await seedWorkdayRow(esClient, {
          userEmail: reportEmail,
          managerEmail: newManagerEmail,
        });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          newManagerEntityId,
          reportEntityId
        );
        // The point of the whole feature: the old edge is gone.
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          oldManagerEntityId,
          reportEntityId
        );
      }
    );

    apiTest(
      'does not clear a supervises relationship on an entity from a different source',
      async ({ apiClient, esClient }) => {
        // Proves the entity.source filter is not over-broad: the pre-run reset
        // must only touch entities with entity.source = ENTITY_SOURCE (Workday),
        // not entities belonging to other integrations sharing the same index.
        const runId = randomUUID().slice(0, 8);

        // Okta actor holding a RESOLVED supervises edge, as a previous Okta
        // maintainer run would have left it. Seeding `ids` (not just
        // raw_identifiers) is what makes this test able to fail: an absent
        // `ids` array and a cleared one both read as [].
        const oktaActorEmail = `okta.actor.${runId}@example.com`;
        const oktaTargetEmail = `okta.target.${runId}@example.com`;
        const oktaActorEntityId = `user:${oktaActorEmail}@okta`;
        const oktaTargetEntityId = `user:${oktaTargetEmail}@okta`;
        await seedUserEntity(esClient, {
          entityId: oktaActorEntityId,
          namespace: 'okta',
          email: oktaActorEmail,
          entitySource: 'entityanalytics_okta',
          relationship: {
            key: RELATIONSHIP_KEY,
            userEmails: [oktaTargetEmail],
            ids: [oktaTargetEntityId],
          },
        });

        // Workday worker + manager pair so the integration actually runs and
        // performs its pre-run reset.
        const managerEmail = `iso.mgr.${runId}@example.com`;
        const reportEmail = `iso.report.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;
        for (const [entityId, email] of [
          [managerEntityId, managerEmail],
          [reportEntityId, reportEmail],
        ] as Array<[string, string]>) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }
        await seedWorkdayRow(esClient, { userEmail: reportEmail, managerEmail });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // Workday run did real work: the manager received its report.
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);

        // Okta actor's supervises.ids must be unchanged — it is a different
        // entity document with entity.source = 'entityanalytics_okta', which
        // the Workday pre-run reset must not touch.
        const oktaIds = await getRelationshipIds(esClient, RELATIONSHIP_KEY, oktaActorEntityId);
        expect(oktaIds).toStrictEqual([oktaTargetEntityId]);
      }
    );

    apiTest(
      'preserves raw_identifiers on the entities it clears',
      async ({ apiClient, esClient }) => {
        // The reset removes only the maintainer-owned `ids` member. Removing the
        // whole relationship object would also delete `raw_identifiers`, which
        // other integrations populate and this maintainer only reads.
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `keepraw.mgr.${runId}@example.com`;
        const reportEmail = `keepraw.report.${runId}@example.com`;
        const rawTargetEmail = `keepraw.raw.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const reportEntityId = `user:${reportEmail}@${NAMESPACE}`;

        // The manager is a Workday entity, so the reset WILL clear its ids —
        // it carries raw_identifiers that must nevertheless survive.
        await seedUserEntity(esClient, {
          entityId: managerEntityId,
          namespace: NAMESPACE,
          email: managerEmail,
          entitySource: ENTITY_SOURCE,
          relationship: {
            key: RELATIONSHIP_KEY,
            userEmails: [rawTargetEmail],
            ids: [`user:${rawTargetEmail}@${NAMESPACE}`],
          },
        });
        await seedUserEntity(esClient, {
          entityId: reportEntityId,
          namespace: NAMESPACE,
          email: reportEmail,
          entitySource: ENTITY_SOURCE,
        });
        await seedWorkdayRow(esClient, { userEmail: reportEmail, managerEmail });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // The run cleared the seeded id and wrote the current one, proving the
        // reset actually touched this document.
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);
        expect(await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId)).toStrictEqual(
          [reportEntityId]
        );

        // raw_identifiers is not the maintainer's to delete.
        expect(
          await getRelationshipRawUserEmails(esClient, RELATIONSHIP_KEY, managerEntityId)
        ).toStrictEqual([rawTargetEmail]);
      }
    );

    apiTest(
      'keeps a manager who still has reports after the reset',
      async ({ apiClient, esClient }) => {
        // Guards the obvious failure mode of a reset: clearing without
        // repopulating.
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `keep.mgr.${runId}@example.com`;
        const firstReport = `keep.first.${runId}@example.com`;
        const secondReport = `keep.second.${runId}@example.com`;
        const managerEntityId = `user:${managerEmail}@${NAMESPACE}`;
        const firstEntityId = `user:${firstReport}@${NAMESPACE}`;
        const secondEntityId = `user:${secondReport}@${NAMESPACE}`;

        for (const [entityId, email] of [
          [managerEntityId, managerEmail],
          [firstEntityId, firstReport],
          [secondEntityId, secondReport],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: NAMESPACE,
            email,
            entitySource: ENTITY_SOURCE,
          });
        }

        await seedWorkdayRow(esClient, { userEmail: firstReport, managerEmail });
        await seedWorkdayRow(esClient, { userEmail: secondReport, managerEmail });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, firstEntityId);

        // Second run over unchanged data must end in the same state.
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, firstEntityId);
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, secondEntityId);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId);
        expect(ids.sort()).toStrictEqual([firstEntityId, secondEntityId].sort());
      }
    );
  }
);
