/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { slugifyEpicKey } from './build_epic_phases';

export interface RelationshipEdge {
  readonly from: string;
  readonly to: string;
  readonly relation: string;
  readonly weight?: number;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface ProjectItemForRelationships {
  readonly projectItemId: string;
  readonly projectNumber: number;
  readonly orgLogin?: string;
  readonly ticketType?: string;
  readonly epicKey?: string;
  readonly parentIssue?: string;
  readonly contentRef?: {
    readonly type?: string;
    readonly repo?: string;
    readonly number?: number;
  };
}

export interface TeamForRelationships {
  readonly slug: string;
  readonly orgLogin?: string;
  readonly repositories: readonly string[];
}

export const buildIssueRef = (repo: string, number: number): string => `issue:${repo}#${number}`;

export const buildPullRequestRef = (repo: string, number: number): string =>
  `pr:${repo}#${number}`;

export const buildEpicRef = (projectNumber: number, epicKey: string): string =>
  `epic:${projectNumber}:${slugifyEpicKey(epicKey)}`;

export const buildProjectItemRef = (projectItemId: string): string =>
  `project_item:${projectItemId}`;

export const buildTeamRef = (teamSlug: string): string => `team:${teamSlug}`;

export const buildRepoRef = (fullName: string): string => `repo:${fullName}`;

const sanitizeForDocumentId = (value: string): string => value.replace(/[:#/]/g, '_');

export const buildRelationshipDocumentId = (
  from: string,
  relation: string,
  to: string
): string => `edge:${sanitizeForDocumentId(from)}:${relation}:${sanitizeForDocumentId(to)}`;

const isPullRequestContent = (contentRef?: ProjectItemForRelationships['contentRef']): boolean =>
  contentRef?.type === 'PullRequest';

const resolveContentEntityRef = (
  contentRef?: ProjectItemForRelationships['contentRef']
): string | undefined => {
  if (!contentRef?.repo || contentRef.number === undefined) {
    return undefined;
  }

  return isPullRequestContent(contentRef)
    ? buildPullRequestRef(contentRef.repo, contentRef.number)
    : buildIssueRef(contentRef.repo, contentRef.number);
};

export const buildRelationshipEdgesFromProjectItem = (
  item: ProjectItemForRelationships
): RelationshipEdge[] => {
  const edges: RelationshipEdge[] = [];
  const contentEntityRef = resolveContentEntityRef(item.contentRef);
  const epicKey = item.epicKey?.trim();
  const isEpic = item.ticketType === 'Epic';
  const baseMetadata = {
    project_number: item.projectNumber,
    scope: 'project',
    ...(item.orgLogin ? { org: item.orgLogin } : {}),
  } as const;

  if (contentEntityRef) {
    edges.push({
      from: buildProjectItemRef(item.projectItemId),
      to: contentEntityRef,
      relation: 'on_board',
      metadata: baseMetadata,
    });
  }

  if (isEpic && epicKey && contentEntityRef) {
    edges.push({
      from: buildEpicRef(item.projectNumber, epicKey),
      to: contentEntityRef,
      relation: 'tracked_as',
      metadata: {
        ...baseMetadata,
        epic_key: epicKey,
      },
    });
  }

  if (!isEpic && epicKey && contentEntityRef) {
    const epicRef = buildEpicRef(item.projectNumber, epicKey);
    edges.push({
      from: contentEntityRef,
      to: epicRef,
      relation: 'child_of',
      metadata: {
        ...baseMetadata,
        epic_key: epicKey,
      },
    });
    edges.push({
      from: epicRef,
      to: contentEntityRef,
      relation: 'parent_of',
      metadata: {
        ...baseMetadata,
        epic_key: epicKey,
      },
    });
  }

  const parentIssue = item.parentIssue?.trim();
  if (parentIssue && contentEntityRef && !isPullRequestContent(item.contentRef)) {
    edges.push({
      from: contentEntityRef,
      to: `parent_issue:${parentIssue}`,
      relation: 'parent_issue',
      metadata: baseMetadata,
    });
  }

  return edges;
};

export const buildRelationshipEdgesFromProjectItems = (
  items: readonly ProjectItemForRelationships[]
): RelationshipEdge[] => items.flatMap((item) => buildRelationshipEdgesFromProjectItem(item));

export const buildTeamRepositoryEdges = (team: TeamForRelationships): RelationshipEdge[] =>
  team.repositories.map((repository) => ({
    from: buildTeamRef(team.slug),
    to: buildRepoRef(repository),
    relation: 'owns_repo',
    metadata: {
      scope: 'org_catalog',
      team_slug: team.slug,
      ...(team.orgLogin ? { org: team.orgLogin } : {}),
    },
  }));

export const dedupeRelationshipEdges = (edges: readonly RelationshipEdge[]): RelationshipEdge[] => {
  const seen = new Set<string>();
  const deduped: RelationshipEdge[] = [];

  for (const edge of edges) {
    const key = buildRelationshipDocumentId(edge.from, edge.relation, edge.to);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(edge);
  }

  return deduped;
};
