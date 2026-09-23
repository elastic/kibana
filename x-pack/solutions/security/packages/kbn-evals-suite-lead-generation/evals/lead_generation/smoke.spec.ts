/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { runLeadGeneration } from '../../src/steps/run_lead_generation';
import { createLeadGenerationBasicEvaluator } from '../../src/evaluators/lead_generation_basic_evaluator';
import { createLeadGenerationRubricEvaluator } from '../../src/evaluators/lead_generation_rubric_evaluator';
import type { LeadGenerationTaskOutput } from '../../src/types';

/**
 * "Smoke test" here means a minimal check that the thing basically works —
 * honest for both halves below: `smoke: pipeline` checks the pipeline runs
 * end-to-end, `smoke: evaluators` checks the evaluators can discriminate
 * (return 0 on synthetic bad outputs, not just always pass). Neither seeds
 * data, so both run fast on every PR. Seeded, quality-focused scenarios live
 * in `lead_quality.spec.ts`.
 */
evaluate.describe('smoke: pipeline', { tag: tags.stateful.classic }, () => {
  /**
   * Minimal end-to-end smoke test — triggers one generation run against
   * whatever data exists in the target environment.
   *
   * Score 1 = pipeline ran and returned a valid (possibly empty) leads array.
   * Score 0 = pipeline error or malformed response.
   */
  evaluate(
    'pipeline runs end-to-end',
    async ({ executorClient, leadGenerationClient, connector, log }) => {
      await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'lead generation: e2e smoke',
              description: 'Basic smoke test for the lead generation pipeline',
              examples: [
                {
                  output: { leads: [] },
                },
              ],
            },
          ],
          task: async () =>
            runLeadGeneration({
              leadGenerationClient,
              connectorId: connector.id,
              log,
            }),
        },
        [
          {
            name: 'Ran',
            kind: 'CODE',
            direction: 'maximize',
            evaluate: async ({ output }) => ({
              score: Array.isArray(output?.leads) && !output?.errors?.length ? 1 : 0,
            }),
          },
        ]
      );
    }
  );
});

/**
 * Evaluator calibration tests — these tests exist solely to confirm the
 * evaluators can produce a score of 0. They bypass the live pipeline by using
 * a synthetic task that returns crafted bad outputs directly.
 *
 * None of these tests assert on the recorded score value; the evals framework
 * records the score in the experiment history. Reviewers should see 0.0 for
 * each of these cases and 1.0 for the positive cases, confirming the
 * evaluators are actually discriminating rather than always passing.
 */
