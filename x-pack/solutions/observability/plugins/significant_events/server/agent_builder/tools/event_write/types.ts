/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEffect, Severity, SignificantEvent } from '@kbn/significant-events-schema';
import { createBulkWriteOutcomeUnknownError, type CompactBulkError } from '../bulk_write';

export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'status'
  | 'stream_names'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'assessment_note'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'workflow_execution_id'
> &
  Partial<Pick<SignificantEvent, 'severity' | 'confidence'>> & {
    event_id?: string;
    conversation_id?: string;
  };

export interface EventsWriteResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: true;
  /** Set when the stored title and symptom_hypothesis were preserved because this continuation
   *  introduced no new rule UUIDs — preventing identity hijack by an unrelated condition. */
  narrative_preserved?: true;
  /** Logged (not gated on) for fleet-wide EBT monitoring of the severity policy's behavior,
   *  since `.rule-events` itself never leaves the customer's cluster. `severity` and `effect` are
   *  the coarse, low-cardinality pair that lets a tier skew be told apart from an effect-
   *  classification skew; breadth, fan-out, and `severity_score` are numeric and only
   *  interpretable alongside the full document, so they're left to `.rule-events` analysis
   *  (#1758/#1770) instead of duplicated here. */
  severity: Severity;
  effect: SignalEffect;
}

export interface EventsWriteDuplicateResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  skipped: true;
  reason: 'existing_active_event';
  existing_event_id: string;
}

export interface EventsWriteNoOpResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  skipped: true;
  reason: 'unchanged_outcome';
}

export interface EventsWriteFailureResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  reason: 'bulk_error' | 'duplicate_in_batch' | 'unknown_event_id';
  error: CompactBulkError;
}

export interface DedupCandidate {
  mode: 'dedup';
  index: number;
  input: EventsWriteInput;
  eventId: string;
  ruleUuids: string[];
  confirmedOnly: boolean;
}

export interface SnapshotCandidate {
  mode: 'snapshot';
  index: number;
  input: EventsWriteInput;
  eventId: string;
}

export type WriteCandidate = DedupCandidate | SnapshotCandidate;

export type EventsWriteBulkResult =
  | EventsWriteResult
  | EventsWriteDuplicateResult
  | EventsWriteNoOpResult
  | EventsWriteFailureResult;

export type BulkResults = Array<EventsWriteBulkResult | undefined>;

/** Fills in every still-`undefined` slot or throws — every candidate must resolve to exactly one result. */
export const alignResults = (results: BulkResults, message: string): EventsWriteBulkResult[] => {
  const aligned: EventsWriteBulkResult[] = [];
  for (const result of results) {
    if (result === undefined) {
      throw createBulkWriteOutcomeUnknownError(message);
    }
    aligned.push(result);
  }
  return aligned;
};
