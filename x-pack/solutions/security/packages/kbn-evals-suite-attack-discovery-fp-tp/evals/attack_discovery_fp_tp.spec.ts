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
  type EvaluationDataset,
  type Example,
  type DefaultEvaluators,
} from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { CORPUS_NAMES, type CorpusName } from '../src/constants';
import { loadCorpusExamples } from '../src/corpus_loader';
import { payloadConformance, verdictAccuracy, VERDICT_QUALITY_CRITERIA } from '../src/evaluators';
import { runAttackDiscoveryWorkflow } from '../src/workflow_task';

interface AttackDiscoveryExample extends Example {
  input: { caseId: string; payload: Record<string, unknown> };
  output: Record<string, never>;
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
  const examples = loadCorpusExamples(name) as AttackDiscoveryExample[];
  return {
    name: `security: attack-discovery-fp-tp ${name}`,
    description: `${examples.length} labeled ${name} cases graded against the review verdict.`,
    examples,
  };
};

evaluate.describe('Attack Discovery — FP/TP verdict accuracy', () => {
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
          task: async ({ metadata }: { metadata: unknown }) => {
            const { caseId, payload } = metadata as {
              caseId: string;
              payload: Record<string, unknown>;
            };
            log.info(`Running attack-discovery workflow for case ${caseId}`);
            return runAttackDiscoveryWorkflow({ fetch, log, payload });
          },
        },
        selectedEvaluators
      );
    }
  );
});
