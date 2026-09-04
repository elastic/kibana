/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EvalsExecutorClient, Evaluator } from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import { evaluate, tags } from '../src/evaluate';
import { DEEP_WATCH_GOLDEN_ROWS, DEEP_WATCH_ROW_BY_ID } from '../src/golden_dataset';
import { setupWatchCell, teardownWatchCell } from '../src/watch_cell_setup';
import { enableDeepWatch, runDeepWatch } from '../src/deep_watch_run';
import { summarizeDiscrimination } from '../src/evaluators';
import type { GateOutcome } from '../src/evaluators';

interface DeepWatchTaskOutput extends Record<string, unknown> {
  executionId: string;
  status: string;
  isIncident: boolean;
  forensicsRan: boolean;
  gateCorrect: number;
  triageCorrect: number;
  validContract: number;
  cleanFallbacks: number;
}

/** Context injected by the evals runner (see sibling alert-analysis suite). */
interface DeepWatchEvalContext {
  executorClient: EvalsExecutorClient;
  esClient: EsClient;
  fetch: HttpHandler;
  log: ToolingLog;
}

/**
 * Lift a precomputed 0/1 signal off the task output into an evaluator score.
 *
 * The grading happens in the task (it needs the live execution), so these are
 * thin projections rather than independent judges -- kept as real evaluators so
 * each signal lands as its own named score on the scorecard instead of being
 * buried in the task payload.
 */
const scoreFromTask = (name: string, pick: (output: DeepWatchTaskOutput) => number): Evaluator =>
  ({
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }: { output: DeepWatchTaskOutput }) => ({
      score: pick(output),
    }),
  } as unknown as Evaluator);

/**
 * Deep Watch gate-discrimination suite.
 *
 * This grades the WATCH, not the forensic skill -- skill-level quality is
 * covered by `kbn-evals-suite-endpoint/evals/endpoint_forensic_analysis`.
 * The question here is narrower and is a safety property: does the
 * `reconstruct_if_incident` gate open exactly when triage confirms an
 * incident, and stay shut otherwise?
 *
 * The dataset carries both directions on purpose. An all-positive dataset
 * scores 1.0 against a gate wired permanently open, so `discriminates`
 * (at least one correct open AND one correct close) is asserted after the
 * run rather than reported as an accuracy number.
 */
evaluate.describe('Deep Watch forensic gate', { tag: tags.stateful.classic }, () => {
  evaluate(
    'runs forensic reconstruction exactly when triage confirms an incident',
    async ({ executorClient, esClient, fetch, log }: DeepWatchEvalContext) => {
      // Self-provision the cell: kill-chain events + one AD alert per row.
      await setupWatchCell({ esClient, log, rows: DEEP_WATCH_GOLDEN_ROWS });
      try {
        await enableDeepWatch({ fetch, log });
        const outcomes: GateOutcome[] = [];

        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'security: deep-watch-forensic-gate-discrimination',
                description:
                  'Runs the managed Deep Watch end-to-end against labeled Attack Discovery ' +
                  'narratives and grades whether the gated forensic reconstruction step fired ' +
                  'in the correct direction. Includes a negative row (must skip) and a row ' +
                  'whose benign narrative is contradicted by seeded telemetry.',
                examples: DEEP_WATCH_GOLDEN_ROWS.map((row) => ({
                  input: { attackDiscoveryAlertId: row.id },
                  output: {
                    isIncident: row.expectedIncident,
                    forensicsRan: row.expectForensics,
                  },
                  metadata: {
                    goldenId: row.id,
                    rowType: row.rowType,
                    host: row.host,
                    description: row.description,
                  },
                })),
              },
            ],
            task: async ({ metadata }: { metadata: Record<string, unknown> }) => {
              const goldenId = metadata.goldenId as string;
              const row = DEEP_WATCH_ROW_BY_ID.get(goldenId);
              if (!row) {
                throw new Error(`No golden row for ${goldenId}`);
              }

              const result = await runDeepWatch({
                fetch,
                log,
                attackDiscoveryAlertId: row.id,
              });

              const outcome: GateOutcome = {
                id: row.id,
                expectedIncident: row.expectedIncident,
                expectForensics: row.expectForensics,
                actualIncident: result.output.isIncident === true,
                actualForensics: result.forensicsRan,
              };
              outcomes.push(outcome);

              const {
                gateCorrectness,
                triageCorrectness,
                validOutputContract,
                cleanSkipFallbacks,
              } = await import('../src/evaluators');

              return {
                executionId: result.executionId,
                status: result.status,
                isIncident: outcome.actualIncident,
                forensicsRan: outcome.actualForensics,
                gateCorrect: gateCorrectness(outcome),
                triageCorrect: triageCorrectness(outcome),
                validContract: validOutputContract(result.output),
                cleanFallbacks: cleanSkipFallbacks(result.output),
              } satisfies DeepWatchTaskOutput;
            },
          },
          [
            scoreFromTask('gate_correctness', (output) => output.gateCorrect),
            scoreFromTask('triage_correctness', (output) => output.triageCorrect),
            scoreFromTask('valid_output_contract', (output) => output.validContract),
            scoreFromTask('clean_skip_fallbacks', (output) => output.cleanFallbacks),
          ] as never
        );

        const report = summarizeDiscrimination(outcomes);
        log.info(`Deep Watch gate discrimination: ${JSON.stringify(report)}`);
        if (!report.discriminates) {
          throw new Error(
            `Gate did not discriminate: ${report.truePositives}/${report.positives} correct opens, ` +
              `${report.trueNegatives}/${report.negatives} correct closes. A suite that only ever ` +
              'observes one direction cannot distinguish a working gate from one wired open.'
          );
        }
      } finally {
        await teardownWatchCell({ esClient, rows: DEEP_WATCH_GOLDEN_ROWS });
      }
    }
  );
});
