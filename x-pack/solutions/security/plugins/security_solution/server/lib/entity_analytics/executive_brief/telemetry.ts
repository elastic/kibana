/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attributes, Span } from '@opentelemetry/api';
import type { EventTypeOpts } from '@kbn/core/server';
import { withActiveSpan } from '@kbn/tracing-utils';
import type {
  BriefErrorCode,
  BriefJobStage,
  SignalStatus,
  VerificationSummary,
} from '../../../../common/api/entity_analytics/executive_brief/common.gen';

/** Spans nest as generate → gather → signal (one per signal) → compose → verify. */
export type BriefSpanName = 'generate' | 'signal' | BriefJobStage;

export const withBriefSpan = <T>(
  name: BriefSpanName,
  attributes: Attributes,
  fn: (span?: Span) => Promise<T>
): Promise<T> => withActiveSpan(`executive_brief.${name}`, { attributes }, fn);

/** One EBT event per finished job; no free text, entity names or prompts. */
export interface BriefCompletedEvent {
  outcome: 'succeeded' | 'failed';
  errorCode?: BriefErrorCode;
  range: string;
  model?: string;
  durationMs: number;
  signals: Array<{ id: string; status: SignalStatus; durationMs: number; factCount: number }>;
  entityCount: number;
  factCount: number;
  tokens?: { prompt: number; completion: number };
  repaired: boolean;
  levelsLowered: number;
  verificationDropped: VerificationSummary['dropped'];
}

const briefDroppedSchema = (check: string) =>
  ({
    type: 'long',
    _meta: {
      description: `Brief items removed by the ${check} check during verification`,
      optional: true,
    },
  } as const);

// One event per finished executive brief job. Counts and codes only: no free text, entity names
// or prompts.
export const ENTITY_ANALYTICS_EXECUTIVE_BRIEF_COMPLETED_EVENT: EventTypeOpts<BriefCompletedEvent> =
  {
    eventType: 'entity_analytics_executive_brief_completed',
    schema: {
      outcome: {
        type: 'keyword',
        _meta: { description: 'Job outcome: "succeeded" or "failed"' },
      },
      errorCode: {
        type: 'keyword',
        _meta: {
          description:
            'Bounded failure code (e.g. "timeout", "llm_error", "llm_output", "interrupted") when the job failed',
          optional: true,
        },
      },
      range: {
        type: 'keyword',
        _meta: { description: 'Time range the brief covers: "24h", "7d" or "30d"' },
      },
      model: {
        type: 'keyword',
        _meta: {
          description: 'Model id reported by the LLM provider, when available',
          optional: true,
        },
      },
      durationMs: {
        type: 'long',
        _meta: { description: 'Total job duration in milliseconds' },
      },
      signals: {
        type: 'array',
        items: {
          properties: {
            id: {
              type: 'keyword',
              _meta: { description: 'Signal id, e.g. "attack_discoveries"' },
            },
            status: {
              type: 'keyword',
              _meta: {
                description: 'Signal status: "ok", "empty", "unavailable", "timeout" or "error"',
              },
            },
            durationMs: {
              type: 'long',
              _meta: { description: 'Signal duration in milliseconds' },
            },
            factCount: {
              type: 'long',
              _meta: { description: 'Number of facts the signal produced' },
            },
          },
        },
        _meta: { description: 'One entry per signal that ran in the gather stage' },
      },
      entityCount: {
        type: 'long',
        _meta: { description: 'Number of entities in the gathered evidence' },
      },
      factCount: {
        type: 'long',
        _meta: { description: 'Number of facts in the gathered evidence' },
      },
      tokens: {
        properties: {
          prompt: {
            type: 'long',
            _meta: { description: 'Input (prompt) tokens across all LLM calls of the job' },
          },
          completion: {
            type: 'long',
            _meta: { description: 'Output (completion) tokens across all LLM calls of the job' },
          },
        },
        _meta: {
          description: 'LLM token usage, when the provider reported it',
          optional: true,
        },
      },
      repaired: {
        type: 'boolean',
        _meta: { description: 'Whether a repair round-trip to the LLM was needed' },
      },
      levelsLowered: {
        type: 'long',
        _meta: { description: 'Attention levels lowered to what the cited evidence supports' },
      },
      verificationDropped: {
        properties: {
          citation: briefDroppedSchema('citation'),
          number: briefDroppedSchema('number'),
          guardrail: briefDroppedSchema('guardrail'),
        },
        _meta: { description: 'Brief items removed during verification, per check' },
      },
    },
  };
