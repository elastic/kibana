/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import {
  APPLIED_TAG,
  apiTest,
  DISMISSED_TAG,
  EXCEPTION_ENTRY,
  EXCEPTION_PROPOSAL,
  EXPECTED_BACKTEST_COUNTS,
  FIXTURE_RISK_SCORE,
  getPlaywrightTagsFor,
  hasBacktestRun,
  NARROWED_QUERY,
  OVERBROAD_QUERY,
  QUERY_PROPOSAL,
  readBacktest,
  readRuleExceptionItems,
  RISK_SCORE_PROPOSAL,
  runScriptedReviewCase,
  startReviewHarness,
  TEST_TIMEOUT_MS,
  waitForAlertTag,
} from '../fixtures';

/**
 * Runs the managed rule tuning review end to end in assisted mode: the worker finds a rule with
 * closed false positives, the review diagnoses it on a scripted model, and the test decides the
 * proposal the way an analyst does. The tests check the rule and its alerts, not what the
 * workflow reports.
 *
 * Each test has its own space: the worker reviews every rule of its space with enough false
 * positives, so a space with one rule gets exactly one review.
 */
apiTest.describe(
  'Rule Tuning review - assisted, end to end',
  // Local only: the scripted model listens on the loopback of the test runner, which a Kibana on
  // Elastic Cloud cannot reach.
  { tag: [...getPlaywrightTagsFor('stateful', 'classic', 'local')] },
  () => {
    let adminHeaders: Record<string, string>;
    let llmProxy: LlmProxy | undefined;
    let stopHarness: (() => void) | undefined;

    /** The proxy `beforeAll` started. A failed `beforeAll` fails the tests before this runs. */
    const startedProxy = (): LlmProxy => {
      if (!llmProxy) {
        throw new Error('The LLM proxy did not start');
      }
      return llmProxy;
    };

    apiTest.beforeAll(async ({ samlAuth, log }) => {
      const harness = await startReviewHarness({ samlAuth, log });
      adminHeaders = harness.adminHeaders;
      llmProxy = harness.proxy;
      stopHarness = harness.stop;
    });

    apiTest.afterAll(() => {
      stopHarness?.();
    });

    apiTest(
      'approving a query proposal narrows the rule query and tags the alerts applied',
      async ({ apiClient, apiServices, esClient, samlAuth, log }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await runScriptedReviewCase(
          { apiClient, apiServices, esClient, samlAuth, log },
          {
            name: 'assisted-query-approve',
            adminHeaders,
            proxy: startedProxy(),
            query: OVERBROAD_QUERY,
            autonomy: 'assisted',
            proposal: QUERY_PROPOSAL,
            decisions: ['approve'],
          },
          async ({ review, rule, ruleAfter, space }) => {
            expect(hasBacktestRun(review)).toBe(true);
            expect(readBacktest(review)).toMatchObject(EXPECTED_BACKTEST_COUNTS);
            expect(ruleAfter.query).toBe(NARROWED_QUERY);
            await waitForAlertTag(esClient, space.spaceId, rule.ruleId, APPLIED_TAG);
          }
        );
      }
    );

    apiTest(
      'approving an exception proposal adds the exception to the rule and tags the alerts applied',
      async ({ apiClient, apiServices, esClient, samlAuth, log }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await runScriptedReviewCase(
          { apiClient, apiServices, esClient, samlAuth, log },
          {
            name: 'assisted-exception-approve',
            adminHeaders,
            proxy: startedProxy(),
            query: OVERBROAD_QUERY,
            autonomy: 'assisted',
            proposal: EXCEPTION_PROPOSAL,
            decisions: ['approve'],
          },
          async ({ review, rule, ruleAfter, space }) => {
            expect(hasBacktestRun(review)).toBe(true);
            expect(readBacktest(review)).toMatchObject(EXPECTED_BACKTEST_COUNTS);
            expect(ruleAfter.query).toBe(OVERBROAD_QUERY);
            const items = await readRuleExceptionItems({ ...space, rule: ruleAfter });
            expect(items).toHaveLength(1);
            expect(items[0].name).toBe(EXCEPTION_PROPOSAL.exception_name);
            // The list stores an entry in its own terms, not the agent's `is`. A negated entry would
            // suppress the wrong events.
            expect(items[0].entries).toStrictEqual([
              expect.objectContaining({
                field: EXCEPTION_ENTRY.field,
                operator: 'included',
                type: 'match',
                value: EXCEPTION_ENTRY.value,
              }),
            ]);
            await waitForAlertTag(esClient, space.spaceId, rule.ruleId, APPLIED_TAG);
          }
        );
      }
    );

    apiTest(
      'approving a risk score proposal lowers the risk score and severity and tags the alerts applied',
      async ({ apiClient, apiServices, esClient, samlAuth, log }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await runScriptedReviewCase(
          { apiClient, apiServices, esClient, samlAuth, log },
          {
            name: 'assisted-risk-approve',
            adminHeaders,
            proxy: startedProxy(),
            query: OVERBROAD_QUERY,
            autonomy: 'assisted',
            proposal: RISK_SCORE_PROPOSAL,
            decisions: ['approve'],
          },
          async ({ review, rule, ruleAfter, space }) => {
            // A risk score change alerts on the same events, so the review skips the backtest.
            expect(hasBacktestRun(review)).toBe(false);
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
      'dismissing a proposal leaves the rule unchanged and tags the alerts dismissed',
      async ({ apiClient, apiServices, esClient, samlAuth, log }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await runScriptedReviewCase(
          { apiClient, apiServices, esClient, samlAuth, log },
          {
            name: 'assisted-query-dismiss',
            adminHeaders,
            proxy: startedProxy(),
            query: OVERBROAD_QUERY,
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
            expect(alertTags.some((alertTagList) => alertTagList.includes(APPLIED_TAG))).toBe(
              false
            );
          }
        );
      }
    );
  }
);
