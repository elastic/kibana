/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { BuildEpicPhaseInput } from './build_epic_phases';

const IN_PROGRESS_STATUSES = new Set(['In Progress', 'Review', 'Blocked']);
const DONE_STATUSES = new Set(['Done', 'Done - Verified in Serverless']);

export interface TicketChildItem {
  readonly repo: string;
  readonly number: number;
  readonly title: string;
  readonly state?: string;
  readonly projectStatus?: string;
}

export interface EpicPullRequestItem {
  readonly repo: string;
  readonly number: number;
}

export const formatIssueRef = (number: number): string => `#${number}`;

export const formatPullRequestRef = (number: number): string => `#PR-${number}`;

export const resolveTicketStatus = (item: TicketChildItem): string => {
  const projectStatus = item.projectStatus ?? '';
  if (item.state === 'CLOSED' || DONE_STATUSES.has(projectStatus)) {
    return 'closed';
  }
  if (IN_PROGRESS_STATUSES.has(projectStatus)) {
    return 'in-progress';
  }
  return 'open';
};

export const buildPullRequestRefsByRepo = (
  pullRequests: readonly EpicPullRequestItem[]
): ReadonlyMap<string, readonly string[]> => {
  const prsByRepo = new Map<string, string[]>();

  for (const pullRequest of pullRequests) {
    const existing = prsByRepo.get(pullRequest.repo) ?? [];
    existing.push(formatPullRequestRef(pullRequest.number));
    prsByRepo.set(pullRequest.repo, existing);
  }

  return prsByRepo;
};

export const buildTicketsByRepo = (
  tickets: readonly TicketChildItem[],
  pullRequests: readonly EpicPullRequestItem[]
): BuildEpicPhaseInput['ticketsByRepo'] => {
  const prsByRepo = buildPullRequestRefsByRepo(pullRequests);
  const ticketsByRepo = new Map<
    string,
    Array<{
      issueRef: string;
      number?: number;
      title: string;
      status: string;
      prRefs: readonly string[];
    }>
  >();

  for (const ticket of tickets) {
    const repoTickets = ticketsByRepo.get(ticket.repo) ?? [];
    repoTickets.push({
      issueRef: formatIssueRef(ticket.number),
      number: ticket.number,
      title: ticket.title,
      status: resolveTicketStatus(ticket),
      prRefs: prsByRepo.get(ticket.repo) ?? [],
    });
    ticketsByRepo.set(ticket.repo, repoTickets);
  }

  return [...ticketsByRepo.entries()]
    .sort(([leftRepo], [rightRepo]) => leftRepo.localeCompare(rightRepo))
    .map(([repo, items]) => ({
      repo,
      items: items.sort((left, right) => (left.number ?? 0) - (right.number ?? 0)),
    }));
};

export const extractEpicLinks = ({
  fields,
  projectUrl,
}: {
  fields: Record<string, string>;
  projectUrl?: string;
}): { project_url?: string; prd_url?: string; arch_url?: string } => ({
  ...(projectUrl ? { project_url: projectUrl } : {}),
  ...(fields['PRD URL'] ? { prd_url: fields['PRD URL'] } : {}),
  ...(fields['PRD Link'] && !fields['PRD URL'] ? { prd_url: fields['PRD Link'] } : {}),
  ...(fields['Architecture URL'] ? { arch_url: fields['Architecture URL'] } : {}),
  ...(fields['Arch URL'] && !fields['Architecture URL'] ? { arch_url: fields['Arch URL'] } : {}),
  ...(fields['RFC URL'] && !fields['Architecture URL'] && !fields['Arch URL']
    ? { arch_url: fields['RFC URL'] }
    : {}),
});

export const resolveEpicTitle = ({
  epicKey,
  anchorTitle,
  fields,
}: {
  epicKey: string;
  anchorTitle?: string;
  fields: Record<string, string>;
}): string => anchorTitle?.trim() || fields.Title?.trim() || fields.Epic?.trim() || epicKey;

export const collectEpicGithubAssignees = ({
  anchorAssignees,
  childIssues,
}: {
  anchorAssignees?: readonly string[];
  childIssues?: ReadonlyArray<{ assignees?: readonly string[] }>;
}): readonly string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const add = (logins: readonly string[] | undefined): void => {
    for (const login of logins ?? []) {
      const trimmed = login.trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      ordered.push(trimmed);
    }
  };

  add(anchorAssignees);
  for (const issue of childIssues ?? []) {
    add(issue.assignees);
  }

  return ordered;
};

export const resolveEpicOwner = ({
  fields,
  githubAssignees,
}: {
  fields: Record<string, string>;
  githubAssignees?: readonly string[];
}): string | undefined => {
  const fromProjectFields =
    fields.Owner?.trim() || fields.Assignee?.trim() || fields['Product Owner']?.trim();
  if (fromProjectFields) {
    return fromProjectFields;
  }

  return githubAssignees?.find((login) => login.trim().length > 0)?.trim();
};
