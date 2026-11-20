/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes, randomUUID } from 'crypto';
import { expect } from '@kbn/scout-security/api';
import type { ApiClientFixture, EsClient, KibanaRole } from '@kbn/scout-security';
import {
  apiTest,
  tags,
  findStepOutput,
  runCleanupSteps,
  runWorkflow,
  spaceUrl,
  waitForExecution,
} from '../fixtures';

// Inlined: Playwright's esbuild cannot load the managed YAML behind @kbn/workflows/managed, nor
// the AlertZero server constants.
const REVOKE_WORKFLOW_ID = 'system-security-floor-alert-triage-revoke-decision';
const DECISIONS_INDEX = '.ai-index-idx-security-triage-decisions';
const CLOSED_TAG_PREFIX = 'az:closed_by_decision:';

const SETUP_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 180_000;
const RUN_TIMEOUT_MS = 120_000;
const WORKFLOW_READY_TIMEOUT_MS = 30_000;

const RUN = Date.now();
const SPACE_A = `scout-revoke-a-${RUN}`;
const SPACE_B = `scout-revoke-b-${RUN}`;
const alertsIndex = (spaceId: string) => `.alerts-security.alerts-${spaceId}`;

const newDecisionId = () => `fp-decision-${randomBytes(8).toString('hex')}`;
const DECISION_A = newDecisionId();
const DECISION_B = newDecisionId();

/**
 * Can run workflows and work alerts in space A, but has no privilege on the decisions index, like
 * an analyst. Elasticsearch hides decisions from such a user, so revoke must refuse to act.
 */
const ANALYST_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      { names: ['.alerts-security.alerts-*'], privileges: ['read', 'write', 'maintenance'] },
    ],
  },
  kibana: [{ base: ['all'], feature: {}, spaces: [SPACE_A] }],
};

/**
 * Creates the space's alerts index as the alerting framework does on its first alert: a backing
 * index behind the space alias. The mapping comes from the security alerts index template, which
 * Kibana installs at start, so `kibana.alert.workflow_tags` is a keyword and the revoke's exact tag
 * search behaves as in a deployment. A write to the bare alias name would auto-create an index that
 * maps it as text, and `POST api/detection_engine/index` creates no alias for a new space. The
 * simulation needs no concrete index, so it works before anything wrote to the default space.
 */
const createAlertsIndex = async (esClient: EsClient, spaceId: string) => {
  const { template } = await esClient.indices.simulateIndexTemplate({
    name: '.internal.alerts-security.alerts-default-000001',
  });
  await esClient.indices.create({
    index: `.internal.alerts-security.alerts-${spaceId}-000001`,
    aliases: { [alertsIndex(spaceId)]: { is_write_index: true, is_hidden: true } },
    // The alerts mapping has more fields than the default limit. The default space's lifecycle
    // policy is left out: its rollover alias names the default space.
    settings: { hidden: true, mapping: template.settings?.index?.mapping },
    mappings: template.mappings,
  });
};

/** The fields revoke reads, in the shape the store step writes. No text fields, so no inference. */
const decisionDocument = (id: string, spaceId: string) => {
  const now = new Date();
  return {
    '@timestamp': now.toISOString(),
    id,
    updated_at: now.toISOString(),
    type: 'security.fp_decision',
    tags: ['watch:alert_triage', 'decision:false_positive'],
    permissions: { kibana: { privileges: [{ space: spaceId }] } },
    attributes: {
      decision: 'false_positive',
      key_hash: id.slice('fp-decision-'.length),
      space_id: spaceId,
      producer: 'scout',
    },
    expires_at: new Date(now.getTime() + 86_400_000).toISOString(),
  };
};

