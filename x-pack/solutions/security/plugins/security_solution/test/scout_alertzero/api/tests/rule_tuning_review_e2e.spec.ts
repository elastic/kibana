/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { ApiClientFixture, ApiServicesFixture, EsClient } from '@kbn/scout-security';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import {
  APPLIED_TAG,
  apiTest,
  cancelExecution,
  createWorkerServiceAccount,
  decidePendingProposal,
  deleteServiceAccount,
  deleteSpaceAlertsIndex,
  DISMISSED_TAG,
  enableAlertZeroInSpace,
  FP_ALERT_COUNT,
  FP_PROCESS_NAME,
  pinModelToProxy,
  pollFor,
  readAlertTags,
  readBacktest,
  readRule,
  readRuleExceptionItems,
  runCleanupSteps,
  SEEDED_EVENT_COUNT,
  seedRuleWithFalsePositives,
  setRuleTuningWorker,
  startScriptedModel,
  tags,
  TP_EVENT_COUNT,
  waitForExecution,
  waitForInvestigation,
  waitForReviewExecution,
  type BacktestOutcome,
  type RuleState,
  type ScriptedModel,
  type SeededRule,
} from '../fixtures';

/** Budget of each wait for the review: its start, its investigation, each decision and its end. */
const STEP_TIMEOUT_MS = 180_000;
/**
 * Covers every wait at its full budget, so a slow run fails in a wait and still cleans up: the
 * alerts alias (2 minutes), five review steps, the alert tags (1 minute) and the cleanup.
 */
const TEST_TIMEOUT_MS = 120_000 + 5 * STEP_TIMEOUT_MS + 60_000 + 180_000;

const RUN = Date.now();

const OVERBROAD_QUERY = 'process.name:*';
const NARROWED_QUERY = `process.name:* and not process.name:"${FP_PROCESS_NAME}"`;
const FIXTURE_RISK_SCORE = 40;

/**
 * What the backtest counts for the scripted change, which drops `FP_PROCESS_NAME`: the current
 * rule alerts on every seeded event, and the proposed one on the true positives only. The
 * backtest reports totals, so the 2 is read as the true positives because the seeded events
 * and the change are fixed. It does not say which events alerted.
 */
const EXPECTED_BACKTEST_COUNTS: BacktestOutcome = {
  current_succeeded: true,
  current_alert_count: SEEDED_EVENT_COUNT,
  proposed_succeeded: true,
  proposed_alert_count: TP_EVENT_COUNT,
};

/** Fields every `diagnose_rule` structured output carries. */
const proposalText = {
  title: 'Stop alerting on nginx',
  summary: 'Every false positive is nginx on a web host.',
  fp_pattern: 'All 10 false positives are nginx on web hosts.',
  reasoning: 'The query matches every process, and every false positive is nginx.',
  confidence: 'high',
};

const QUERY_PROPOSAL = { ...proposalText, change_type: 'query', proposed_query: NARROWED_QUERY };

const EXCEPTION_ENTRY = { field: 'process.name', operator: 'is', value: FP_PROCESS_NAME };
const EXCEPTION_PROPOSAL = {
  ...proposalText,
  change_type: 'exception',
  exception_name: 'nginx on web hosts is known benign',
  exception_entries: [EXCEPTION_ENTRY],
};

const RISK_SCORE_PROPOSAL = {
  ...proposalText,
  change_type: 'risk_score',
  proposed_risk_score: 21,
  proposed_severity: 'low',
};

type TuningProposal =
  | typeof QUERY_PROPOSAL
  | typeof EXCEPTION_PROPOSAL
  | typeof RISK_SCORE_PROPOSAL;

interface CaseFixtures {
  apiClient: ApiClientFixture;
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  log: ToolingLog;
}

interface CaseResult {
  review: WorkflowExecutionDto;
  model: ScriptedModel;
  rule: SeededRule;
  /** The rule as the detection engine has it after the review ended. */
  ruleAfter: RuleState;
  space: { apiClient: ApiClientFixture; headers: Record<string, string>; spaceId: string };
}

/**
 * Runs the managed rule tuning review end to end: the worker finds a rule with closed false
 * positives, the review diagnoses it on a scripted model, and the test decides the proposal the
 * way an analyst does. The scripted model always returns the test's proposal, so each test
 * reaches the path it targets. The tests check the rule and its alerts, not what the workflow
 * reports.
 *
 * Each test has its own space: the worker reviews every rule of its space with enough false
 * positives, so a space with one rule gets exactly one review.
 */
