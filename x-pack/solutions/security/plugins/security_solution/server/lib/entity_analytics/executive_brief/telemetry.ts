/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attributes, Span } from '@opentelemetry/api';
import { withActiveSpan } from '@kbn/tracing-utils';
import type {
  BriefErrorCode,
  BriefJobStage,
  SignalStatus,
} from '../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { VerificationCheck } from './verification/types';

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
  verificationDropped: Partial<Record<VerificationCheck, number>>;
}
