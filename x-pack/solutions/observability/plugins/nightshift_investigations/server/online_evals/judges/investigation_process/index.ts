/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorResult, RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { renderRound, roundEvidenceSchema } from '../render_round';
import { capExplanation, gradeToScore, runJudge } from '../run_judge';
import {
  INVESTIGATION_PROCESS_TOOL_NAME,
  investigationProcessOutputSchema,
  investigationProcessPrompt,
} from './prompt';

type Score = EvaluatorResult['scores'][number];

const gradedScore = (name: string, grade: number, reasoning: string): Score => ({
  name,
  score: gradeToScore(grade),
  label: `${grade}/3`,
  explanation: capExplanation(reasoning),
});

export const investigationProcessJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_investigation_process',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    'Reference-free: how a Nightshift investigation was carried out, from alert semantics and decision tree use to causal validation, hypothesis coverage, evidence grounding and when it stopped.',
  evidenceSchema: roundEvidenceSchema,
  async evaluate({ round, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_investigation_process judge'
      );
    }

    const output = await runJudge({
      inferenceClient,
      prompt: investigationProcessPrompt,
      input: { transcript: renderRound(round) },
      toolName: INVESTIGATION_PROCESS_TOOL_NAME,
      outputSchema: investigationProcessOutputSchema,
    });

    return {
      scores: [
        gradedScore(
          'rca_monitor_semantics_ok',
          output.monitor_semantics,
          output.monitor_semantics_reasoning
        ),
        ...(output.decision_tree_applicable
          ? [
              gradedScore(
                'rca_decision_tree_usage',
                output.decision_tree_usage,
                output.decision_tree_reasoning
              ),
            ]
          : []),
        gradedScore(
          'rca_causal_validation',
          output.causal_validation,
          output.causal_validation_reasoning
        ),
        ...(output.hypothesis_coverage_applicable
          ? [
              gradedScore(
                'rca_hypothesis_coverage',
                output.hypothesis_coverage,
                output.hypothesis_coverage_reasoning
              ),
            ]
          : []),
        gradedScore(
          'rca_evidence_grounding',
          output.evidence_grounding,
          output.evidence_grounding_reasoning
        ),
        gradedScore(
          'rca_stop_condition_ok',
          output.stop_condition,
          output.stop_condition_reasoning
        ),
      ],
    };
  },
};
