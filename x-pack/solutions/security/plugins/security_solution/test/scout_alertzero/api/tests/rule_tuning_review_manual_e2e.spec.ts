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
  getPlaywrightTagsFor,
  NARROWED_QUERY,
  OVERBROAD_QUERY,
  QUERY_PROPOSAL,
  runScriptedReviewCase,
  startReviewHarness,
  TEST_TIMEOUT_MS,
  waitForAlertTag,
} from '../fixtures';

/**
 * Runs the managed rule tuning review end to end in manual mode, where the review parks at an
 * entry gate before any diagnosis. The first decision answers the gate, and the second answers
 * the tuning proposal. The tests check the rule and its alerts, not what the workflow reports.
 *
 * Each test has its own space: the worker reviews every rule of its space with enough false
 * positives, so a space with one rule gets exactly one review.
 */
apiTest.describe(
  'Rule Tuning review - end to end - manual',
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
      'dismissing the entry gate ends the review before diagnosis and tags the alerts dismissed',
      async ({ apiClient, apiServices, esClient, samlAuth, log }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await runScriptedReviewCase(
          { apiClient, apiServices, esClient, samlAuth, log },
          {
            name: 'manual-entry-dismiss',
            adminHeaders,
            proxy: startedProxy(),
            query: OVERBROAD_QUERY,
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
            expect(alertTags.some((alertTagList) => alertTagList.includes(APPLIED_TAG))).toBe(
              false
            );
          }
        );
      }
    );

    apiTest(
      'approving the entry gate and then the query proposal narrows the rule query and tags the alerts applied',
      async ({ apiClient, apiServices, esClient, samlAuth, log }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await runScriptedReviewCase(
          { apiClient, apiServices, esClient, samlAuth, log },
          {
            name: 'manual-query-approve',
            adminHeaders,
            proxy: startedProxy(),
            query: OVERBROAD_QUERY,
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
      'approving the entry gate and dismissing the proposal leaves the rule unchanged and tags the alerts dismissed',
      async ({ apiClient, apiServices, esClient, samlAuth, log }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        await runScriptedReviewCase(
          { apiClient, apiServices, esClient, samlAuth, log },
          {
            name: 'manual-query-dismiss',
            adminHeaders,
            proxy: startedProxy(),
            query: OVERBROAD_QUERY,
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
            expect(alertTags.some((alertTagList) => alertTagList.includes(APPLIED_TAG))).toBe(
              false
            );
          }
        );
      }
    );
  }
);