apiTest.describe('Rule Tuning review - end to end', { tag: [...tags.stateful.classic] }, () => {
  let adminHeaders: Record<string, string>;
  let llmProxy: LlmProxy | undefined;

  /** The proxy `beforeAll` started. A failed `beforeAll` fails the tests before this runs. */
  const startedProxy = (): LlmProxy => {
    if (!llmProxy) {
      throw new Error('The LLM proxy did not start');
    }
    return llmProxy;
  };

  /**
   * Sets up a space with one rule, runs the worker in it, decides the review's proposals in
   * order, and hands the outcome to `check`. Removes everything it created, whatever `check`
   * does.
   *
   * In manual mode the first decision answers the entry gate, which the analyst sees before
   * any diagnosis, and the second answers the tuning proposal.
   */
  const runReviewCase = async (
    { apiClient, apiServices, esClient, log }: CaseFixtures,
    {
      name,
      autonomy,
      proposal,
      decisions,
    }: {
      name: string;
      autonomy: 'manual' | 'assisted';
      proposal: TuningProposal;
      decisions: Array<'approve' | 'dismiss'>;
    },
    check: (result: CaseResult) => Promise<void>
  ): Promise<void> => {
    const spaceId = `scout-tuning-e2e-${RUN}-${name}`;
    const space = { apiClient, headers: adminHeaders, spaceId };
    let model: ScriptedModel | undefined;
    let serviceAccountId: string | undefined;
    let reviewId: string | undefined;
    let eventsIndex: string | undefined;

    try {
      await apiServices.spaces.create({ id: spaceId, name: spaceId });
      await enableAlertZeroInSpace(space);

      const proxy = startedProxy();
      await pinModelToProxy({ ...space, proxyPort: proxy.getPort() });
      serviceAccountId = await createWorkerServiceAccount(space);
      const rule = await seedRuleWithFalsePositives({
        ...space,
        esClient,
        name: `${spaceId}-rule`,
        query: OVERBROAD_QUERY,
      });
      ({ eventsIndex } = rule);
      model = startScriptedModel({ proxy, log, structuredAnswer: proposal });

      // Enabling the worker starts its first run, which finds the seeded rule.
      await setRuleTuningWorker({
        ...space,
        enabled: true,
        settings: { serviceAccountId, autonomy },
      });
      reviewId = await waitForReviewExecution({ ...space, timeoutMs: STEP_TIMEOUT_MS });
      const conversationId = await waitForInvestigation({
        ...space,
        executionId: reviewId,
        timeoutMs: STEP_TIMEOUT_MS,
      });
      const decidedIds: string[] = [];
      for (const decision of decisions) {
        decidedIds.push(
          await decidePendingProposal({
            ...space,
            conversationId,
            decision,
            decidedIds,
            timeoutMs: STEP_TIMEOUT_MS,
          })
        );
      }
      const review = await waitForExecution(
        apiClient,
        adminHeaders,
        reviewId,
        STEP_TIMEOUT_MS,
        spaceId
      );

      // Checked before the review status: a model call the scripted model could not answer
      // fails the review, and these messages say what to change.
      expect(
        model.unansweredToolCalls,
        'The review forced tool calls the scripted model has no reply for. Add a reply to FIXED_TOOL_ARGS in fixtures/scripted_model.ts.'
      ).toStrictEqual([]);
      expect(
        model.unmatchedRequestCount(),
        'Model calls arrived while every scripted model interceptor was busy. Raise CONCURRENT_REQUESTS in fixtures/scripted_model.ts.'
      ).toBe(0);
      expect(review.status, JSON.stringify(review.error)).toBe(ExecutionStatus.COMPLETED);
      // A dismissed entry gate ends the review before the agent is asked for a proposal.
      const diagnosed = autonomy === 'assisted' || decisions[0] === 'approve';
      expect(model.answeredToolCalls.includes('structured_answer')).toBe(diagnosed);
      const ruleAfter = await readRule({ ...space, id: rule.id });
      // An approved change is saved as one new rule version. A dismissed proposal never saves.
      const approved = decisions[decisions.length - 1] === 'approve';
      expect(ruleAfter.revision).toBe(rule.revision + (approved ? 1 : 0));
      await check({ review, model, rule, ruleAfter, space });
    } finally {
      model?.stop();
      await runCleanupSteps([
        {
          name: 'cancel the review',
          run: async () => {
            if (reviewId) await cancelExecution({ ...space, executionId: reviewId });
          },
        },
        {
          name: 'disable the rule tuning worker',
          run: () => setRuleTuningWorker({ ...space, enabled: false }),
        },
        {
          name: 'delete the worker service account',
          run: async () => {
            if (serviceAccountId) {
              await deleteServiceAccount({ apiClient, headers: adminHeaders, serviceAccountId });
            }
          },
        },
        { name: `delete space ${spaceId}`, run: () => apiServices.spaces.delete(spaceId) },
        {
          name: 'delete the space alerts index',
          run: () => deleteSpaceAlertsIndex(esClient, spaceId),
        },
        {
          name: 'delete the source events',
          run: async () => {
            if (eventsIndex) {
              await esClient.indices.deleteDataStream({ name: eventsIndex }, { ignore: [404] });
            }
          },
        },
      ]);
    }
  };

  /** Waits until every alert of the rule carries `tag`, and returns the tags of each alert. */
  const waitForAlertTag = (esClient: EsClient, spaceId: string, ruleId: string, tag: string) =>
    pollFor(
      `every alert to carry ${tag}`,
      async () => {
        const found = await readAlertTags({ esClient, spaceId, ruleId });
        return found.length > 0 && found.every((alertTags) => alertTags.includes(tag))
          ? found
          : undefined;
      },
      { timeoutMs: 60_000 }
    );

  apiTest.beforeAll(async ({ samlAuth, log }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...cookieHeader, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
    llmProxy = await createLlmProxy(log);
  });

  apiTest.afterAll(() => {
    llmProxy?.close();
  });

  apiTest(
    'assisted: approving a query proposal narrows the rule query and tags the alerts applied',
    async ({ apiClient, apiServices, esClient, log }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      await runReviewCase(
        { apiClient, apiServices, esClient, log },
        {
          name: 'assisted-query-approve',
          autonomy: 'assisted',
          proposal: QUERY_PROPOSAL,
          decisions: ['approve'],
        },
        async ({ review, rule, ruleAfter, space }) => {
          expect(readBacktest(review)).toMatchObject(EXPECTED_BACKTEST_COUNTS);
          expect(ruleAfter.query).toBe(NARROWED_QUERY);
          const alertTags = await waitForAlertTag(
            esClient,
            space.spaceId,
            rule.ruleId,
            APPLIED_TAG
          );
          expect(alertTags).toHaveLength(FP_ALERT_COUNT);
        }
      );
    }
  );

  apiTest(
    'assisted: approving an exception proposal adds the exception to the rule and tags the alerts applied',
    async ({ apiClient, apiServices, esClient, log }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      await runReviewCase(
        { apiClient, apiServices, esClient, log },
        {
          name: 'assisted-exception-approve',
          autonomy: 'assisted',
          proposal: EXCEPTION_PROPOSAL,
          decisions: ['approve'],
        },
        async ({ review, rule, ruleAfter, space }) => {
          expect(readBacktest(review)).toMatchObject(EXPECTED_BACKTEST_COUNTS);
          expect(ruleAfter.query).toBe(OVERBROAD_QUERY);
          const items = await readRuleExceptionItems({ ...space, rule: ruleAfter });
          expect(items).toHaveLength(1);
          expect(items[0].name).toBe(EXCEPTION_PROPOSAL.exception_name);
          // The list stores an entry in its own terms (`included`, `match`), not the agent's `is`.
          expect(items[0].entries).toStrictEqual([
            expect.objectContaining({ field: EXCEPTION_ENTRY.field, value: EXCEPTION_ENTRY.value }),
          ]);
          await waitForAlertTag(esClient, space.spaceId, rule.ruleId, APPLIED_TAG);
        }
      );
    }
  );

  apiTest(
    'assisted: approving a risk score proposal lowers the risk score and severity and tags the alerts applied',
    async ({ apiClient, apiServices, esClient, log }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      await runReviewCase(
        { apiClient, apiServices, esClient, log },
        {
          name: 'assisted-risk-approve',
          autonomy: 'assisted',
          proposal: RISK_SCORE_PROPOSAL,
          decisions: ['approve'],
        },
        async ({ review, rule, ruleAfter, space }) => {
          // A risk score change alerts on the same events, so the review does not backtest it,
          // and the outcome step reports neither run.
          expect(readBacktest(review)).toMatchObject({
            current_succeeded: false,
            proposed_succeeded: false,
          });
          expect(ruleAfter.risk_score).toBe(RISK_SCORE_PROPOSAL.proposed_risk_score);
          expect(ruleAfter.severity).toBe(RISK_SCORE_PROPOSAL.proposed_severity);
          expect(ruleAfter.query).toBe(OVERBROAD_QUERY);
          await waitForAlertTag(esClient, space.spaceId, rule.ruleId, APPLIED_TAG);
        }
      );
    }
  );

  apiTest(
    'assisted: dismissing a proposal leaves the rule unchanged and tags the alerts dismissed',
    async ({ apiClient, apiServices, esClient, log }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      await runReviewCase(
        { apiClient, apiServices, esClient, log },
        {
          name: 'assisted-query-dismiss',
          autonomy: 'assisted',
          proposal: QUERY_PROPOSAL,
          decisions: ['dismiss'],
        },
        async ({ rule, ruleAfter, space }) => {
          expect(ruleAfter.query).toBe(OVERBROAD_QUERY);
          expect(ruleAfter.risk_score).toBe(FIXTURE_RISK_SCORE);
          expect(await readRuleExceptionItems({ ...space, rule: ruleAfter })).toStrictEqual([]);
          const alertTags = await waitForAlertTag(
            esClient,
            space.spaceId,
            rule.ruleId,
            DISMISSED_TAG
          );
          expect(alertTags.some((alertTagList) => alertTagList.includes(APPLIED_TAG))).toBe(false);
        }
      );
    }
  );

  apiTest(
    'manual: dismissing the entry gate ends the review before diagnosis and tags the alerts dismissed',
    async ({ apiClient, apiServices, esClient, log }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      await runReviewCase(
        { apiClient, apiServices, esClient, log },
        {
          name: 'manual-entry-dismiss',
          autonomy: 'manual',
          proposal: QUERY_PROPOSAL,
          decisions: ['dismiss'],
        },
        async ({ rule, ruleAfter, space }) => {
          expect(ruleAfter.query).toBe(OVERBROAD_QUERY);
          const alertTags = await waitForAlertTag(
            esClient,
            space.spaceId,
            rule.ruleId,
            DISMISSED_TAG
          );
          expect(alertTags.some((alertTagList) => alertTagList.includes(APPLIED_TAG))).toBe(false);
        }
      );
    }
  );

  apiTest(
    'manual: approving the entry gate and then the query proposal narrows the rule query and tags the alerts applied',
    async ({ apiClient, apiServices, esClient, log }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      await runReviewCase(
        { apiClient, apiServices, esClient, log },
        {
          name: 'manual-query-approve',
          autonomy: 'manual',
          proposal: QUERY_PROPOSAL,
          decisions: ['approve', 'approve'],
        },
        async ({ rule, ruleAfter, space }) => {
          expect(ruleAfter.query).toBe(NARROWED_QUERY);
          await waitForAlertTag(esClient, space.spaceId, rule.ruleId, APPLIED_TAG);
        }
      );
    }
  );

  apiTest(
    'manual: approving the entry gate and dismissing the proposal leaves the rule unchanged and tags the alerts dismissed',
    async ({ apiClient, apiServices, esClient, log }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      await runReviewCase(
        { apiClient, apiServices, esClient, log },
        {
          name: 'manual-query-dismiss',
          autonomy: 'manual',
          proposal: QUERY_PROPOSAL,
          decisions: ['approve', 'dismiss'],
        },
        async ({ rule, ruleAfter, space }) => {
          expect(ruleAfter.query).toBe(OVERBROAD_QUERY);
          const alertTags = await waitForAlertTag(
            esClient,
            space.spaceId,
            rule.ruleId,
            DISMISSED_TAG
          );
          expect(alertTags.some((alertTagList) => alertTagList.includes(APPLIED_TAG))).toBe(false);
        }
      );
    }
  );
});
