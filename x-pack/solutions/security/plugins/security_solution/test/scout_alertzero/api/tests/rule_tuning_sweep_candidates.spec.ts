/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { ApiClientFixture, EsClient } from '@kbn/scout-security';
import {
  apiTest,
  tags,
  enableAlertZeroInSpace,
  findStepOutput,
  readAlertZeroEnabledInSpace,
  runCleanupSteps,
  runWorkflow,
  setAlertZeroEnabledInSpace,
  waitForExecution,
} from '../fixtures';

// Inlined: Playwright's esbuild cannot load the managed YAML behind @kbn/workflows/managed.
const RULE_TUNING_SWEEP_WORKFLOW_ID = 'system-security-rule-tuning-worker';
const REVIEWED_TAG = 'detection-watch:tuning-reviewed';
const ALERTS_INDEX = '.alerts-security.alerts-default';
const RULES_URL = '/api/detection_engine/rules';
const RULE_HEADERS = { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' };

const SETUP_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 240_000;
const SWEEP_TIMEOUT_MS = 120_000;
const WORKFLOW_READY_TIMEOUT_MS = 30_000;

const RUN = Date.now();
const namePrefix = `scout-tuning-${RUN}`;

const SWEEP_INPUTS = {
  autonomy_level: 'manual',
  min_fp_count: 10,
  min_fp_rate_pct: 50,
  analysis_window_days: 7,
  max_rules_per_sweep: 10,
};

interface AlertSpec {
  ruleId: string;
  ruleName: string;
  revision?: number;
  count: number;
  falsePositive: boolean;
  reviewed?: boolean;
  hoursAgo: number;
}

const buildAlerts = ({
  ruleId,
  ruleName,
  revision = 0,
  count,
  falsePositive,
  reviewed = false,
  hoursAgo,
}: AlertSpec) =>
  Array.from({ length: count }, (_, i) => {
    const uuid = randomUUID();
    const timestamp = new Date(Date.now() - hoursAgo * 3_600_000 - i * 1000).toISOString();
    return {
      _id: uuid,
      doc: {
        '@timestamp': timestamp,
        'event.kind': 'signal',
        'kibana.space_ids': ['default'],
        'kibana.alert.uuid': uuid,
        'kibana.alert.start': timestamp,
        'kibana.alert.rule.uuid': ruleId,
        'kibana.alert.rule.name': ruleName,
        'kibana.alert.rule.revision': revision,
        'kibana.alert.rule.rule_type_id': 'siem.queryRule',
        'kibana.alert.rule.consumer': 'siem',
        'kibana.alert.rule.producer': 'siem',
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': falsePositive ? 'closed' : 'open',
        ...(falsePositive && { 'kibana.alert.workflow_reason': 'false_positive' }),
        'kibana.alert.workflow_tags': reviewed ? [REVIEWED_TAG] : [],
      },
    };
  });

const seedAlerts = async (esClient: EsClient, specs: AlertSpec[]) => {
  const alerts = specs.flatMap(buildAlerts);
  const response = await esClient.bulk({
    index: ALERTS_INDEX,
    refresh: 'wait_for',
    operations: alerts.flatMap(({ _id, doc }) => [{ create: { _id } }, doc]),
  });
  if (response.errors) {
    const failed = response.items.filter((item) => item.create?.error);
    throw new Error(`Seeding alerts failed: ${JSON.stringify(failed.slice(0, 3))}`);
  }
};

const clearAlerts = (esClient: EsClient) =>
  esClient.deleteByQuery({
    index: ALERTS_INDEX,
    refresh: true,
    conflicts: 'proceed',
    query: { prefix: { 'kibana.alert.rule.name': namePrefix } },
  });

const createRule = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  name: string
) => {
  const response = await apiClient.post(RULES_URL, {
    headers: { ...headers, ...RULE_HEADERS },
    responseType: 'json',
    body: {
      ...CUSTOM_QUERY_RULE,
      rule_id: `${name}-rule`,
      name,
      index: [`logs-${namePrefix}-none-*`],
      query: `event.module: "${namePrefix}-nomatch"`,
      from: 'now-6m',
      interval: '5m',
    },
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Create rule ${name}: status ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return response.body as { id: string; revision: number };
};

const patchRule = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  body: Record<string, unknown>
) => {
  const response = await apiClient.patch(RULES_URL, {
    headers: { ...headers, ...RULE_HEADERS },
    responseType: 'json',
    body,
  });
  if (response.statusCode !== 200) {
    throw new Error(`Patch rule: status ${response.statusCode} ${JSON.stringify(response.body)}`);
  }
  return response.body as { id: string; revision: number };
};

const launchedRules = (execution: Awaited<ReturnType<typeof waitForExecution>>) => {
  const output = findStepOutput(execution, 'resolve_fanout_rows') as
    | { rows?: unknown[][] }
    | undefined;
  return (output?.rows ?? []).map((row) => ({ uuid: row[0] as string, fpCount: row[1] as number }));
};

/**
 * Runs the Rule Tuning sweep against seeded alerts and checks which rules it launches
 * reviews for. Reviews start under `autonomy_level: manual`, so they park at their
 * analyst gate and call no model. Shares the default space's alerts index; every seeded
 * alert carries a run-unique rule name and is deleted afterwards.
 */
apiTest.describe.serial(
  'Rule Tuning sweep - candidate rules',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminHeaders: Record<string, string>;
    let alertZeroBaseline: boolean | undefined;
    const ruleIds: string[] = [];

    const sweep = async (apiClient: ApiClientFixture) => {
      const executionId = await runWorkflow(
        apiClient,
        adminHeaders,
        RULE_TUNING_SWEEP_WORKFLOW_ID,
        SWEEP_INPUTS
      );
      return waitForExecution(apiClient, adminHeaders, executionId, SWEEP_TIMEOUT_MS);
    };

    const newRule = async (apiClient: ApiClientFixture, scenario: string) => {
      const rule = await createRule(apiClient, adminHeaders, `${namePrefix}-${scenario}`);
      ruleIds.push(rule.id);
      return rule;
    };

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      apiTest.setTimeout(SETUP_TIMEOUT_MS);
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...cookieHeader, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };

      alertZeroBaseline = await readAlertZeroEnabledInSpace({
        apiClient,
        headers: adminHeaders,
        spaceId: 'default',
      });
      await enableAlertZeroInSpace({ apiClient, headers: adminHeaders, spaceId: 'default' });

      const index = await apiClient.post('/api/detection_engine/index', {
        headers: { ...adminHeaders, ...RULE_HEADERS },
        responseType: 'json',
      });
      if (index.statusCode !== 200) {
        throw new Error(
          `Create alerts index: status ${index.statusCode} ${JSON.stringify(index.body)}`
        );
      }

      await expect
        .poll(
          async () => {
            const response = await apiClient.get(
              `/api/workflows/workflow/${RULE_TUNING_SWEEP_WORKFLOW_ID}`,
              { headers: adminHeaders, responseType: 'json' }
            );
            return response.statusCode === 200 && (response.body as { valid?: boolean }).valid;
          },
          { timeout: WORKFLOW_READY_TIMEOUT_MS, intervals: [1_000] }
        )
        .toBe(true);
    });

    // Each test seeds its own alerts and clears them, so the rules of one never reach the next.
    apiTest.afterEach(async ({ esClient }) => {
      await clearAlerts(esClient);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      apiTest.setTimeout(SETUP_TIMEOUT_MS);
      await runCleanupSteps([
        {
          name: `delete ${ruleIds.length} rules`,
          run: async () => {
            if (ruleIds.length === 0) return;
            await apiClient.post(`${RULES_URL}/_bulk_action`, {
              headers: { ...adminHeaders, ...RULE_HEADERS },
              responseType: 'json',
              body: { action: 'delete', ids: ruleIds },
            });
          },
        },
        { name: 'delete seeded alerts', run: () => clearAlerts(esClient) },
        {
          name: 'restore default space AlertZero setting',
          run: async () => {
            if (!adminHeaders || alertZeroBaseline === undefined) return;
            await setAlertZeroEnabledInSpace({
              apiClient,
              headers: adminHeaders,
              spaceId: 'default',
              enabled: alertZeroBaseline,
            });
          },
        },
      ]);
    });

    apiTest(
      'starts a review only for enabled rules with enough unreviewed false positives at a high enough rate',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const allFp = await newRule(apiClient, 'all-fp');
        const mixed = await newRule(apiClient, 'mixed');
        const lowRate = await newRule(apiClient, 'low-rate');
        const fewFp = await newRule(apiClient, 'few-fp');
        const reviewed = await newRule(apiClient, 'reviewed');
        const partlyReviewed = await newRule(apiClient, 'partly-reviewed');
        const disabled = await newRule(apiClient, 'disabled');
        const edited = await newRule(apiClient, 'edited');

        await patchRule(apiClient, adminHeaders, { id: disabled.id, enabled: false });
        const editedNow = await patchRule(apiClient, adminHeaders, {
          id: edited.id,
          name: `${namePrefix}-edited-v2`,
        });
        expect(editedNow.revision).toBe(1);

        const name = (scenario: string) => `${namePrefix}-${scenario}`;
        await seedAlerts(esClient, [
          {
            ruleId: allFp.id,
            ruleName: name('all-fp'),
            count: 12,
            falsePositive: true,
            hoursAgo: 1,
          },
          {
            ruleId: mixed.id,
            ruleName: name('mixed'),
            count: 20,
            falsePositive: true,
            hoursAgo: 1,
          },
          {
            ruleId: mixed.id,
            ruleName: name('mixed'),
            count: 10,
            falsePositive: false,
            hoursAgo: 1,
          },
          {
            ruleId: lowRate.id,
            ruleName: name('low-rate'),
            count: 20,
            falsePositive: true,
            hoursAgo: 1,
          },
          {
            ruleId: lowRate.id,
            ruleName: name('low-rate'),
            count: 40,
            falsePositive: false,
            hoursAgo: 1,
          },
          {
            ruleId: fewFp.id,
            ruleName: name('few-fp'),
            count: 5,
            falsePositive: true,
            hoursAgo: 1,
          },
          {
            ruleId: reviewed.id,
            ruleName: name('reviewed'),
            count: 12,
            falsePositive: true,
            reviewed: true,
            hoursAgo: 2,
          },
          {
            ruleId: partlyReviewed.id,
            ruleName: name('partly-reviewed'),
            count: 12,
            falsePositive: true,
            reviewed: true,
            hoursAgo: 3,
          },
          {
            ruleId: partlyReviewed.id,
            ruleName: name('partly-reviewed'),
            count: 11,
            falsePositive: true,
            hoursAgo: 1,
          },
          {
            ruleId: disabled.id,
            ruleName: name('disabled'),
            count: 30,
            falsePositive: true,
            hoursAgo: 1,
          },
          // Seeded at revision 0 while the rule is at revision 1.
          {
            ruleId: edited.id,
            ruleName: name('edited'),
            count: 30,
            falsePositive: true,
            hoursAgo: 1,
          },
        ]);

        const execution = await sweep(apiClient);
        const launched = launchedRules(execution);
        const launchedFor = (id: string) => launched.find(({ uuid }) => uuid === id);

        await apiTest.step(
          'the sweep finished without a failed lookup, screen or harvest',
          async () => {
            expect(findStepOutput(execution, 'emit_result')).toMatchObject({
              harvest_failed: false,
            });
          }
        );

        await apiTest.step(
          'a rule whose 12 alerts were all closed as false positives gets a review for 12',
          async () => {
            expect(launchedFor(allFp.id)).toStrictEqual({ uuid: allFp.id, fpCount: 12 });
          }
        );

        await apiTest.step(
          'a rule with 20 false positives and 10 open alerts (67%) gets a review for 20',
          async () => {
            expect(launchedFor(mixed.id)).toStrictEqual({ uuid: mixed.id, fpCount: 20 });
          }
        );

        await apiTest.step(
          'a rule with 20 false positives and 40 open alerts (33%) is below the 50% rate and gets no review',
          async () => {
            expect(launchedFor(lowRate.id)).toBeUndefined();
          }
        );

        await apiTest.step(
          'a rule with only 5 false positives is below the minimum of 10 and gets no review',
          async () => {
            expect(launchedFor(fewFp.id)).toBeUndefined();
          }
        );

        await apiTest.step(
          'a rule whose 12 false positives were all reviewed already gets no review',
          async () => {
            expect(launchedFor(reviewed.id)).toBeUndefined();
          }
        );

        await apiTest.step(
          'a rule with 12 reviewed false positives and 11 newer unreviewed ones gets a review for the 11',
          async () => {
            expect(launchedFor(partlyReviewed.id)).toStrictEqual({
              uuid: partlyReviewed.id,
              fpCount: 11,
            });
          }
        );

        await apiTest.step('a disabled rule with 30 false positives gets no review', async () => {
          expect(launchedFor(disabled.id)).toBeUndefined();
        });

        await apiTest.step(
          'a rule edited since its 30 false positives gets no review for the old version',
          async () => {
            expect(launchedFor(edited.id)).toBeUndefined();
          }
        );

        await apiTest.step(
          'exactly those three rules get a review, the one with most false positives first',
          async () => {
            expect(launched).toStrictEqual([
              { uuid: mixed.id, fpCount: 20 },
              { uuid: allFp.id, fpCount: 12 },
              { uuid: partlyReviewed.id, fpCount: 11 },
            ]);
          }
        );
      }
    );

    // security-team#20315: a rule's alerts outlive its deletion or disabling, and the
    // sweep used to rank the 20 noisiest rules before checking which were enabled, so
    // 20 such rules starved every enabled one. Each case seeds more noisy rules than
    // the sweep has candidate slots, each noisier than the two enabled rules.
    const seedStarvation = async (
      apiClient: ApiClientFixture,
      esClient: EsClient,
      kind: string,
      noisyRuleIds: string[],
      noisyAlerts = (ruleId: string, ruleName: string): AlertSpec[] => [
        { ruleId, ruleName, count: 25, falsePositive: true, hoursAgo: 2 },
      ]
    ) => {
      const enabled = [
        await newRule(apiClient, `${kind}-a`),
        await newRule(apiClient, `${kind}-b`),
      ];
      await seedAlerts(esClient, [
        ...noisyRuleIds.flatMap((ruleId, i) => noisyAlerts(ruleId, `${namePrefix}-${kind}-${i}`)),
        ...enabled.map(({ id }, i) => ({
          ruleId: id,
          ruleName: `${namePrefix}-${kind}-${i === 0 ? 'a' : 'b'}`,
          count: 12,
          falsePositive: true,
          hoursAgo: 1,
        })),
      ]);
      return enabled.map(({ id }) => id).sort();
    };

    apiTest(
      '20 deleted rules with more false positives than two enabled rules do not crowd them out',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const deleted = Array.from({ length: 20 }, () => randomUUID());
        const enabled = await seedStarvation(apiClient, esClient, 'deleted', deleted);

        const execution = await sweep(apiClient);
        const launched = launchedRules(execution).map(({ uuid }) => uuid);

        await apiTest.step('none of the deleted rules gets a review', async () => {
          expect(launched.filter((uuid) => deleted.includes(uuid))).toStrictEqual([]);
        });

        await apiTest.step('both enabled rules get a review', async () => {
          expect(launched.sort()).toStrictEqual(enabled);
        });
      }
    );

    apiTest(
      '20 disabled rules with more false positives than two enabled rules do not crowd them out',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const disabled: string[] = [];
        for (let i = 0; i < 20; i++) {
          const rule = await newRule(apiClient, `disabled-${i}`);
          await patchRule(apiClient, adminHeaders, { id: rule.id, enabled: false });
          disabled.push(rule.id);
        }
        const enabled = await seedStarvation(apiClient, esClient, 'disabled', disabled);

        const execution = await sweep(apiClient);
        const launched = launchedRules(execution).map(({ uuid }) => uuid);

        await apiTest.step('none of the disabled rules gets a review', async () => {
          expect(launched.filter((uuid) => disabled.includes(uuid))).toStrictEqual([]);
        });

        await apiTest.step('both enabled rules get a review', async () => {
          expect(launched.sort()).toStrictEqual(enabled);
        });
      }
    );

    // A reviewed rule keeps its tagged FPs in the window, so it would pass the FP-rate
    // gate and outrank unreviewed rules for the screen's slots. The review tags only
    // the newest 100 ids and the watermark retires the older ones, so each reviewed
    // rule here also has 50 older untagged FPs: an untagged count alone would keep it
    // in the screen; only the watermark comparison drops it.
    apiTest(
      '20 already reviewed rules with 150 false positives each do not crowd out two unreviewed rules',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const reviewed: string[] = [];
        for (let i = 0; i < 20; i++) {
          reviewed.push((await newRule(apiClient, `reviewed-${i}`)).id);
        }
        const enabled = await seedStarvation(
          apiClient,
          esClient,
          'reviewed',
          reviewed,
          (ruleId, ruleName) => [
            { ruleId, ruleName, count: 100, falsePositive: true, reviewed: true, hoursAgo: 2 },
            { ruleId, ruleName, count: 50, falsePositive: true, hoursAgo: 3 },
          ]
        );

        const execution = await sweep(apiClient);
        const launched = launchedRules(execution).map(({ uuid }) => uuid);
        const screened = (
          (findStepOutput(execution, 'screen_rule_fp_rates') as { values?: unknown[][] })?.values ??
          []
        ).map((row) => row[0] as string);

        await apiTest.step('the screen step returns only the two unreviewed rules', async () => {
          expect(screened.sort()).toStrictEqual(enabled);
        });

        await apiTest.step('both unreviewed rules get a review', async () => {
          expect(launched.sort()).toStrictEqual(enabled);
        });
      }
    );
  }
);