/** Alerts a decision closed: closed as a false positive and tagged with the decision. */
const seedClosedAlerts = async (
  esClient: EsClient,
  spaceId: string,
  decisionId: string,
  count: number
): Promise<string[]> => {
  const ids = Array.from({ length: count }, () => randomUUID());
  const now = new Date().toISOString();
  const response = await esClient.bulk({
    index: alertsIndex(spaceId),
    refresh: 'wait_for',
    operations: ids.flatMap((uuid) => [
      { create: { _id: uuid } },
      {
        '@timestamp': now,
        'event.kind': 'signal',
        'kibana.space_ids': [spaceId],
        'kibana.alert.uuid': uuid,
        'kibana.alert.start': now,
        'kibana.alert.rule.uuid': `scout-revoke-rule-${RUN}`,
        'kibana.alert.rule.name': `scout-revoke-${RUN}`,
        'kibana.alert.rule.rule_type_id': 'siem.queryRule',
        'kibana.alert.rule.consumer': 'siem',
        'kibana.alert.rule.producer': 'siem',
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'closed',
        'kibana.alert.workflow_reason': 'false_positive',
        'kibana.alert.workflow_tags': [`${CLOSED_TAG_PREFIX}${decisionId}`],
      },
    ]),
  });
  if (response.errors) {
    const failed = response.items.filter((item) => item.create?.error);
    throw new Error(`Seeding alerts failed: ${JSON.stringify(failed.slice(0, 3))}`);
  }
  return ids;
};

interface AlertState {
  status: string;
  tags: string[];
}

const readAlerts = async (
  esClient: EsClient,
  spaceId: string,
  ids: string[]
): Promise<AlertState[]> => {
  const response = await esClient.search<Record<string, unknown>>({
    index: alertsIndex(spaceId),
    size: ids.length,
    query: { ids: { values: ids } },
  });
  expect(response.hits.hits).toHaveLength(ids.length);
  return response.hits.hits.map(({ _source }) => ({
    status: String(_source?.['kibana.alert.workflow_status']),
    tags: (_source?.['kibana.alert.workflow_tags'] as string[] | undefined) ?? [],
  }));
};

const closedByDecision = (decisionId: string): AlertState => ({
  status: 'closed',
  tags: [`${CLOSED_TAG_PREFIX}${decisionId}`],
});

const readLifecycle = async (esClient: EsClient, id: string): Promise<string | undefined> => {
  const { _source } = await esClient.get<{ governance?: { lifecycle?: { status?: string } } }>({
    index: DECISIONS_INDEX,
    id,
  });
  return _source?.governance?.lifecycle?.status;
};

/**
 * Revokes a triage decision through the managed workflow, with two spaces that each hold a
 * decision and the alerts it closed. The decisions and alerts are seeded directly, so no model
 * and no sweep is needed. The checks are the ones the step's unit tests mock: which alerts index
 * the run searches, and whether a real analyst's credentials can delete a decision.
 */