evaluate.describe('smoke: evaluators', { tag: tags.stateful.classic }, () => {
  const CALIBRATION_DATASET = {
    name: 'lead generation: evaluator calibration',
    description: 'Synthetic outputs used to verify evaluators can produce a score of 0',
    examples: [{ output: { leads: [] } }],
  };

  evaluate('basic: pipeline error → score 0', async ({ executorClient }) => {
    await executorClient.runExperiment(
      {
        datasets: [CALIBRATION_DATASET],
        task: async (): Promise<LeadGenerationTaskOutput> => ({
          leads: null,
          errors: ['Simulated pipeline error for calibration'],
        }),
      },
      [createLeadGenerationBasicEvaluator()]
    );
  });

  evaluate('basic: lead missing required field (title) → score 0', async ({ executorClient }) => {
    await executorClient.runExperiment(
      {
        datasets: [CALIBRATION_DATASET],
        task: async (): Promise<LeadGenerationTaskOutput> => ({
          leads: [
            {
              id: 'cal-lead-1',
              title: '', // empty title — isValidLead requires title.length > 0
              byline: 'User jdoe performed suspicious actions',
              description: 'Investigation needed',
              entity: { type: 'user', name: 'jdoe', id: 'user:jdoe' },
              tags: ['lateral-movement'],
              priority: 7,
              chatRecommendations: ['What did jdoe access in the past 24h?'],
              timestamp: new Date().toISOString(),
              staleness: 'fresh',
              status: 'active',
              observations: [],
              topRelatedEntities: [],
              relatedEntityCounts: {},
              executionUuid: 'cal-exec-1',
              sourceType: 'adhoc',
              origin: 'observations',
              createdAt: new Date().toISOString(),
              changedAt: new Date().toISOString(),
              version: 1,
            },
          ],
        }),
      },
      [createLeadGenerationBasicEvaluator()]
    );
  });

  evaluate('basic: priority out of range (>10) → score 0', async ({ executorClient }) => {
    await executorClient.runExperiment(
      {
        datasets: [CALIBRATION_DATASET],
        task: async (): Promise<LeadGenerationTaskOutput> => ({
          leads: [
            {
              id: 'cal-lead-2',
              title: 'Lateral Movement Detected',
              byline: 'Host web-server-01 shows lateral movement patterns',
              description: 'Multiple lateral movement indicators observed',
              entity: { type: 'host', name: 'web-server-01', id: 'host:web-server-01' },
              tags: ['lateral-movement'],
              priority: 15, // out of 1–10 range — isValidLead fails
              chatRecommendations: ['What processes ran on web-server-01?'],
              timestamp: new Date().toISOString(),
              staleness: 'fresh',
              status: 'active',
              observations: [],
              topRelatedEntities: [],
              relatedEntityCounts: {},
              executionUuid: 'cal-exec-2',
              sourceType: 'adhoc',
              origin: 'observations',
              createdAt: new Date().toISOString(),
              changedAt: new Date().toISOString(),
              version: 1,
            },
          ],
        }),
      },
      [createLeadGenerationBasicEvaluator()]
    );
  });

  /**
   * Rubric evaluator short-circuits to score 0 deterministically (no LLM call)
   * when the pipeline reports errors.
   */
  evaluate(
    'rubric: pipeline error → score 0 (no LLM call)',
    async ({ executorClient, inferenceClient, log }) => {
      await executorClient.runExperiment(
        {
          datasets: [CALIBRATION_DATASET],
          task: async (): Promise<LeadGenerationTaskOutput> => ({
            leads: null,
            errors: ['Simulated pipeline error for rubric calibration'],
          }),
        },
        [createLeadGenerationRubricEvaluator({ inferenceClient, log })]
      );
    }
  );

  /**
   * Rubric evaluator short-circuits to score 0 deterministically (no LLM call)
   * when leads is null.
   */
  evaluate(
    'rubric: null leads array → score 0 (no LLM call)',
    async ({ executorClient, inferenceClient, log }) => {
      await executorClient.runExperiment(
        {
          datasets: [CALIBRATION_DATASET],
          task: async (): Promise<LeadGenerationTaskOutput> => ({
            leads: null,
          }),
        },
        [createLeadGenerationRubricEvaluator({ inferenceClient, log })]
      );
    }
  );

  /**
   * Rubric evaluator LLM path: deliberately vague, low-quality leads should
   * cause the rubric judge to return verdict N (score 0). This requires a live
   * LLM call via the evaluation connector.
   */
  evaluate(
    'rubric: vague low-quality leads → score 0 (LLM judge)',
    async ({ executorClient, inferenceClient, evaluationConnector, log }) => {
      const evaluationInferenceClient = inferenceClient.bindTo({
        connectorId: evaluationConnector.id,
      });
      await executorClient.runExperiment(
        {
          datasets: [CALIBRATION_DATASET],
          task: async (): Promise<LeadGenerationTaskOutput> => ({
            leads: [
              {
                id: 'cal-lead-vague',
                title: 'Something happened',
                byline: 'A user did something',
                description: 'There might be an issue. Please investigate.',
                entity: { type: 'user', name: 'unknown', id: 'user:unknown' },
                tags: [],
                priority: 5,
                chatRecommendations: ['Check logs'],
                timestamp: new Date().toISOString(),
                staleness: 'fresh',
                status: 'active',
                observations: [],
                topRelatedEntities: [],
                relatedEntityCounts: {},
                executionUuid: 'cal-exec-vague',
                sourceType: 'adhoc',
                origin: 'observations',
                createdAt: new Date().toISOString(),
                changedAt: new Date().toISOString(),
                version: 1,
              },
            ],
          }),
        },
        [createLeadGenerationRubricEvaluator({ inferenceClient: evaluationInferenceClient, log })]
      );
    }
  );
});
