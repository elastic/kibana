/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import { createBulkWriteOutcomeUnknownError, type CompactBulkError } from '../bulk_write';

export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'status'
  | 'stream_names'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'severity'
  | 'confidence'
  | 'assessment_note'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'workflow_execution_id'
> & {
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

/** Fills in every still-undefined slot or throws. */
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
