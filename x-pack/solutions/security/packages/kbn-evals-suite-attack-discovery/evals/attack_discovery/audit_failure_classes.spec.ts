/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { Evaluator, TaskOutput } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { resolveConcurrency } from '../../src/evaluate_dataset';
import { buildAuditExamples } from '../../src/audit_failure_classes/registry';
import { createAttackDiscoveryBasicEvaluator } from '../../src/evaluators/attack_discovery_basic_evaluator';
import { createAuditConditionalRemediationEvaluator } from '../../src/evaluators/audit_conditional_remediation_evaluator';
import { createAuditEntityCoOccurrenceEvaluator } from '../../src/evaluators/audit_entity_co_occurrence_evaluator';
import { createAuditForbiddenJoinEvaluator } from '../../src/evaluators/audit_forbidden_join_evaluator';
import { createAuditMetaAlertAsEvidenceEvaluator } from '../../src/evaluators/audit_meta_alert_as_evidence_evaluator';
import { createAuditNegativeControlEvaluator } from '../../src/evaluators/audit_negative_control_evaluator';
import { createAuditPositiveControlRecallEvaluator } from '../../src/evaluators/audit_positive_control_recall_evaluator';
import { runAttackDiscovery } from '../../src/task/run_attack_discovery';
import type { AttackDiscoveryDatasetExample } from '../../src/types';

/**
 * Synthetic bundledAlerts scenarios, each run as a baseline, an enriched and an enriched_context input variant.
 * Failure classes: invented entity joins, threshold/meta alerts treated as evidence,
 * unconditional containment advice, and no negative control. Scoring is deterministic code only;
 * the LLM rubric is deliberately not attached. Gold and the anonymization replacements are
 * looked up from the registry by `metadata.scenarioId`; the evaluators map tokens in the model
 * output back to original values before comparing.
 *
 * Opt-in: `playwright.config.ts` ignores this spec unless `EVAL_AUDIT_FAILURE_CLASSES=1`.
 */
evaluate.describe('Attack Discovery audit failure classes', { tag: tags.stateful.classic }, () => {
  evaluate(
    'bundled alerts by scenario and input variant',
    async ({ executorClient, inferenceClient, attackDiscoveryClient, evaluators, log }) => {
      const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
        evaluators.traceBasedEvaluators;

      await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'Attack Discovery audit failure classes',
              description:
                'Authored bundledAlerts scenarios (scenario x baseline/enriched/enriched_context input) with declared gold for invented joins, meta-alert evidence, unconditional containment and a negative control.',
              examples: buildAuditExamples(),
            },
          ],
          task: async ({ input }) => {
            if (!input) {
              return { insights: null, errors: ['Missing input'] };
            }
            return runAttackDiscovery({ inferenceClient, attackDiscoveryClient, input, log });
          },
          concurrency: resolveConcurrency(),
        },
        [
          createAttackDiscoveryBasicEvaluator(),
          createAuditForbiddenJoinEvaluator(),
          createAuditEntityCoOccurrenceEvaluator(),
          createAuditMetaAlertAsEvidenceEvaluator(),
          createAuditNegativeControlEvaluator(),
          createAuditPositiveControlRecallEvaluator(),
          createAuditConditionalRemediationEvaluator(),
          toolCalls as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
          latency as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
          inputTokens as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
          outputTokens as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
          cachedTokens as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
        ]
      );
    }
  );
});
