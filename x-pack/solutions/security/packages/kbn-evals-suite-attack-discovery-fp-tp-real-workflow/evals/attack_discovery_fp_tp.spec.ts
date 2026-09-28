/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * FP/TP verdict eval for the attack-discovery review workflow.
 *
 * The workflow under test is still a STUB on main (elastic/security-team#19282), so the
 * verdict path is not exercisable yet: this suite currently validates the harness
 * (run/poll/structured-output plumbing in `workflow_task`) and the dataset layer
 * (7 vendored corpora, 1,017 validated cases, loader + evaluators). When the review
 * workflow lands, the examples below drive it end-to-end exactly like the
 * alert-analysis classification suite.
 *
 * Permitted-use rules enforced via example metadata (see package README):
 *   - guide-sanity is SANITY ONLY: noisy public GUIDE labels may sanity-check verdicts
 *     at the corpus level but must NEVER gate releases.
 *   - botsv3-fp-alerts and cloud-fp-synthetic are PROVISIONAL: labels pending review.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  selectEvaluators,
  tags,
  type DefaultEvaluators,
  type EvalConnector,
  type EvaluationDataset,
  type Example,
} from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { CORPUS_NAMES, FP_TP_INFERENCE_FEATURE_ID, type CorpusName } from '../src/constants';
import { loadCorpusExamples } from '../src/corpus_loader';
import { payloadConformance, verdictAccuracy, VERDICT_QUALITY_CRITERIA } from '../src/evaluators';
import { overrideInferenceFeature } from '../src/inference_override';
import { runAttackDiscoveryWorkflow } from '../src/workflow_task';

interface AttackDiscoveryExample extends Example {
  input: { caseId: string; payload: Record<string, unknown> };
  output: { classification: string };
  expected: { label: string };
  metadata: {
    caseId: string;
    corpus: CorpusName;
    label: string;
    labelProvenance: string;
    sourceRef: string;
    goldRationale: string;
    sanityOnly: boolean;
    provisional: boolean;
  };
}

const corpusDataset = (name: CorpusName): EvaluationDataset => {
  const all = loadCorpusExamples(name) as AttackDiscoveryExample[];
  // Live-run cap: live LLM verdicts run ~28s/case (run9), so 7 corpora × 20
  // cases ≈ 66min of grading. Cap at 15 per corpus (105 cases ≈ 50min) inside
  // the 120-min Playwright test timeout; raise (or unset) for a full sweep.
  const max = Number(process.env.FP_TP_MAX_EXAMPLES_PER_CORPUS ?? 15);
  const examples = Number.isFinite(max) && max > 0 ? all.slice(0, max) : all;
  return {
    name: `security: attack-discovery-fp-tp ${name}`,
    description: `${examples.length} labeled ${name} cases graded against the review verdict.`,
    examples,
  };
};

evaluate.describe(
  'Attack Discovery — FP/TP verdict accuracy',
  { tag: tags.stateful.classic },
  () => {
    // The workflow's `ai.agent` step resolves its connector from the
    // `alertzero_reasoning` inference feature, so route that feature to the run's
    // evaluation connector for the duration of the suite and restore it after.
    let restoreInferenceSettings: (() => Promise<void>) | undefined;

    evaluate.beforeAll(
      async ({
        fetch,
        connector,
        log,
      }: {
        fetch: HttpHandler;
        connector: EvalConnector;
        log: ToolingLog;
      }) => {
        restoreInferenceSettings = await overrideInferenceFeature({
          fetch,
          featureId: FP_TP_INFERENCE_FEATURE_ID,
          endpointId: connector.id,
        });
        log.info(`Routed ${FP_TP_INFERENCE_FEATURE_ID} to connector ${connector.id}`);
      }
    );

    evaluate.afterAll(async ({ log }: { log: ToolingLog }) => {
      await restoreInferenceSettings?.().catch((error: Error) =>
        log.warning(`Could not restore inference settings: ${error.message}`)
      );
    });

    evaluate(
      'runs the attack-discovery review workflow per corpus case and grades the verdict',
      async ({
        executorClient,
        evaluators,
        fetch,
        log,
      }: {
        executorClient: { runExperiment: Function };
        evaluators: Pick<DefaultEvaluators, 'criteria'>;
        fetch: HttpHandler;
        log: ToolingLog;
      }) => {
        const selectedEvaluators = selectEvaluators([
          verdictAccuracy,
          payloadConformance,
          evaluators.criteria(VERDICT_QUALITY_CRITERIA) as never,
        ]);

        await executorClient.runExperiment(
          {
            datasets: CORPUS_NAMES.map(corpusDataset),
            task: async (example: {
              input: { caseId: string; payload: Record<string, unknown> };
            }) => {
              // ExperimentTask receives the full Example (kbn-evals `ExperimentTask`),
              // so caseId/payload come from `example.input` — NOT `example.metadata`,
              // which does not carry the payload (run8's crash source).
              const { caseId, payload } = example.input;
              log.info(`Running attack-discovery workflow for case ${caseId}`);
              return runAttackDiscoveryWorkflow({ fetch, log, payload, caseId });
            },
          },
          selectedEvaluators
        );
      }
    );
  }
);
