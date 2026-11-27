/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cutText } from '../../utils/string_utils';
import { JUDGE_CASE_SETTINGS } from './constants';
import type { ReadEvidenceResult } from './evidence_types';
import type {
  BuildCaseParams,
  CaseAlert,
  CaseCandidate,
  CaseCandidateSummary,
  CaseEvent,
  CaseEventSummary,
  CaseEvidence,
  CaseMember,
  CaseOmitted,
  CaseSignal,
  JudgeCase,
} from './judge_case_types';
import { countSkippedEvidence, trimToBudget } from './trim_to_budget';

const {
  max_candidates: MAX_CANDIDATES,
  members_per_event: MEMBERS_PER_EVENT,
  member_rows: MEMBER_ROWS,
  max_reasons: MAX_REASONS,
  max_alerts: MAX_ALERTS,
  max_notes: MAX_NOTES,
  text_max_length: TEXT_MAX_LENGTH,
} = JUDGE_CASE_SETTINGS;

/** A query to read, in the order of its evidence id. */
interface PlannedItem {
  id: string;
  title: string;
  query: string;
  earlierEpisode: boolean;
  /** Evidence of an event's member, not of the signal itself. */
  member: boolean;
}

/** An event as the case shows it, and what reading its members asks for. */
interface PlannedEvent {
  summary: CaseEventSummary;
  items: PlannedItem[];
  omittedMembers: number;
}

/** Cuts a free-text string the caller gave to the case's text limit. */
const cutFreeText = (text: string): string => cutText(text, TEXT_MAX_LENGTH).text;

/**
 * Plans the evidence of up to {@link MEMBERS_PER_EVENT} members of the event, numbering from
 * `firstNumber`. The signal's own series is skipped: its evidence is E1.
 */
const planEvent = (
  event: CaseEvent,
  signal: CaseSignal,
  firstNumber: number,
  earlierEpisode: boolean
): PlannedEvent => {
  const others = event.members.filter(
    ({ group_hash: groupHash }) => groupHash !== signal.group_hash
  );
  const kept = others.slice(0, MEMBERS_PER_EVENT);
  const items = kept.map(
    (member: CaseMember, index): PlannedItem => ({
      id: `E${firstNumber + index}`,
      title: cutFreeText(member.title),
      query: member.evidence_esql,
      earlierEpisode,
      member: true,
    })
  );
  const { members: _members, ...eventFields } = event;
  return {
    summary: {
      ...eventFields,
      title: cutFreeText(event.title),
      summary: cutFreeText(event.summary),
      members: kept.map(({ evidence_esql: _query, ...member }, index) => ({
        ...member,
        title: cutFreeText(member.title),
        evidence_id: items[index].id,
      })),
    },
    items,
    omittedMembers: others.length - kept.length,
  };
};

/** A member's evidence is context for a join, so it keeps fewer rows than the signal's own. */
const limitMemberRows = (result: ReadEvidenceResult): ReadEvidenceResult =>
  result.result === 'found' && result.rows.length > MEMBER_ROWS
    ? { ...result, rows: result.rows.slice(0, MEMBER_ROWS), rows_truncated: true }
    : result;

const toEvidence = (item: PlannedItem, result: ReadEvidenceResult): CaseEvidence => ({
  id: item.id,
  ...(item.earlierEpisode ? { earlier_episode: true } : {}),
  title: item.title,
  query: item.query,
  ...(item.member ? limitMemberRows(result) : result),
});

const keepAlerts = (alerts: CaseAlert[]): CaseAlert[] =>
  alerts.slice(0, MAX_ALERTS).map((alert) => ({ ...alert, title: cutFreeText(alert.title) }));

/**
 * Builds the case the judge reads for one signal: its own evidence as E1, the evidence of up to
 * two members of each candidate event (or of the closed event) as E2 to En, the alerts and the
 * notes, within a size budget. All evidence is read in the same tick, in id order, so a query cap
 * that falls inside the case skips its last items and never E1 before a member. A query already
 * read in the run is not run again: that is the reader's memo. It does not throw for a failed,
 * empty or skipped item; they stay in the case with their status.
 */
export const buildCase = async (params: BuildCaseParams): Promise<JudgeCase> => {
  const { kind, signal, reader, alerts, notes, maxEvidenceChars } = params;

  const planned: PlannedItem[] = [
    {
      id: 'E1',
      title: signal.data.title,
      query: signal.data.evidence_esql,
      earlierEpisode: false,
      member: false,
    },
  ];
  const omitted: CaseOmitted = { candidates: 0, members: 0, reasons: 0, alerts: 0, notes: 0 };
  let candidates: CaseCandidateSummary[] = [];
  let closedEvent: CaseEventSummary | undefined;

  if (params.kind === 'join') {
    const kept: CaseCandidate[] = params.candidates.slice(0, MAX_CANDIDATES);
    omitted.candidates = params.candidates.length - kept.length;
    candidates = kept.map((candidate) => {
      const plan = planEvent(candidate.event, signal, planned.length + 1, false);
      planned.push(...plan.items);
      omitted.members += plan.omittedMembers;
      omitted.reasons += Math.max(0, candidate.reasons.length - MAX_REASONS);
      return {
        event: plan.summary,
        relation: candidate.relation,
        score: candidate.score,
        reasons: candidate.reasons.slice(0, MAX_REASONS).map(cutFreeText),
      };
    });
  }
  if (params.kind === 'new_episode') {
    const plan = planEvent(params.event, signal, planned.length + 1, true);
    planned.push(...plan.items);
    omitted.members += plan.omittedMembers;
    closedEvent = plan.summary;
  }
  omitted.alerts = Math.max(0, alerts.length - MAX_ALERTS);
  omitted.notes = Math.max(0, notes.length - MAX_NOTES);

  const results = await Promise.all(planned.map(({ query }) => reader.read(query)));
  const evidence = planned.map((item, index) => toEvidence(item, results[index]));

  const { evidence: fitted, budget } = trimToBudget({ evidence, maxEvidenceChars });

  return {
    kind,
    signal,
    candidates,
    ...(closedEvent ? { closed_event: closedEvent } : {}),
    alerts: keepAlerts(alerts),
    notes: notes.slice(0, MAX_NOTES).map(cutFreeText),
    evidence: fitted,
    omitted,
    skipped_evidence: countSkippedEvidence(fitted),
    budget,
  };
};
