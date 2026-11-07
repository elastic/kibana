/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '@kbn/agentic-investigations-common';

export const GROUP_BY_PARAM = 'group';

/** `type` is today's queue; the others regroup the same cards. */
export type QueueGroupBy = 'type' | 'case' | 'none';

export const parseGroupBy = (value: string | null | undefined): QueueGroupBy =>
  value === 'case' || value === 'none' ? value : 'type';

export interface QueueRow {
  investigation: Investigation;
  /** The card's proposal is still waiting on a decision. */
  isPending: boolean;
}

export interface QueueGroup {
  /** A case id, or undefined for the No case group and the Case unavailable group. */
  caseId?: string;
  /** `unavailable` collects cards whose case was deleted or can't be seen. */
  kind: 'case' | 'noCase' | 'unavailable';
  rows: QueueRow[];
  investigationCount: number;
  pendingCount: number;
}

const newestFirst = (a: QueueRow, b: QueueRow) =>
  (b.investigation.proposalCreatedAt ?? b.investigation.createdAt).localeCompare(
    a.investigation.proposalCreatedAt ?? a.investigation.createdAt
  );

/** Cards are proposals, so several can share an investigation; count investigations once. */
const countInvestigations = (rows: QueueRow[]) =>
  new Set(rows.map(({ investigation }) => investigation.conversationId ?? investigation.id)).size;

const toGroup = (kind: QueueGroup['kind'], rows: QueueRow[], caseId?: string): QueueGroup => ({
  caseId,
  kind,
  rows: rows.toSorted(newestFirst),
  investigationCount: countInvestigations(rows),
  pendingCount: rows.filter(({ isPending }) => isPending).length,
});

/** The None grouping: every card in one list, newest first. */
export const groupAsOneList = (rows: QueueRow[]): QueueGroup => toGroup('noCase', rows);

/**
 * The Case grouping: one group per case (most recent activity first), then the cards whose case
 * is unavailable, then the cards with no case.
 */
export const groupByCase = (
  rows: QueueRow[],
  resolveCaseId: (investigation: Investigation) => string | undefined,
  /** True only once the case is known to be deleted or hidden; a case still loading is false. */
  isCaseUnavailable: (caseId: string) => boolean
): QueueGroup[] => {
  const byCase = new Map<string, QueueRow[]>();
  const unavailable: QueueRow[] = [];
  const noCase: QueueRow[] = [];

  for (const row of rows) {
    const caseId = resolveCaseId(row.investigation);
    if (caseId == null) {
      noCase.push(row);
    } else if (isCaseUnavailable(caseId)) {
      unavailable.push(row);
    } else {
      byCase.set(caseId, [...(byCase.get(caseId) ?? []), row]);
    }
  }

  const caseGroups = [...byCase.entries()]
    .map(([caseId, caseRows]) => toGroup('case', caseRows, caseId))
    .toSorted((a, b) => newestFirst(a.rows[0], b.rows[0]));

  return [
    ...caseGroups,
    ...(unavailable.length > 0 ? [toGroup('unavailable', unavailable)] : []),
    ...(noCase.length > 0 ? [toGroup('noCase', noCase)] : []),
  ];
};
