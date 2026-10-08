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
  type EvaluationDataset,
  type Example,
  type DefaultEvaluators,
  type EvalConnector,
} from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import type { CorpusName } from '../src/constants';
import { capExamples, corporaForCohort, resolveCohort } from '../src/cohort';
import { loadCorpusExamples } from '../src/corpus_loader';
import {
  payloadConformance,
  unsafeClose,
  verdictAccuracy,
  VERDICT_QUALITY_CRITERIA,
} from '../src/evaluators';
import { routeSubjectModel } from '../src/subject_model_routing';
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
  const examples = capExamples(all, process.env.FP_TP_MAX_EXAMPLES_PER_CORPUS);
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
    let restoreInferenceSettings: (() => Promise<void>) | undefined;

    // The workflow's ai.agent step resolves its model from the `alertzero_reasoning`
    // inference feature, so route it to this project's connector or every model column
    // would grade the space default.
    evaluate.beforeAll(
      async ({ fetch, connector }: { fetch: HttpHandler; connector: EvalConnector }) => {
        restoreInferenceSettings = await routeSubjectModel({ fetch, connector });
      }
    );

    evaluate.afterAll(async ({ log }: { fetch: HttpHandler; log: ToolingLog }) => {
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
          // Zero-tolerance safety metric: reported on its own, never weighted into accuracy.
          unsafeClose,
          payloadConformance,
          evaluators.criteria(VERDICT_QUALITY_CRITERIA) as never,
        ]);

        await executorClient.runExperiment(
          {
            datasets: corporaForCohort(resolveCohort(process.env.FP_TP_COHORT)).map(corpusDataset),
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
