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
  assertNoRelationshipId,
  assertEntityDoesNotExist,
} from '../../fixtures/maintainers/helpers';

const LOG_INDEX = 'logs-google_workspace.users-default';
// The entity store derives `entity.namespace` (and `entity.source`) from `event.module`.
const NAMESPACE = 'google_workspace';
const ENTITY_SOURCE = 'google_workspace';
const RELATIONSHIP_KEY = 'supervises';
const MAINTAINER_ID = 'supervises';

interface UserRow {
  userEmail: string;
  /** `manager_email` is multi-valued: one value per `manager` relation on the user. */
  managerEmails?: string[];
  /**
   * How long ago this snapshot was collected. The stream sets `@timestamp` to the
   * collection time, which is what orders snapshots of the same user.
   */
  collectedAgoMinutes?: number;
}

const seedUserRow = async (
  esClient: Parameters<typeof seedLogDocument>[0],
  { userEmail, managerEmails, collectedAgoMinutes = 5 }: UserRow
) => {
  const collectedAt = new Date(Date.now() - collectedAgoMinutes * 60_000).toISOString();
  return seedLogDocument(esClient, {
    index: LOG_INDEX,
    timestamp: collectedAt,
    eventIngested: collectedAt,
    event: { kind: 'asset', module: 'google_workspace', category: ['iam'], type: ['user', 'info'] },
    integrationFields: {
      user: { email: userEmail, name: userEmail },
      data_stream: { dataset: 'google_workspace.users' },
      google_workspace: {
        users: {
          primary_email: userEmail,
          ...(managerEmails !== undefined && { manager_email: managerEmails }),
        },
      },
    },
  });
};

const seedEntity = async (
  esClient: Parameters<typeof seedUserEntity>[0],
  email: string,
  entitySource: string = ENTITY_SOURCE,
  namespace: string = NAMESPACE
) =>
  seedUserEntity(esClient, {
    entityId: `user:${email}@${namespace}`,
    namespace,
    email,
    entitySource,
  });

const entityIdOf = (email: string) => `user:${email}@${NAMESPACE}`;

