/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, EvalsExecutorClient } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { threatIntelHuntDataset } from './dataset';
import type { HuntBehaviorClient } from './hunt_behavior_client';
import type { HuntTaskOutput } from './types';
import {
  createTechniqueRagEvaluators,
  createTechniqueAccuracyEvaluator,
  createEsqlValidityEvaluator,
  createHallucinationRateEvaluator,
  createCalibrationEvaluator,
  createEceEvaluator,
} from './evaluators';

export type EvaluateThreatIntelHuntDataset = () => Promise<void>;

export function createEvaluateThreatIntelHuntDataset({
  huntBehaviorClient,
  evaluators,
  executorClient,
  log,
}: {
  huntBehaviorClient: HuntBehaviorClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  log: ToolingLog;
}): EvaluateThreatIntelHuntDataset {
  const { latency, inputTokens, outputTokens } = evaluators.traceBasedEvaluators;

  // Ground truth per report id, so the calibration evaluator can score each
  // proposed technique's confidence against whether it was actually correct.
  const expectedByReport = new Map<string, Set<string>>(
    threatIntelHuntDataset.map((ex) => [
      ex.input?.report_id ?? '',
      new Set(ex.output?.techniques ?? []),
    ])
  );

  return async function evaluateThreatIntelHuntDataset(): Promise<void> {
    await executorClient.runExperiment(
      {
        datasets: [
          {
            name: 'security-threat-intel-hunt: technique extraction',
            description: `Threat-intel behavioral extraction: ${threatIntelHuntDataset.length} labeled reports (report body → MITRE ATT&CK techniques + ES|QL rules)`,
            examples: threatIntelHuntDataset,
          },
        ],
        task: async ({ input }) => {
          const reportId = input?.report_id as string | undefined;
          const text = (input?.body_text as string | undefined) ?? '';

          // Drives the REAL `hunt_behavior` route — one live structured-output
          // LLM extraction per report against the configured EIS connector.
          const response = await huntBehaviorClient.extract(text, reportId);

          const output: HuntTaskOutput = {
            reportId,
            techniques: response.behaviors.map((b) => b.technique_id),
            parentTechniques: response.behaviors
              .map((b) => b.parent_technique_id)
              .filter((id): id is string => typeof id === 'string' && id.length > 0),
            droppedUnknownIds: response.dropped_unknown_ids,
            esqlRules: response.behaviors
              .map((b) => b.proposed_esql_rule)
              .filter((r): r is string => typeof r === 'string' && r.length > 0),
            behaviors: response.behaviors,
          };
          return output;
        },
      },
      [
        // Quality — deterministic CODE evaluators scoring the live LLM output
        // against ground truth. No judge LLM.
        ...createTechniqueRagEvaluators(),
        createTechniqueAccuracyEvaluator(expectedByReport),
        createEsqlValidityEvaluator(),
        createHallucinationRateEvaluator(),
        // Calibration — ECE is the primary metric (PR #35 § 5.3, gate <= 0.10);
        // Brier retained as a supporting view.
        createEceEvaluator(expectedByReport),
        createCalibrationEvaluator(expectedByReport),
        // Observability — trace-based, zero extra LLM cost.
        latency,
        inputTokens,
        outputTokens,
      ]
    );
  };
}
