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
            dataset: {
              name: 'lead generation: e2e smoke',
              description: 'Basic smoke test for the lead generation pipeline',
              examples: [
                {
                  input: {},
                  output: { leads: [] },
                },
              ],
            },
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
            dataset: {
              name: 'lead generation: status smoke',
              description: 'Verifies that the status endpoint tracks the last execution UUID',
              examples: [
                {
                  input: {},
                  output: { leads: [] },
                },
              ],
            },
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
