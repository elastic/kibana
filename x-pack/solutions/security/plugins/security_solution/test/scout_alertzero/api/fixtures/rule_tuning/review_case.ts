/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type {
  ApiClientFixture,
  ApiServicesFixture,
  EsClient,
  KibanaRole,
  SamlAuth,
} from '@kbn/scout-security';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import { enableAlertZeroInSpace } from '../helpers';
import { startScriptedModel, type ScriptedModel } from '../scripted_model';
import { cleanUpReviewCase } from './cleanup';
import type { TuningProposal } from './proposals';
import { readRule, type RuleState } from './results';
import { driveReview } from './review';
import { seedRuleWithFalsePositives, type SeededRule } from './seed';
import { createWorkerServiceAccount, pinModelToProxy, setRuleTuningWorker } from './setup';

/** Budget of each wait for the review: its start, its investigation, each decision and its end. */
export const STEP_TIMEOUT_MS = 180_000;
/**
 * Covers every wait at its full budget, so a slow run fails in a wait and still cleans up: the
 * alerts alias (2 minutes), five review steps, the alert tags (1 minute) and the cleanup.
 */
export const TEST_TIMEOUT_MS = 120_000 + 5 * STEP_TIMEOUT_MS + 60_000 + 180_000;

export const RUN = Date.now();

export interface ReviewCaseFixtures {
  apiClient: ApiClientFixture;
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  samlAuth: SamlAuth;
  log: ToolingLog;
}

export interface ReviewCaseResult {
  review: WorkflowExecutionDto;
  rule: SeededRule;
  /** The rule as the detection engine has it after the review ended. */
  ruleAfter: RuleState;
  space: { apiClient: ApiClientFixture; headers: Record<string, string>; spaceId: string };
}

/**
 * An analyst of one space: full access to it and to its alerts, and nothing else. The review's
 * proposals are listed and decided as this user, so the tests show an analyst can act on them
 * without admin rights.
 */
const analystRole = (spaceId: string): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [
      { names: ['.alerts-security.alerts-*'], privileges: ['read', 'write', 'maintenance'] },
    ],
  },
  kibana: [{ base: ['all'], feature: {}, spaces: [spaceId] }],
});

/**
 * Sets up a space with one rule, runs the worker in it, decides the review's proposals in order
 * as an analyst of the space, and hands the outcome to `check`. Removes everything it created,
 * whatever `check` does. It knows nothing of the model: `setUpModel` points the space at one and
 * returns what stops it.
 *
 * In manual mode the first decision answers the entry gate, which the analyst sees before any
 * diagnosis, and the second answers the tuning proposal.
 */
export const runReviewCase = async (
  { apiClient, apiServices, esClient, samlAuth }: ReviewCaseFixtures,
  {
    name,
    adminHeaders,
    query,
    autonomy,
    decisions,
    setUpModel,
    onPoll,
    beforeDecision,
    verifyReview,
  }: {
    name: string;
    adminHeaders: Record<string, string>;
    /** The query of the seeded rule. */
    query: string;
    autonomy: 'manual' | 'assisted';
    decisions: Array<'approve' | 'dismiss'>;
    setUpModel: (space: {
      apiClient: ApiClientFixture;
      headers: Record<string, string>;
      spaceId: string;
    }) => Promise<(() => void) | undefined>;
    onPoll?: () => void | Promise<void>;
    beforeDecision?: (index: number) => void | Promise<void>;
    /** Checks the ended review, before its status is asserted. */
    verifyReview?: (review: WorkflowExecutionDto) => void;
  },
  check: (result: ReviewCaseResult) => Promise<void>
): Promise<void> => {
  const spaceId = `scout-tuning-e2e-${RUN}-${name}`;
  const space = { apiClient, headers: adminHeaders, spaceId };
  // Named before seeding, so cleanup finds the rule and its events even when seeding fails.
  const ruleName = `${spaceId}-rule`;
  let stopModel: (() => void) | undefined;
  let serviceAccountId: string | undefined;
  const executionIds: string[] = [];

  try {
    await apiServices.spaces.create({ id: spaceId, name: spaceId });
    await enableAlertZeroInSpace(space);
    stopModel = await setUpModel(space);
    serviceAccountId = await createWorkerServiceAccount(space);
    const rule = await seedRuleWithFalsePositives({ ...space, esClient, name: ruleName, query });
    const { cookieHeader } = await samlAuth.asInteractiveUser(analystRole(spaceId));
    const decisionHeaders = {
      ...cookieHeader,
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
    };

    // Enabling the worker starts its first run, which finds the seeded rule.
    await setRuleTuningWorker({
      ...space,
      enabled: true,
      settings: { serviceAccountId, autonomy },
    });
    const review = await driveReview({
      ...space,
      decisionHeaders,
      decisions,
      stepTimeoutMs: STEP_TIMEOUT_MS,
      onPoll,
      beforeDecision,
      onExecutionId: (executionId) => executionIds.push(executionId),
    });

    verifyReview?.(review);
    expect(review.status, JSON.stringify(review.error)).toBe(ExecutionStatus.COMPLETED);
    const ruleAfter = await readRule({ ...space, id: rule.id });
    await check({ review, rule, ruleAfter, space });
  } finally {
    stopModel?.();
    await cleanUpReviewCase({
      ...space,
      apiServices,
      esClient,
      ruleName,
      serviceAccountId,
      executionIds,
    });
  }
};

