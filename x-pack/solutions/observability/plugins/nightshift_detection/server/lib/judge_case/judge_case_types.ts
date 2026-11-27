/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionSignal } from '../../../common/detection_signal';
import type { EvidenceReader } from './evidence_reader';
import type { EmptyEvidence, ErroredEvidence, FoundEvidence } from './evidence_types';

/** The signal the judge decides on: a reading as stored, with its query in `data.evidence_esql`. */
export type CaseSignal = DetectionSignal;

/** One member (a signal) of an event, as the caller gives it. */
export interface CaseMember {
  /** The member's series; a member with the signal's own `group_hash` is not read again. */
  group_hash: DetectionSignal['group_hash'];
  title: string;
  /** The query that reproduces the member's reading; it becomes an evidence item's query. */
  evidence_esql: string;
  entity: DetectionSignal['data']['entity'];
  strategy: string;
  unit: string;
  importance: number;
}

/** An event as the caller gives it. */
export interface CaseEvent {
  id: string;
  title: string;
  summary: string;
  /** The lifecycle's word for the event's state; a plain string until the lifecycle defines them. */
  status: string;
  severity?: NonNullable<DetectionSignal['severity']>;
  members: CaseMember[];
}

/** A member as the case shows it: its query is in the evidence item `evidence_id` names. */
export type CaseMemberSummary = Omit<CaseMember, 'evidence_esql'> & { evidence_id: string };

/** An event as the case shows it: only the members whose evidence is read. */
export type CaseEventSummary = Omit<CaseEvent, 'members'> & { members: CaseMemberSummary[] };

/** An existing event the signal could join, with the reasons for it. */
export interface CaseCandidate {
  event: CaseEvent;
  /** How the signal relates to the event; a plain string until join scoring (#2074) defines them. */
  relation: string;
  score: number;
  reasons: string[];
}

/** A candidate as the case shows it. */
export interface CaseCandidateSummary {
  event: CaseEventSummary;
  relation: string;
  score: number;
  reasons: string[];
}

/** A breached alert on the same entities. */
export interface CaseAlert {
  id: string;
  title: string;
  entity: string;
  severity?: NonNullable<DetectionSignal['severity']>;
}

/** What identifies an evidence item and where it came from. */
interface CaseEvidenceBase {
  /** `E1` is the signal's own evidence; `E2` to `En` are the members', in candidate and member order. */
  id: string;
  /** Set on a member's evidence when the case is a new episode: it is from the closed episode. */
  earlier_episode?: boolean;
  title: string;
}

/**
 * One evidence item, by status:
 * - `found`: the query returned rows, a sample of at most 5 for E1 and fewer for a member.
 * - `empty`: the query ran and returned nothing to read. No evidence, never a refutation.
 * - `error`: the query failed, timed out or was aborted. No evidence.
 * - `skipped`: the query was not read, for the run's query cap, or dropped for the case's size
 *   budget (and then it has no `query`). Not evidence either way.
 */
export type CaseEvidence = CaseEvidenceBase &
  (
    | ({ query: string } & (FoundEvidence | EmptyEvidence | ErroredEvidence))
    | { query: string; result: 'skipped'; reason: 'query_cap' }
    | { result: 'skipped'; reason: 'case_budget' }
  );

/** What the case left out, per kind, so the judge knows the case is not the whole picture. */
export interface CaseOmitted {
  candidates: number;
  members: number;
  reasons: number;
  alerts: number;
  notes: number;
}

/** The evidence items that were not read, by why, so a caller can defer a case whose E1 was skipped. */
export interface CaseSkippedEvidence {
  query_cap: number;
  case_budget: number;
}

/**
 * The size of the case's evidence against its budget. The rest of the case is bounded by its own
 * caps (counts and string lengths) and by the signal schema, not by this budget.
 */
export interface CaseBudget {
  max_evidence_chars: number;
  /** Characters of the serialized evidence items, E1 included. */
  evidence_chars: number;
  /** The evidence is still over `max_evidence_chars` after every member was dropped: E1 alone is over it. */
  over_budget: boolean;
}

/** What the judge reads for one signal. */
export interface JudgeCase {
  kind: 'new_event' | 'join' | 'new_episode';
  signal: CaseSignal;
  /** Candidate events, for a `join` case; empty otherwise. */
  candidates: CaseCandidateSummary[];
  /** The closed event the signal would reopen, for a `new_episode` case. */
  closed_event?: CaseEventSummary;
  alerts: CaseAlert[];
  /** Notes from past deactivations. */
  notes: string[];
  evidence: CaseEvidence[];
  omitted: CaseOmitted;
  skipped_evidence: CaseSkippedEvidence;
  budget: CaseBudget;
}

interface BuildCaseBaseParams {
  signal: CaseSignal;
  reader: EvidenceReader;
  alerts: CaseAlert[];
  notes: string[];
  /** The evidence size budget; a value that is not a positive integer is ignored. */
  maxEvidenceChars?: number;
}

/** What `buildCase` takes, by the kind of case. */
export type BuildCaseParams =
  | (BuildCaseBaseParams & { kind: 'new_event' })
  | (BuildCaseBaseParams & { kind: 'join'; candidates: CaseCandidate[] })
  | (BuildCaseBaseParams & { kind: 'new_episode'; event: CaseEvent });
