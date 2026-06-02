/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { GitHubIssueLike, PhaseGateStatus, PullRequestRollup, TicketRollup } from './types';

const IN_PROGRESS_STATUSES = new Set(['In Progress', 'Review', 'Blocked']);
const DONE_STATUSES = new Set(['Done', 'Done - Verified in Serverless']);

export const isAiGeneratedLabel = (labels: readonly string[] | undefined): boolean =>
  labels?.some((label) => label.toLowerCase() === 'ai-generated') ?? false;

export const isEngValidated = ({
  labels,
  assignees,
  state,
}: {
  labels?: readonly string[];
  assignees?: readonly string[];
  state?: string;
}): boolean => {
  if (labels?.some((label) => label.toLowerCase() === 'eng-validated')) {
    return true;
  }
  if (labels?.includes('triage_needed')) {
    return false;
  }
  return Boolean(assignees?.length) && state === 'OPEN';
};

export const rollupTickets = (issues: readonly GitHubIssueLike[]): TicketRollup => {
  let aiGen = 0;
  let engValidated = 0;
  let done = 0;
  let open = 0;
  let inProgress = 0;

  for (const issue of issues) {
    const ai = isAiGeneratedLabel(issue.labels);
    if (ai) {
      aiGen += 1;
    }
    if (
      isEngValidated({
        labels: issue.labels,
        assignees: issue.assignees,
        state: issue.state,
      })
    ) {
      engValidated += 1;
    }

    const status = issue.projectStatus ?? '';
    const isDone =
      issue.state === 'CLOSED' || DONE_STATUSES.has(status) || DONE_STATUSES.has(issue.state ?? '');
    const isInProgress =
      IN_PROGRESS_STATUSES.has(status) ||
      (issue.state === 'OPEN' && (issue.linkedPrOpenCount ?? 0) > 0);

    if (isDone) {
      done += 1;
    } else if (isInProgress) {
      inProgress += 1;
    } else {
      open += 1;
    }
  }

  const total = issues.length;
  if (engValidated === 0 && done > 0) {
    engValidated = done;
  }

  return { total, aiGen, engValidated, done, open, inProgress };
};

export const rollupPullRequests = (
  prs: ReadonlyArray<{ merged?: boolean; state?: string; draft?: boolean }>
): PullRequestRollup => {
  let merged = 0;
  let open = 0;
  let closedUnmerged = 0;

  for (const pr of prs) {
    if (pr.merged) {
      merged += 1;
    } else if (pr.state === 'OPEN' && !pr.draft) {
      open += 1;
    } else if (pr.state === 'CLOSED') {
      closedUnmerged += 1;
    }
  }

  return { total: prs.length, merged, open, closedUnmerged };
};

export const computeP4Gate = (tickets: TicketRollup): PhaseGateStatus => {
  if (tickets.total === 0) {
    return 'fail';
  }
  const donePct = Math.round((tickets.done / tickets.total) * 100);
  const validatedPct =
    tickets.aiGen > 0 ? Math.round((tickets.engValidated / tickets.aiGen) * 100) : 100;
  if (donePct === 100) {
    return 'pass';
  }
  if (validatedPct < 100 || donePct < 100) {
    return 'warn';
  }
  return 'fail';
};

export const computeP5Gate = (
  tickets: TicketRollup,
  prs: PullRequestRollup
): PhaseGateStatus => {
  if (prs.total === 0 && tickets.total === 0) {
    return 'ns';
  }
  if (tickets.total > 0 && prs.total === 0) {
    return 'fail';
  }
  const mergedPct = prs.total > 0 ? Math.round((prs.merged / prs.total) * 100) : 0;
  const donePct = tickets.total > 0 ? Math.round((tickets.done / tickets.total) * 100) : 0;
  if (mergedPct === 100 && donePct === 100 && prs.total > 0) {
    return 'pass';
  }
  return 'warn';
};

export const computeDeliveryCoveragePct = (
  tickets: TicketRollup,
  prs: PullRequestRollup
): number => {
  const donePct = tickets.total > 0 ? Math.round((tickets.done / tickets.total) * 100) : 0;
  const mergedPct = prs.total > 0 ? Math.round((prs.merged / prs.total) * 100) : 0;
  return Math.round(donePct * 0.6 + mergedPct * 0.4);
};

export const computeCoverageStatus = ({
  issueState,
  projectStatus,
  prSummary,
}: {
  issueState?: string;
  projectStatus?: string;
  prSummary?: { total?: number; merged?: number; open?: number };
}): string => {
  if (projectStatus === 'Blocked') {
    return 'blocked';
  }
  if (DONE_STATUSES.has(projectStatus ?? '') || issueState === 'CLOSED') {
    return (prSummary?.merged ?? 0) > 0 ? 'delivered' : 'verified';
  }
  if ((prSummary?.merged ?? 0) > 0 && issueState === 'OPEN') {
    return 'merged';
  }
  if ((prSummary?.open ?? 0) > 0 || IN_PROGRESS_STATUSES.has(projectStatus ?? '')) {
    return 'in_progress';
  }
  if ((prSummary?.total ?? 0) === 0 && issueState === 'OPEN') {
    return 'not_started';
  }
  return 'planned';
};

export const buildPhasePayload = (
  gate: PhaseGateStatus,
  body: Record<string, unknown>
): Record<string, unknown> => ({
  gate,
  ...body,
});

export const computeGateRollup = (
  gates: readonly PhaseGateStatus[]
): { applicable: number; passed: number; pct: number } => {
  const applicable = gates.filter((gate) => gate !== 'ns');
  const passed = applicable.filter((gate) => gate === 'pass');
  const pct =
    applicable.length > 0 ? Math.round((passed.length / applicable.length) * 100) : 0;
  return { applicable: applicable.length, passed: passed.length, pct };
};