/**
 * `runReviewCase` on a scripted model that always returns `proposal`, so each test reaches the path
 * it targets. It also checks what only a scripted model can: that no model call went unanswered,
 * that the diagnosis ran exactly when the path reaches it, and that the rule gained one version
 * when the proposal was approved and none otherwise.
 */
export const runScriptedReviewCase = async (
  fixtures: ReviewCaseFixtures,
  {
    proxy,
    proposal,
    autonomy,
    decisions,
    ...rest
  }: {
    name: string;
    adminHeaders: Record<string, string>;
    proxy: LlmProxy;
    proposal: TuningProposal;
    autonomy: 'manual' | 'assisted';
    decisions: Array<'approve' | 'dismiss'>;
    query: string;
    verifyReview?: (review: WorkflowExecutionDto) => void;
  },
  check: (result: ReviewCaseResult) => Promise<void>
): Promise<void> => {
  let model: ScriptedModel | undefined;
  const scriptedModel = (): ScriptedModel => {
    if (!model) {
      throw new Error('The scripted model has not started');
    }
    return model;
  };
  const unansweredMessage =
    'The review forced tool calls the scripted model has no reply for. Add a reply to FIXED_TOOL_ARGS in fixtures/scripted_model.ts.';

  await runReviewCase(
    fixtures,
    {
      ...rest,
      autonomy,
      decisions,
      setUpModel: async (space) => {
        await pinModelToProxy({ ...space, proxyPort: proxy.getPort() });
        model = startScriptedModel({ proxy, log: fixtures.log, structuredAnswer: proposal });
        return () => model?.stop();
      },
      // A forced tool call without a reply fails the review, so stop waiting for its proposal.
      onPoll: () => {
        expect(scriptedModel().unansweredToolCalls, unansweredMessage).toStrictEqual([]);
      },
      // The entry gate comes before the diagnosis, so the agent must not have been asked yet.
      beforeDecision: (index) => {
        if (autonomy === 'manual' && index === 0) {
          expect(
            scriptedModel().answeredToolCalls,
            'The review diagnosed the rule before its entry gate was decided'
          ).not.toContain('structured_answer');
        }
      },
      verifyReview: (review) => {
        // Checked before the review status: a model call the scripted model could not answer
        // fails the review, and these messages say what to change.
        expect(scriptedModel().unansweredToolCalls, unansweredMessage).toStrictEqual([]);
        expect(
          scriptedModel().unmatchedRequestCount(),
          'Model calls arrived while every scripted model interceptor was busy. Raise CONCURRENT_REQUESTS in fixtures/scripted_model.ts.'
        ).toBe(0);
        rest.verifyReview?.(review);
      },
    },
    async (result) => {
      // A dismissed entry gate ends the review before the agent is asked for a proposal.
      const diagnosed = autonomy === 'assisted' || decisions[0] === 'approve';
      expect(scriptedModel().answeredToolCalls.includes('structured_answer')).toBe(diagnosed);
      // An approved change is saved as one new rule version. A dismissed proposal never saves.
      const approved = decisions[decisions.length - 1] === 'approve';
      expect(result.ruleAfter.revision).toBe(result.rule.revision + (approved ? 1 : 0));
      await check(result);
    }
  );
};

/**
 * What a spec of scripted reviews starts once: the admin that provisions its spaces, and the model
 * proxy. `stop` closes the proxy.
 */
export const startReviewHarness = async ({
  samlAuth,
  log,
}: Pick<ReviewCaseFixtures, 'samlAuth' | 'log'>): Promise<{
  adminHeaders: Record<string, string>;
  proxy: LlmProxy;
  stop: () => void;
}> => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  const proxy = await createLlmProxy(log);
  return {
    adminHeaders: { ...cookieHeader, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' },
    proxy,
    stop: () => proxy.close(),
  };
};
