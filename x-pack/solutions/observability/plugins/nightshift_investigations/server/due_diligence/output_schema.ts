/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  DUE_DILIGENCE_CANDIDATE_MAX_CHARS,
  DUE_DILIGENCE_MAX_HYPOTHESES,
  DUE_DILIGENCE_MIN_CONFIDENCE,
  DUE_DILIGENCE_THOUGHTS_MAX_CHARS,
} from './constants';

/**
 * Whether the hypothesis accounts for why the alert changed state (fired, cleared or fired again):
 * - explained: it rests on something this investigation saw move at that moment;
 * - background_only: it was already present and flat across the change, only coincides in time, or
 *   is a cause restated from notes or knowledge without a check on this alert's own data;
 * - unexplained: the investigation never looked at what moved when the alert changed state;
 * - not_applicable: the investigation is not about an alert.
 */
export const ALERT_STATE_CHANGE_VERDICTS = [
  'explained',
  'background_only',
  'unexplained',
  'not_applicable',
] as const;

export type AlertStateChangeVerdict = (typeof ALERT_STATE_CHANGE_VERDICTS)[number];

export const dueDiligenceOutputSchema = lazySchema(() =>
  z.object({
    hypotheses: z.array(
      z.object({
        candidate: z.string().min(1),
        confidence: z.number(),
        alert_state_change: z.enum(ALERT_STATE_CHANGE_VERDICTS),
        thoughts: z.string().min(1),
      })
    ),
  })
);

export type DueDiligenceOutput = z.infer<typeof dueDiligenceOutputSchema>;

export interface ReviewedHypothesis {
  candidate: string;
  confidence: number;
  alertStateChange: AlertStateChangeVerdict;
  thoughts: string;
}

const clip = (text: string, max: number): string => (text.length > max ? text.slice(0, max) : text);

/** Confidence given as a percentage is read as one: a model may answer 70 where 0.7 was asked. */
const toFraction = (confidence: number): number =>
  Math.min(1, Math.max(0, confidence > 1 ? confidence / 100 : confidence));

/**
 * The hypotheses to hand back: those at or above the confidence bar, strongest first, trimmed to
 * what a note can carry. The bar is applied here and not left to the model.
 */
export const selectReviewedHypotheses = (output: DueDiligenceOutput): ReviewedHypothesis[] =>
  output.hypotheses
    .map(({ candidate, confidence, alert_state_change: alertStateChange, thoughts }) => ({
      candidate: clip(candidate.trim(), DUE_DILIGENCE_CANDIDATE_MAX_CHARS),
      confidence: toFraction(confidence),
      alertStateChange,
      thoughts: clip(thoughts.trim(), DUE_DILIGENCE_THOUGHTS_MAX_CHARS),
    }))
    .filter(({ confidence }) => confidence >= DUE_DILIGENCE_MIN_CONFIDENCE)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, DUE_DILIGENCE_MAX_HYPOTHESES);

export const DUE_DILIGENCE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    hypotheses: {
      type: 'array',
      description:
        'Every candidate cause the agent is currently treating as likely, with the confidence its evidence supports. Include none the agent has dismissed.',
      items: {
        type: 'object',
        properties: {
          candidate: {
            type: 'string',
            description: 'The candidate cause, as a noun phrase of at most eight words.',
          },
          confidence: {
            type: 'number',
            description:
              'From 0 to 1: how strongly the evidence in the transcript points to it, not how sure the agent sounds.',
          },
          alert_state_change: {
            type: 'string',
            enum: [...ALERT_STATE_CHANGE_VERDICTS],
            description:
              'explained: it rests on something that moved when the alert changed state. background_only: it was already present and flat across the change, only coincides in time, or is restated from notes or knowledge without a check on this alert. unexplained: nobody looked at what moved when the alert changed state. not_applicable: this is not an alert investigation.',
          },
          thoughts: {
            type: 'string',
            description: `Your review of this hypothesis for the agent, at most ${DUE_DILIGENCE_THOUGHTS_MAX_CHARS} characters: what holds, what was not checked, and the one check to run next.`,
          },
        },
        required: ['candidate', 'confidence', 'alert_state_change', 'thoughts'],
      },
    },
  },
  required: ['hypotheses'],
} as const;