apiTest.describe.serial(
  'Alert Triage revoke decision - two spaces',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;
    let alertsA: string[] = [];
    let alertsB: string[] = [];

    const revoke = async (
      apiClient: ApiClientFixture,
      headers: Record<string, string>,
      decisionId: string,
      spaceId: string
    ) => {
      const executionId = await runWorkflow(
        apiClient,
        headers,
        REVOKE_WORKFLOW_ID,
        { decision_id: decisionId },
        spaceId
      );
      const execution = await waitForExecution(
        apiClient,
        headers,
        executionId,
        RUN_TIMEOUT_MS,
        spaceId
      );
      expect(execution.status).toBe('completed');
      return findStepOutput(execution, 'revoke_decision');
    };

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient, esClient }) => {
      apiTest.setTimeout(SETUP_TIMEOUT_MS);
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...cookieHeader, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };

      for (const spaceId of [SPACE_A, SPACE_B]) {
        await apiServices.spaces.create({ id: spaceId, name: spaceId });
        await createAlertsIndex(esClient, spaceId);
        await expect
          .poll(
            async () => {
              const response = await apiClient.get(
                spaceUrl(`api/workflows/workflow/${REVOKE_WORKFLOW_ID}`, spaceId),
                { headers: adminHeaders, responseType: 'json' }
              );
              return response.statusCode === 200 && (response.body as { valid?: boolean }).valid;
            },
            { timeout: WORKFLOW_READY_TIMEOUT_MS, intervals: [1_000] }
          )
          .toBe(true);
      }

      const seeded = await esClient.bulk({
        refresh: 'wait_for',
        operations: [
          { index: { _index: DECISIONS_INDEX, _id: DECISION_A } },
          decisionDocument(DECISION_A, SPACE_A),
          { index: { _index: DECISIONS_INDEX, _id: DECISION_B } },
          decisionDocument(DECISION_B, SPACE_B),
        ],
      });
      if (seeded.errors) {
        const failed = seeded.items.filter((item) => item.index?.error);
        throw new Error(`Seeding decisions failed: ${JSON.stringify(failed.slice(0, 2))}`);
      }
      alertsA = await seedClosedAlerts(esClient, SPACE_A, DECISION_A, 3);
      alertsB = await seedClosedAlerts(esClient, SPACE_B, DECISION_B, 2);
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      apiTest.setTimeout(SETUP_TIMEOUT_MS);
      await runCleanupSteps([
        {
          name: 'delete the seeded decisions',
          run: () =>
            esClient.deleteByQuery({
              index: DECISIONS_INDEX,
              refresh: true,
              conflicts: 'proceed',
              ignore_unavailable: true,
              query: { ids: { values: [DECISION_A, DECISION_B] } },
            }),
        },
        ...[SPACE_A, SPACE_B].flatMap((spaceId) => [
          { name: `delete space ${spaceId}`, run: () => apiServices.spaces.delete(spaceId) },
          // Deleting the space leaves its alerts index behind. Resolved by name: wildcard
          // deletes are refused by default.
          {
            name: `delete the alerts index of ${spaceId}`,
            run: async () => {
              const backing = Object.keys(
                await esClient.indices.get({
                  index: alertsIndex(spaceId),
                  ignore_unavailable: true,
                })
              );
              if (backing.length > 0) await esClient.indices.delete({ index: backing });
            },
          },
        ]),
      ]);
    });

    apiTest(
      'refuses an analyst who cannot write the decisions index, and changes nothing',
      async ({ samlAuth, apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const { cookieHeader } = await samlAuth.asInteractiveUser(ANALYST_ROLE);
        const headers = { ...cookieHeader, 'kbn-xsrf': 'true' };

        const output = await revoke(apiClient, headers, DECISION_A, SPACE_A);

        expect(output).toStrictEqual({
          status: 'denied',
          alerts_reopened: 0,
          alerts_released: 0,
          failures: 0,
        });
        expect(await readLifecycle(esClient, DECISION_A)).toBeUndefined();
        expect(await readAlerts(esClient, SPACE_A, alertsA)).toStrictEqual(
          alertsA.map(() => closedByDecision(DECISION_A))
        );
      }
    );

    apiTest(
      "treats another space's decision as missing: not deleted, and no alert of either space changes",
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);

        const output = await revoke(apiClient, adminHeaders, DECISION_A, SPACE_B);

        expect(output).toStrictEqual({
          status: 'not_found',
          alerts_reopened: 0,
          alerts_released: 0,
          failures: 0,
        });
        expect(await readLifecycle(esClient, DECISION_A)).toBeUndefined();
        expect(await readAlerts(esClient, SPACE_A, alertsA)).toStrictEqual(
          alertsA.map(() => closedByDecision(DECISION_A))
        );
        expect(await readAlerts(esClient, SPACE_B, alertsB)).toStrictEqual(
          alertsB.map(() => closedByDecision(DECISION_B))
        );
      }
    );

    apiTest(
      "deletes its own space's decision and reopens only that space's alerts",
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);

        const output = await revoke(apiClient, adminHeaders, DECISION_A, SPACE_A);

        expect(output).toStrictEqual({
          status: 'ok',
          alerts_reopened: alertsA.length,
          alerts_released: 0,
          failures: 0,
        });
        expect(await readLifecycle(esClient, DECISION_A)).toBe('deleted');
        expect(await readAlerts(esClient, SPACE_A, alertsA)).toStrictEqual(
          alertsA.map(() => ({ status: 'open', tags: [] }))
        );
        expect(await readLifecycle(esClient, DECISION_B)).toBeUndefined();
        expect(await readAlerts(esClient, SPACE_B, alertsB)).toStrictEqual(
          alertsB.map(() => closedByDecision(DECISION_B))
        );
      }
    );
  }
);
