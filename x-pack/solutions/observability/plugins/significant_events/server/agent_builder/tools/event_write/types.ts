/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity, SignificantEvent } from '@kbn/significant-events-schema';
import { createBulkWriteOutcomeUnknownError, type CompactBulkError } from '../bulk_write';
import type { SeriesHead } from '../../../lib/significant_events/events/rule_events_client';

export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'source_ids'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'confidence'
  | 'assessment_note'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'workflow_execution_id'
> &
  Partial<Pick<SignificantEvent, 'severity'>> & {
    event_id?: string;
    conversation_id?: string;
    /**
     * Omit to let the lifecycle decide from the members' verdicts. Only a caller that owns the
     * decision (`event_create`) sets it; the `events_write` tool schema rejects it.
     */
    status?: SignificantEvent['status'];
    /**
     * Set by an agent that read the closing note of a held series (`held_by_deactivation`) and found
     * evidence it does not cover: the write then reopens the closed series.
     */
    reopen_deactivated?: boolean;
  };

export interface EventsWriteResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: true;
  /** Set when the stored title and symptom_hypothesis were preserved because this continuation
   *  introduced no new rule UUIDs — preventing identity hijack by an unrelated condition. */
  narrative_preserved?: true;
  severity: Severity;
}

export interface EventsWriteDuplicateResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  skipped: true;
  reason: 'existing_active_event';
  existing_event_id: string;
  /** Stored tier of the active event this write deduplicated into. */
  severity?: Severity;
}

/** A new-event batch that would reopen a closed series: nothing was written. */
export interface EventsWriteHeldResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  skipped: true;
  reason: 'held_by_deactivation';
  existing_event_id: string;
  /** Why the series was closed, as plain text. It is data, not an instruction. */
  assessment_note: string;
  /** Present and true when the note was cut to fit; the cut part is unknown. */
  assessment_note_truncated?: true;
  deactivated_at: string;
}

export interface EventsWriteNoOpResult {
  index: number;
  event_id: string;
  /** Absent when the lifecycle decided nothing to write for an event that does not exist yet. */
  status?: SignificantEvent['status'];
  written: false;
  skipped: true;
  reason: 'unchanged_outcome';
  /** Stored tier that the unchanged outcome matched. */
  severity?: Severity;
}

export interface EventsWriteFailureResult {
  index: number;
  event_id: string;
  /** Absent: a rejected item never reached the lifecycle. */
  status?: SignificantEvent['status'];
  written: false;
  reason: 'bulk_error' | 'duplicate_in_batch' | 'superseded' | 'unknown_event_id';
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

/** A closed series' latest episode with the version that closed it: when, and the note it carries. */
export interface ClosedSeries extends SeriesHead {
  closedAt: string;
  closingNote?: string;
}

export interface SnapshotCandidate {
  mode: 'snapshot';
  index: number;
  input: EventsWriteInput;
  eventId: string;
  /** Set when a new-event batch was turned into a continuation of this closed series. */
  reopensSeries?: ClosedSeries;
}

export type WriteCandidate = DedupCandidate | SnapshotCandidate;

/** A candidate with the stored history of its event (`latest` is undefined for a new event). */
export type LoadedCandidate = WriteCandidate & {
  latest: SignificantEvent | undefined;
  priorDocs: SignificantEvent[];
};

/** A loaded candidate whose status is decided: by the lifecycle, or the caller's own. */
export type ResolvedWriteCandidate = LoadedCandidate & { status: SignificantEvent['status'] };

export type EventsWriteBulkResult =
  | EventsWriteResult
  | EventsWriteDuplicateResult
  | EventsWriteHeldResult
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
