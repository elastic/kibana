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
  { userEmail, managerEmail, managerId }: WorkdayRow
) =>
  seedLogDocument(esClient, {
    index: LOG_INDEX,
    timestamp: HIRE_DATE,
    eventIngested: new Date(Date.now() - 5 * 60_000).toISOString(),
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
      // immediately after install races entity-store initialization.
      await waitForEntityStoreRunning(apiClient, defaultHeaders);

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
      'drops the edge when the manager is not in the entity store',
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
        await assertNoRelationshipId(
          esClient,
          RELATIONSHIP_KEY,
          absentManagerEntityId,
          reportEntityId
        );
      }
    );

    apiTest(
      'resolves a worker whose Hire_Date is years old but whose event.ingested is recent',
      async ({ apiClient, esClient }) => {
        // Regression guard for the Hire_Date trap: if the config ever falls back
        // to the engine's @timestamp lookback, this row is excluded and no edge
        // is written.
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
        // keyed actor matches the entity in the store and receives the edge; the
        // id-keyed actor (user:<managerId>@workday) 404s because no entity with
        // that EUID was seeded — that 404 is the intended drop path, not a bug.
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

        // The email-keyed actor has an entity and must receive the supervises edge.
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId, reportEntityId);
        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, managerEntityId);
        expect(ids).toStrictEqual([reportEntityId]);

        // The id-keyed actor has no entity; its write 404s and must produce no edge.
        await assertNoRelationshipId(esClient, RELATIONSHIP_KEY, managerIdEntityId, reportEntityId);
      }
    );
  }
);
