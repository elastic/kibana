/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { runLeadGeneration } from '../../src/task/run_lead_generation';
import { loadLeadGenerationJsonlDataset } from '../../src/dataset/load_lead_generation_jsonl';
import { createLeadGenerationBasicEvaluator } from '../../src/evaluators/lead_generation_basic_evaluator';
import { createLeadGenerationRubricEvaluator } from '../../src/evaluators/lead_generation_rubric_evaluator';
import type { LeadGenerationTaskOutput } from '../../src/types';

const UPSTREAM_DATASET_DESCRIPTION =
  'Lead Generation evaluation dataset (all scenarios). Resolved from upstream.';

evaluate.describe('Lead Generation', { tag: tags.stateful.classic }, () => {
  /**
   * Full dataset evaluation.
   *
   * Runs in one of three modes — checked in priority order:
   *
   * 1. **Explicit JSONL path** (set LEAD_GENERATION_DATASET_JSONL_PATH):
   *    Loads examples from the given file. Useful for ad-hoc local runs
   *    or CI jobs with a custom dataset.
   *
   * 2. **Golden cluster** (set LEAD_GENERATION_DATASET_NAME):
   *    Fetches the named dataset from the upstream golden cluster
   *    (EVALUATIONS_KBN_URL must also be configured).
   *    Run `scripts/upload_dataset.js` first to publish the dataset.
   *
   * 3. **Bundled default dataset** (no env vars required):
   *    Falls back to data/eval_dataset_lead_generation_all_scenarios.jsonl,
   *    which is checked in. Works out of the box in CI and locally.
   */
  evaluate('full dataset evaluation', async ({ evaluateDataset }) => {
    const jsonlPath = process.env.LEAD_GENERATION_DATASET_JSONL_PATH;
    const datasetName = process.env.LEAD_GENERATION_DATASET_NAME;

    if (jsonlPath) {
      // Mode 1: local JSONL file
      const dataset = await loadLeadGenerationJsonlDataset({ jsonlPath });
      await evaluateDataset({ dataset });
      return;
    }

    if (datasetName) {
      // Mode 2: golden cluster upstream dataset
      await evaluateDataset({
        dataset: {
          name: datasetName,
          description: UPSTREAM_DATASET_DESCRIPTION,
          examples: [],
        },
        trustUpstreamDataset: true,
      });
      return;
    }

    // Mode 3: bundled default dataset (checked in at data/).
    // No env vars needed — works out of the box in CI and locally.
    const dataset = await loadLeadGenerationJsonlDataset();
    await evaluateDataset({ dataset });
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
  evaluate.describe('evaluator calibration', () => {
    const CALIBRATION_DATASET = {
      name: 'lead generation: evaluator calibration',
      description: 'Synthetic outputs used to verify evaluators can produce a score of 0',
      examples: [{ input: {}, output: { leads: [] } }],
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
                entities: [{ type: 'user', name: 'jdoe' }],
                tags: ['lateral-movement'],
                priority: 7,
                chatRecommendations: ['What did jdoe access in the past 24h?'],
                timestamp: new Date().toISOString(),
                staleness: 'fresh',
                status: 'active',
                observations: [],
                executionUuid: 'cal-exec-1',
                sourceType: 'adhoc',
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
                entities: [{ type: 'host', name: 'web-server-01' }],
                tags: ['lateral-movement'],
                priority: 15, // out of 1–10 range — isValidLead fails
                chatRecommendations: ['What processes ran on web-server-01?'],
                timestamp: new Date().toISOString(),
                staleness: 'fresh',
                status: 'active',
                observations: [],
                executionUuid: 'cal-exec-2',
                sourceType: 'adhoc',
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
                  entities: [{ type: 'user', name: 'unknown' }],
                  tags: [],
                  priority: 5,
                  chatRecommendations: ['Check logs'],
                  timestamp: new Date().toISOString(),
                  staleness: 'fresh',
                  status: 'active',
                  observations: [],
                  executionUuid: 'cal-exec-vague',
                  sourceType: 'adhoc',
                },
              ],
            }),
          },
          [createLeadGenerationRubricEvaluator({ inferenceClient: evaluationInferenceClient, log })]
        );
      }
    );
  });

  evaluate.describe('smoke tests', () => {
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
                    input: {},
                    output: { leads: [] },
                  },
                ],
              },
            ],
            task: async ({ input }) =>
              runLeadGeneration({
                leadGenerationClient,
                connectorId: connector.id,
                input,
                log,
              }),
          },
          [
            {
              name: 'Ran',
              kind: 'CODE',
              evaluate: async ({ output }) => ({
                score: Array.isArray(output?.leads) && !output?.errors?.length ? 1 : 0,
              }),
            },
          ]
        );
      }
    );

    /**
     * Verify the status endpoint reflects the execution after a generate call.
     *
     * This test scores 0 (rather than failing the harness) when the status
     * endpoint is unavailable (e.g. leadGenerationEnabled feature flag is off
     * or the route has not been implemented yet). A score of 1 means both the
     * pipeline completed and the status endpoint correctly reflects its UUID.
     */
    evaluate(
      'status endpoint reflects completed execution',
      async ({ executorClient, leadGenerationClient, connector, log }) => {
        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'lead generation: status smoke',
                description: 'Verifies that the status endpoint tracks the last execution UUID',
                examples: [
                  {
                    input: {},
                    output: { leads: [] },
                  },
                ],
              },
            ],
            task: async ({ input }) => {
              const result = await runLeadGeneration({
                leadGenerationClient,
                connectorId: connector.id,
                input,
                log,
              });

              // getStatus() may return 404 when leadGenerationEnabled is false
              // or when the /status route is not yet implemented. Treat that as
              // a missing UUID so the evaluator records 0 without crashing.
              const statusExecutionUuid = await leadGenerationClient
                .getStatus()
                .then((s) => s.lastExecutionUuid)
                .catch(() => undefined);

              return {
                ...result,
                raw: {
                  ...result.raw,
                  statusExecutionUuid,
                },
              };
            },
          },
          [
            {
              name: 'StatusMatchesExecution',
              kind: 'CODE',
              evaluate: async ({ output }) => {
                const typedOutput = output as
                  | (typeof output & {
                      raw?: { executionUuid?: string; statusExecutionUuid?: string };
                    })
                  | undefined;

                const executionUuid = typedOutput?.raw?.executionUuid;
                const statusUuid = typedOutput?.raw?.statusExecutionUuid;

                return {
                  score: executionUuid && executionUuid === statusUuid ? 1 : 0,
                };
              },
            },
          ]
        );
      }
    );
  });
});