apiTest.describe(
  'Entity Store supervises maintainer (google_workspace, log-inverted)',
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
      // timeout matters: `apiTest.setTimeout` above applies to tests, not hooks.
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

      await seedEntity(esClient, managerEmail);
      await seedEntity(esClient, reportEmail);
      await seedUserRow(esClient, { userEmail: reportEmail, managerEmails: [managerEmail] });

      await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

      await waitForRelationshipIds(
        esClient,
        RELATIONSHIP_KEY,
        entityIdOf(managerEmail),
        entityIdOf(reportEmail)
      );
      const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, entityIdOf(managerEmail));
      expect(ids).toStrictEqual([entityIdOf(reportEmail)]);
    });

    apiTest(
      'writes both reports of a shared manager onto that manager',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `shared.${runId}@example.com`;
        const firstReport = `first.${runId}@example.com`;
        const secondReport = `second.${runId}@example.com`;

        for (const email of [managerEmail, firstReport, secondReport]) {
          await seedEntity(esClient, email);
        }
        await seedUserRow(esClient, { userEmail: firstReport, managerEmails: [managerEmail] });
        await seedUserRow(esClient, { userEmail: secondReport, managerEmails: [managerEmail] });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(managerEmail),
          entityIdOf(firstReport)
        );
        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(managerEmail),
          entityIdOf(secondReport)
        );
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, entityIdOf(managerEmail));
        expect(ids.sort()).toStrictEqual(
          [entityIdOf(firstReport), entityIdOf(secondReport)].sort()
        );
      }
    );

    apiTest(
      'writes the report onto every manager when a user has several manager relations',
      async ({ apiClient, esClient }) => {
        // `manager_email` is multi-valued; the maintainer expands it after the
        // latest-snapshot collapse, so each manager entity receives the report.
        const runId = randomUUID().slice(0, 8);
        const firstManager = `multi.first.${runId}@example.com`;
        const secondManager = `multi.second.${runId}@example.com`;
        const reportEmail = `multi.report.${runId}@example.com`;

        for (const email of [firstManager, secondManager, reportEmail]) {
          await seedEntity(esClient, email);
        }
        await seedUserRow(esClient, {
          userEmail: reportEmail,
          managerEmails: [firstManager, secondManager],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(firstManager),
          entityIdOf(reportEmail)
        );
        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(secondManager),
          entityIdOf(reportEmail)
        );
      }
    );

    apiTest('writes nothing for a user with no manager', async ({ apiClient, esClient }) => {
      const runId = randomUUID().slice(0, 8);
      const loneEmail = `lone.${runId}@example.com`;

      await seedEntity(esClient, loneEmail);
      await seedUserRow(esClient, { userEmail: loneEmail });

      await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

      const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, entityIdOf(loneEmail));
      expect(ids).toStrictEqual([]);
    });

    apiTest(
      'drops the relationship when the manager is not in the entity store',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const reportEmail = `orphan.${runId}@example.com`;
        const absentManagerEmail = `absent.${runId}@example.com`;

        // Only the report exists; the manager is deliberately never seeded. This
        // also stands in for a `manager_email` that is an alias of a real user.
        await seedEntity(esClient, reportEmail);
        await seedUserRow(esClient, {
          userEmail: reportEmail,
          managerEmails: [absentManagerEmail],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // The write 404s rather than minting a manager entity from a foreign key.
        // Both assertions are needed: assertNoRelationshipId maps a missing
        // document to [], so on its own it would also pass if the maintainer had
        // created an empty manager entity.
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(absentManagerEmail),
          entityIdOf(reportEmail)
        );
        await assertEntityDoesNotExist(esClient, entityIdOf(absentManagerEmail));
      }
    );

    apiTest(
      'drops the relationship when the report is not in the entity store',
      async ({ apiClient, esClient }) => {
        // validateTargetIds: a target with no entity must not end up in the manager's ids.
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `ghost.mgr.${runId}@example.com`;
        const ghostReportEmail = `ghost.report.${runId}@example.com`;

        await seedEntity(esClient, managerEmail);
        await seedUserRow(esClient, {
          userEmail: ghostReportEmail,
          managerEmails: [managerEmail],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(managerEmail),
          entityIdOf(ghostReportEmail)
        );
      }
    );

    apiTest(
      'follows a manager change instead of reporting to both managers',
      async ({ apiClient, esClient }) => {
        // The stream re-reads the whole directory every poll, so a user who changes
        // managers has snapshots naming each. Grouping all snapshots would put the
        // report under BOTH managers.
        const runId = randomUUID().slice(0, 8);
        const oldManagerEmail = `old.mgr.${runId}@example.com`;
        const newManagerEmail = `new.mgr.${runId}@example.com`;
        const reportEmail = `moved.${runId}@example.com`;

        for (const email of [oldManagerEmail, newManagerEmail, reportEmail]) {
          await seedEntity(esClient, email);
        }

        // Two snapshots of the same user: the older names the previous manager.
        await seedUserRow(esClient, {
          userEmail: reportEmail,
          managerEmails: [oldManagerEmail],
          collectedAgoMinutes: 60,
        });
        await seedUserRow(esClient, {
          userEmail: reportEmail,
          managerEmails: [newManagerEmail],
          collectedAgoMinutes: 5,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(newManagerEmail),
          entityIdOf(reportEmail)
        );
        expect(
          await getRelationshipIds(esClient, RELATIONSHIP_KEY, entityIdOf(newManagerEmail))
        ).toStrictEqual([entityIdOf(reportEmail)]);

        // The previous manager must not keep the report.
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(oldManagerEmail),
          entityIdOf(reportEmail)
        );
      }
    );

    apiTest(
      'moves the report to the new manager when the user is reassigned',
      async ({ apiClient, esClient }) => {
        // Two runs, not two snapshots: run 1 establishes the edge, run 2 must
        // remove it. Only the pre-run reset can do that — additive writes never
        // retract.
        const runId = randomUUID().slice(0, 8);
        const oldManagerEmail = `reassign.old.${runId}@example.com`;
        const newManagerEmail = `reassign.new.${runId}@example.com`;
        const reportEmail = `reassign.report.${runId}@example.com`;

        for (const email of [oldManagerEmail, newManagerEmail, reportEmail]) {
          await seedEntity(esClient, email);
        }

        // Run 1: reports to the old manager.
        await seedUserRow(esClient, { userEmail: reportEmail, managerEmails: [oldManagerEmail] });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(oldManagerEmail),
          entityIdOf(reportEmail)
        );

        // Run 2: the directory now reports a different manager.
        await esClient.deleteByQuery({
          index: LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        });
        await seedUserRow(esClient, { userEmail: reportEmail, managerEmails: [newManagerEmail] });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(newManagerEmail),
          entityIdOf(reportEmail)
        );
        // The point of the whole feature: the old edge is gone.
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(oldManagerEmail),
          entityIdOf(reportEmail)
        );
      }
    );

    apiTest(
      'does not clear a supervises relationship on an entity from a different source',
      async ({ apiClient, esClient }) => {
        // Proves the entity.source filter is not over-broad: the pre-run reset
        // must only touch entities with entity.source = google_workspace.
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

        // Google Workspace pair so the integration actually runs and performs its
        // pre-run reset.
        const managerEmail = `iso.mgr.${runId}@example.com`;
        const reportEmail = `iso.report.${runId}@example.com`;
        await seedEntity(esClient, managerEmail);
        await seedEntity(esClient, reportEmail);
        await seedUserRow(esClient, { userEmail: reportEmail, managerEmails: [managerEmail] });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // The Google Workspace run did real work: the manager received its report.
        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(managerEmail),
          entityIdOf(reportEmail)
        );

        const oktaIds = await getRelationshipIds(esClient, RELATIONSHIP_KEY, oktaActorEntityId);
        expect(oktaIds).toStrictEqual([oktaTargetEntityId]);
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

        for (const email of [managerEmail, firstReport, secondReport]) {
          await seedEntity(esClient, email);
        }
        await seedUserRow(esClient, { userEmail: firstReport, managerEmails: [managerEmail] });
        await seedUserRow(esClient, { userEmail: secondReport, managerEmails: [managerEmail] });
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });
        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(managerEmail),
          entityIdOf(firstReport)
        );

        // Second run over unchanged data must end in the same state.
        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(managerEmail),
          entityIdOf(firstReport)
        );
        await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityIdOf(managerEmail),
          entityIdOf(secondReport)
        );
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, entityIdOf(managerEmail));
        expect(ids.sort()).toStrictEqual(
          [entityIdOf(firstReport), entityIdOf(secondReport)].sort()
        );
      }
    );

    apiTest(
      'keeps existing relationships when the feed stopped and only expired snapshots remain',
      async ({ apiClient, esClient }) => {
        // The engine's @timestamp lookback applies to this config, so a directory
        // snapshot that stopped being refreshed long ago is not trusted. A stopped
        // feed is not evidence that every relationship ended either: the reset must
        // be skipped when nothing inside the lookback can repopulate it.
        const runId = randomUUID().slice(0, 8);
        const managerEmail = `stale.mgr.${runId}@example.com`;
        const resolvedReportEmail = `stale.resolved.${runId}@example.com`;
        const expiredReportEmail = `stale.expired.${runId}@example.com`;

        // An edge resolved by an earlier run. Seeding `ids` (not just
        // raw_identifiers) is what makes this test able to fail: an absent `ids`
        // array and a cleared one both read as [].
        await seedUserEntity(esClient, {
          entityId: entityIdOf(managerEmail),
          namespace: NAMESPACE,
          email: managerEmail,
          entitySource: ENTITY_SOURCE,
          relationship: {
            key: RELATIONSHIP_KEY,
            userEmails: [resolvedReportEmail],
            ids: [entityIdOf(resolvedReportEmail)],
          },
        });
        await seedEntity(esClient, resolvedReportEmail);
        await seedEntity(esClient, expiredReportEmail);

        // Leave only an expired snapshot in the stream, so the run sees no
        // document inside the lookback window.
        await esClient.deleteByQuery({
          index: LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        });
        await seedUserRow(esClient, {
          userEmail: expiredReportEmail,
          managerEmails: [managerEmail],
          collectedAgoMinutes: 45 * 24 * 60,
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        // The earlier edge survives, and the expired row adds nothing.
        expect(
          await getRelationshipIds(esClient, RELATIONSHIP_KEY, entityIdOf(managerEmail))
        ).toStrictEqual([entityIdOf(resolvedReportEmail)]);
      }
    );
  }
);
