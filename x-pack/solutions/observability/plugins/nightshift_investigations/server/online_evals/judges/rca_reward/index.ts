/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorResult, RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { renderRound, roundEvidenceSchema } from '../render_round';
import { capExplanation, runJudge } from '../run_judge';
import { RCA_REWARD_TOOL_NAME, rcaRewardOutputSchema, rcaRewardPrompt } from './prompt';

type Score = EvaluatorResult['scores'][number];

const CONFIDENCE_PATTERN =
  /(?:~?\s*(\d{1,3})\s*%\s*(?:confidence|probability|likely|chance))|(?:(?:confidence|probability|likely|chance)[:\s~]?\s*(\d{1,3})\s*%)/gi;
const DECIMAL_CONFIDENCE_PATTERN = /(?:probability|confidence)[:\s]*([01]\.\d+)/gi;

/** The highest confidence the answer states, as a 0-1 fraction, if it states one. */
export const extractMaxConfidence = (text: string): number | undefined => {
  const confidences = [
    ...[...text.matchAll(CONFIDENCE_PATTERN)].map((match) => Number(match[1] ?? match[2]) / 100),
    ...[...text.matchAll(DECIMAL_CONFIDENCE_PATTERN)].map((match) => Number(match[1])),
  ].filter(Number.isFinite);
  return confidences.length > 0 ? Math.max(...confidences) : undefined;
};

/** The tighter the gap between cause and alert onset, the higher the score. */
export const temporalProximityScore = (minutes: number | null | undefined): number | undefined => {
  if (minutes === null || minutes === undefined || minutes < 0) {
    return undefined;
  }
  if (minutes <= 5) return 1;
  if (minutes <= 30) return 0.75;
  if (minutes <= 120) return 0.5;
  if (minutes <= 720) return 0.25;
  return 0.1;
};

export const rcaRewardJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_rca_reward',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    'Reference-free: whether a Nightshift investigation found evidence, how close its cause is to the alert onset, and whether its timeline, sources and stated confidence hold up.',
  evidenceSchema: roundEvidenceSchema,
  async evaluate({ round, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error('Inference client is required for the nightshift_rca_reward judge');
    }

    const output = await runJudge({
      inferenceClient,
      prompt: rcaRewardPrompt,
      input: { transcript: renderRound(round) },
      toolName: RCA_REWARD_TOOL_NAME,
      outputSchema: rcaRewardOutputSchema,
    });

    const scores: Score[] = [
      {
        name: 'rca_investigation_complete',
        score: output.investigation_produced_evidence ? 1 : 0,
        explanation: capExplanation(output.investigation_reasoning),
      },
    ];

    const minutes = output.root_cause_timestamp_minutes_before_onset;
    const proximity = temporalProximityScore(minutes);
    if (proximity !== undefined && minutes != null) {
      scores.push({
        name: 'rca_temporal_proximity',
        score: proximity,
        label: `gap=${Math.round(minutes)}min`,
        explanation: capExplanation(output.temporal_proximity_reasoning),
      });
    } else if (output.temporal_proximity_reasoning) {
      scores.push({
        name: 'rca_temporal_proximity',
        score: 0,
        label: minutes != null && minutes < 0 ? 'cause_after_onset' : 'no_timestamps',
        explanation: capExplanation(output.temporal_proximity_reasoning),
      });
    }

    // Without evidence these would pass vacuously, which is misleading.
    if (output.investigation_produced_evidence) {
      scores.push(
        {
          name: 'rca_timeline_ok',
          score: output.timeline_contradiction_found ? 0 : 1,
          explanation: capExplanation(output.timeline_reasoning),
        },
        {
          name: 'rca_anti_leakage',
          score: output.used_post_incident_evidence ? 0 : 1,
          explanation: capExplanation(output.anti_leakage_reasoning),
        }
      );
    }

    const statedConfidence = extractMaxConfidence(round.response.message);
    if (statedConfidence !== undefined) {
      scores.push({
        name: 'rca_confidence_ok',
        score: output.confidence_overconfident ? 0 : 1,
        label: `stated_confidence=${Math.round(statedConfidence * 100)}%`,
      });
    }

    return { scores };
  },
};
