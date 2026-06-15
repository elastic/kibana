/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { TeamDimensionRecord } from '@kbn/sdlc-data-layer';
import {
  ALL_SDLC_DATA_INDICES,
  LEGACY_GITHUB_SYNC_STATE_ALIAS,
  SDLC_INDEX_DEFINITIONS,
  SDLC_INDEX_NAMES,
  attributeTeam,
  buildEpicPhaseDocument,
  buildEpicPhaseDocumentId,
  buildWorkflowsExecutiveDemoDocuments,
  WORKFLOWS_EXECUTIVE_DEMO_SEED_TAG,
  buildRelationshipDocumentId,
  buildRelationshipEdgesFromProjectItems,
  buildTeamRepositoryEdges,
  buildTicketsByRepo,
  computeCoverageStatus,
  dedupeRelationshipEdges,
  extractEpicLinks,
  collectEpicGithubAssignees,
  resolveEpicOwner,
  resolveEpicTitle,
  fetchGitHubGraphQl,
  fieldValuesToMap,
  getTeamDimensionDocumentId,
  getTeamDimensionRecords,
  ORG_PROJECTS_LIST_QUERY,
  ORG_REPOS_QUERY,
  ORG_TEAM_MEMBERS_QUERY,
  ORG_TEAM_REPOS_QUERY,
  ORG_TEAMS_LIST_QUERY,
  PROJECTS_QUERY,
  resolveGithubProjectsToSync,
  resolveRoadmapForEpic,
  resolveRoadmapFromInitiative,
  slugifyEpicKey,
  teamDimensionToBulkDocuments,
  type GithubProjectSummary,
  type GithubProjectSyncFilters,
  type ProjectItemForRelationships,
} from '@kbn/sdlc-data-layer';
import type { ElasticsearchClient } from '@kbn/core/server';

const isIndexMissingError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const meta = (error as { meta?: { body?: { error?: { type?: string } } } }).meta;
  return meta?.body?.error?.type === 'index_not_found_exception';
};

const ensureIndices = async (
  esClient: ElasticsearchClient
): Promise<{ created: number; failed: string[] }> => {
  let created = 0;
  const failed: string[] = [];

  for (const indexName of ALL_SDLC_DATA_INDICES) {
    try {
      const exists = await esClient.indices.exists({ index: indexName });
      if (exists) {
        continue;
      }
      const definition = SDLC_INDEX_DEFINITIONS[indexName];
      await esClient.indices.create({
        index: definition.index,
        settings: definition.settings,
        mappings: definition.mappings,
      });
      created += 1;
    } catch (error) {
      failed.push(
        `${indexName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return { created, failed };
};

const ensureLegacySyncStateAlias = async (esClient: ElasticsearchClient): Promise<void> => {
  const targetIndex = SDLC_INDEX_NAMES.GITHUB_SYNC_STATE;
  const legacyAlias = LEGACY_GITHUB_SYNC_STATE_ALIAS;

  const targetExists = await esClient.indices.exists({ index: targetIndex });
  if (!targetExists) {
    return;
  }

  const aliasExists = await esClient.indices.existsAlias({ name: legacyAlias });
  if (aliasExists) {
    return;
  }

  await esClient.indices.putAlias({
    index: targetIndex,
    name: legacyAlias,
  });
};

export const setupSdlcIndices = async (esClient: ElasticsearchClient) => {
  const { created, failed } = await ensureIndices(esClient);
  try {
    await ensureLegacySyncStateAlias(esClient);
  } catch (error) {
    failed.push(
      `${LEGACY_GITHUB_SYNC_STATE_ALIAS}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return { processed: ALL_SDLC_DATA_INDICES.length, created, failed };
};

export const seedSdlcReferenceData = async (esClient: ElasticsearchClient) => {
  const documents = teamDimensionToBulkDocuments();
  const keepIds = new Set(documents.map(({ id }) => id));

  let staleDeleteOperations: Array<Record<string, unknown>> = [];
  try {
    const existing = await esClient.search({
      index: SDLC_INDEX_NAMES.SDLC_TEAM_DIMENSION,
      size: 100,
      _source: false,
    });
    staleDeleteOperations = existing.hits.hits.flatMap((hit) =>
      hit._id && !keepIds.has(hit._id)
        ? [{ delete: { _index: SDLC_INDEX_NAMES.SDLC_TEAM_DIMENSION, _id: hit._id } }]
        : []
    );
  } catch (error) {
    if (!isIndexMissingError(error)) {
      throw error;
    }
  }

  const indexOperations = documents.flatMap(({ id, doc }: { id: string; doc: TeamDimensionRecord }) => [
    { index: { _index: SDLC_INDEX_NAMES.SDLC_TEAM_DIMENSION, _id: id } },
    doc,
  ]);
  const operations = [...staleDeleteOperations, ...indexOperations];
  if (operations.length) {
    await esClient.bulk({ refresh: 'wait_for', operations });
  }

  const teamCount = getTeamDimensionRecords().length;
  return { processed: teamCount, updated: teamCount };
};

export const seedSdlcWorkflowsExecutiveDemo = async (esClient: ElasticsearchClient) => {
  const documents = buildWorkflowsExecutiveDemoDocuments();

  try {
    await esClient.deleteByQuery({
      index: SDLC_INDEX_NAMES.SDLC_EPIC_PHASES,
      conflicts: 'proceed',
      query: {
        term: { 'metadata.seed': WORKFLOWS_EXECUTIVE_DEMO_SEED_TAG },
      },
    });
  } catch (error) {
    if (!isIndexMissingError(error)) {
      throw error;
    }
  }

  const operations = documents.flatMap(({ id, doc }) => [
    { index: { _index: SDLC_INDEX_NAMES.SDLC_EPIC_PHASES, _id: id } },
    doc,
  ]);

  if (operations.length) {
    await esClient.bulk({ refresh: 'wait_for', operations });
  }

  return { processed: documents.length, updated: documents.length };
};

interface ProjectSyncResult {
  processed: number;
  updated: number;
  projectNumbers: number[];
  skipped: number;
  skippedProjectNumbers: number[];
  resumedProjectNumbers: number[];
}

interface ProjectSyncStateDocument {
  '@timestamp': string;
  entity_type: 'project';
  org: { login: string };
  project: { number: number };
  cursor?: string;
  last_run_at: string;
  last_run_status: 'in_progress' | 'completed' | 'failed';
  stats?: {
    items_processed?: number;
    project_meta_written?: boolean;
  };
  sync: { run_id: string; source: string };
}

const buildProjectSyncStateId = (orgLogin: string, projectNumber: number): string =>
  `sync:project:${orgLogin}:${projectNumber}`;

const readProjectSyncState = async ({
  esClient,
  orgLogin,
  projectNumber,
}: {
  esClient: ElasticsearchClient;
  orgLogin: string;
  projectNumber: number;
}): Promise<ProjectSyncStateDocument | undefined> => {
  try {
    const response = await esClient.get<ProjectSyncStateDocument>({
      index: SDLC_INDEX_NAMES.GITHUB_SYNC_STATE,
      id: buildProjectSyncStateId(orgLogin, projectNumber),
    });
    return response._source;
  } catch {
    return undefined;
  }
};

const writeProjectSyncState = async ({
  esClient,
  orgLogin,
  projectNumber,
  runId,
  status,
  cursor,
  stats,
}: {
  esClient: ElasticsearchClient;
  orgLogin: string;
  projectNumber: number;
  runId: string;
  status: ProjectSyncStateDocument['last_run_status'];
  cursor?: string;
  stats?: ProjectSyncStateDocument['stats'];
}): Promise<void> => {
  const now = new Date().toISOString();
  const document: ProjectSyncStateDocument = {
    '@timestamp': now,
    entity_type: 'project',
    org: { login: orgLogin },
    project: { number: projectNumber },
    last_run_at: now,
    last_run_status: status,
    sync: { run_id: runId, source: 'workflow' },
    ...(cursor ? { cursor } : {}),
    ...(stats ? { stats } : {}),
  };

  await esClient.index({
    index: SDLC_INDEX_NAMES.GITHUB_SYNC_STATE,
    id: buildProjectSyncStateId(orgLogin, projectNumber),
    document,
    refresh: false,
  });
};

const listCompletedProjectNumbers = async ({
  esClient,
  orgLogin,
}: {
  esClient: ElasticsearchClient;
  orgLogin: string;
}): Promise<Set<number>> => {
  const response = await esClient.search<ProjectSyncStateDocument>({
    index: SDLC_INDEX_NAMES.GITHUB_SYNC_STATE,
    size: 1000,
    query: {
      bool: {
        must: [
          { term: { entity_type: 'project' } },
          { term: { 'org.login': orgLogin } },
          { term: { last_run_status: 'completed' } },
        ],
      },
    },
    _source: ['project.number'],
  });

  const completed = new Set<number>();
  for (const hit of response.hits.hits) {
    const projectNumber = hit._source?.project?.number;
    if (typeof projectNumber === 'number') {
      completed.add(projectNumber);
    }
  }

  return completed;
};

const filterProjectNumbersToSync = async ({
  esClient,
  orgLogin,
  projectNumbers,
  skipSyncedProjects,
  forceResyncProjectNumbers = [],
}: {
  esClient: ElasticsearchClient;
  orgLogin: string;
  projectNumbers: number[];
  skipSyncedProjects: boolean;
  forceResyncProjectNumbers?: number[];
}): Promise<{ projectNumbers: number[]; skippedProjectNumbers: number[] }> => {
  if (!skipSyncedProjects) {
    return { projectNumbers, skippedProjectNumbers: [] };
  }

  const forceResync = new Set(forceResyncProjectNumbers);
  const completedProjectNumbers = await listCompletedProjectNumbers({ esClient, orgLogin });
  const indexedProjectNumbers = new Set(await listSyncedProjectNumbers(esClient));
  const skippedProjectNumbers: number[] = [];
  const pendingProjectNumbers: number[] = [];

  for (const projectNumber of projectNumbers) {
    if (forceResync.has(projectNumber)) {
      pendingProjectNumbers.push(projectNumber);
      continue;
    }

    const existingSyncState = await readProjectSyncState({ esClient, orgLogin, projectNumber });
    const isCompleted =
      completedProjectNumbers.has(projectNumber) ||
      (existingSyncState?.last_run_status !== 'in_progress' &&
        indexedProjectNumbers.has(projectNumber));

    if (isCompleted) {
      skippedProjectNumbers.push(projectNumber);
      continue;
    }

    pendingProjectNumbers.push(projectNumber);
  }

  return { projectNumbers: pendingProjectNumbers, skippedProjectNumbers };
};

const listOrgGithubProjects = async ({
  orgLogin,
  githubToken,
}: {
  orgLogin: string;
  githubToken: string;
}): Promise<GithubProjectSummary[]> => {
  const projects: GithubProjectSummary[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await fetchGitHubGraphQl<{
      organization: {
        projectsV2: {
          pageInfo: { hasNextPage: boolean; endCursor?: string };
          nodes: Array<{ number: number; title: string; url?: string }>;
        };
      };
    }>({
      token: githubToken,
      query: ORG_PROJECTS_LIST_QUERY,
      variables: { org: orgLogin, cursor },
    });

    for (const project of data.organization.projectsV2.nodes) {
      projects.push({
        number: project.number,
        title: project.title,
        url: project.url,
      });
    }

    hasNextPage = data.organization.projectsV2.pageInfo.hasNextPage;
    cursor = data.organization.projectsV2.pageInfo.endCursor;
  }

  return projects;
};

const resolveProjectNumbersToSync = async ({
  orgLogin,
  githubToken,
  projectNumbers,
  filters,
}: {
  orgLogin: string;
  githubToken: string;
  projectNumbers: number[];
  filters?: GithubProjectSyncFilters;
}): Promise<number[]> => {
  const hasTitleFilters =
    (filters?.titleIncludes?.some((pattern) => pattern.trim().length > 0) ?? false) ||
    (filters?.titleExcludes?.some((pattern) => pattern.trim().length > 0) ?? false);
  const hasExcludeNumbers = (filters?.excludeProjectNumbers?.length ?? 0) > 0;
  const hasIncludeNumbers = (filters?.includeProjectNumbers?.length ?? 0) > 0;
  const needsDiscovery =
    projectNumbers.length === 0 || hasTitleFilters || hasExcludeNumbers || hasIncludeNumbers;

  const discoveredProjects = needsDiscovery
    ? await listOrgGithubProjects({ orgLogin, githubToken })
    : [];

  return resolveGithubProjectsToSync({
    explicitProjectNumbers: projectNumbers,
    discoveredProjects,
    filters,
  }).map((project) => project.number);
};

export interface ListGithubProjectsToSyncResult {
  projectNumbers: number[];
  skippedProjectNumbers: number[];
}

export const listGithubProjectsToSync = async ({
  esClient,
  orgLogin,
  projectNumbers,
  filters,
  githubToken,
  skipSyncedProjects = false,
  forceResyncProjectNumbers = [],
}: {
  esClient: ElasticsearchClient;
  orgLogin: string;
  projectNumbers: number[];
  filters?: GithubProjectSyncFilters;
  githubToken: string;
  skipSyncedProjects?: boolean;
  forceResyncProjectNumbers?: number[];
}): Promise<ListGithubProjectsToSyncResult> => {
  const numbersToSync = await resolveProjectNumbersToSync({
    orgLogin,
    githubToken,
    projectNumbers,
    filters,
  });

  return filterProjectNumbersToSync({
    esClient,
    orgLogin,
    projectNumbers: numbersToSync,
    skipSyncedProjects,
    forceResyncProjectNumbers,
  });
};

export const syncGithubProjects = async ({
  esClient,
  orgLogin,
  projectNumbers,
  filters,
  githubToken,
  runId,
  skipSyncedProjects = false,
  resumePartialSync = true,
  forceResyncProjectNumbers = [],
}: {
  esClient: ElasticsearchClient;
  orgLogin: string;
  projectNumbers: number[];
  filters?: GithubProjectSyncFilters;
  githubToken: string;
  runId: string;
  skipSyncedProjects?: boolean;
  resumePartialSync?: boolean;
  forceResyncProjectNumbers?: number[];
}): Promise<ProjectSyncResult> => {
  const forceResync = new Set(forceResyncProjectNumbers);
  const numbersToSync = await resolveProjectNumbersToSync({
    orgLogin,
    githubToken,
    projectNumbers,
    filters,
  });

  const { projectNumbers: pendingProjectNumbers, skippedProjectNumbers } =
    await filterProjectNumbersToSync({
      esClient,
      orgLogin,
      projectNumbers: numbersToSync,
      skipSyncedProjects,
      forceResyncProjectNumbers,
    });

  const resumedProjectNumbers: number[] = [];
  let processed = 0;
  let updated = 0;
  const syncedProjectNumbers: number[] = [];

  for (const projectNumber of pendingProjectNumbers) {
    const existingSyncState = await readProjectSyncState({ esClient, orgLogin, projectNumber });
    const shouldResume =
      resumePartialSync &&
      !forceResync.has(projectNumber) &&
      existingSyncState?.last_run_status === 'in_progress' &&
      Boolean(existingSyncState.cursor);

    let cursor: string | undefined = shouldResume ? existingSyncState?.cursor : undefined;
    let hasNextPage = true;
    let projectMetaWritten = shouldResume
      ? existingSyncState?.stats?.project_meta_written ?? false
      : false;

    if (shouldResume) {
      resumedProjectNumbers.push(projectNumber);
    }

    let projectItemsProcessed = shouldResume
      ? existingSyncState?.stats?.items_processed ?? 0
      : 0;
    let projectMissing = false;

    await writeProjectSyncState({
      esClient,
      orgLogin,
      projectNumber,
      runId,
      status: 'in_progress',
      cursor,
      stats: {
        items_processed: projectItemsProcessed,
        project_meta_written: projectMetaWritten,
      },
    });

    while (hasNextPage) {
      const data = await fetchGitHubGraphQl<{
        organization: {
          projectV2: {
            id: string;
            title: string;
            url: string;
            number: number;
            fields: { nodes: Array<Record<string, unknown>> };
            views: { nodes: Array<{ id: string; name: string; number: number; filter?: string }> };
            items: {
              pageInfo: { hasNextPage: boolean; endCursor?: string };
              nodes: Array<Record<string, unknown>>;
            };
          } | null;
        };
      }>({
        token: githubToken,
        query: PROJECTS_QUERY,
        variables: { org: orgLogin, projectNumber, cursor },
      });

      const project = data.organization.projectV2;
      if (!project) {
        projectMissing = true;
        break;
      }

      if (!projectMetaWritten) {
        await esClient.index({
          index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECTS,
          id: `project:${project.number}`,
          document: {
            '@timestamp': new Date().toISOString(),
            sync: { run_id: runId, source: 'workflow' },
            project: {
              id: project.id,
              number: project.number,
              title: project.title,
              url: project.url,
            },
            fields: project.fields.nodes,
          },
          refresh: false,
        });

        for (const view of project.views.nodes) {
          await esClient.index({
            index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_VIEWS,
            id: `project:${project.number}:view:${view.number}`,
            document: {
              '@timestamp': new Date().toISOString(),
              sync: { run_id: runId, source: 'workflow' },
              project: { id: project.id, number: project.number },
              view,
            },
            refresh: false,
          });
          updated += 1;
        }
        projectMetaWritten = true;
      }

      for (const item of project.items.nodes) {
        const fieldMap = fieldValuesToMap(
          ((item.fieldValues as { nodes?: Array<Record<string, unknown>> })?.nodes ??
            []) as Array<Record<string, unknown>>
        );
        const content = item.content as
          | {
              id?: string;
              number?: number;
              title?: string;
              state?: string;
              url?: string;
              merged?: boolean;
              repository?: { nameWithOwner?: string };
              labels?: { nodes?: Array<{ name: string }> };
              assignees?: { nodes?: Array<{ login: string }> };
            }
          | undefined;

        const labels = content?.labels?.nodes?.map((node) => node.name) ?? [];
        const teamAttribution = attributeTeam({
          projectTeam: fieldMap.Team,
          labels,
        });
        const roadmap = resolveRoadmapFromInitiative(fieldMap['Product Initiative']);

        const doc = {
          '@timestamp': new Date().toISOString(),
          sync: { run_id: runId, source: 'workflow' },
          entity: {
            type: 'project_item',
            id: item.id,
            url: content?.url,
            number: content?.number,
          },
          project: {
            id: project.id,
            number: project.number,
            title: project.title,
            url: project.url,
          },
          fields: Object.entries(fieldMap).map(([name, value]) => ({
            name,
            value,
            type: 'single_select_or_text',
          })),
          hierarchy: {
            ticket_type: fieldMap['Ticket Type'],
            epic: fieldMap.Epic,
            parent_issue: fieldMap['Parent issue'],
          },
          roadmap: {
            id: roadmap?.id,
            product: roadmap?.product,
            stage: fieldMap['Product Roadmap Stage'],
            initiative: fieldMap['Product Initiative'],
            release_milestone: fieldMap['Release Milestone'],
          },
          content_ref: content
            ? {
                type: content.merged === undefined ? 'Issue' : 'PullRequest',
                id: content.id,
                repo: content.repository?.nameWithOwner,
                number: content.number,
                url: content.url,
              }
            : undefined,
          repository: content?.repository?.nameWithOwner
            ? { full_name: content.repository.nameWithOwner }
            : undefined,
          labels,
          people: {
            assignees: content?.assignees?.nodes?.map((node) => node.login) ?? [],
          },
          github: {
            state: content?.state,
          },
          team_attribution: teamAttribution,
        };

        await esClient.index({
          index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_ITEMS,
          id: `item:${item.id}`,
          document: {
            ...doc,
            ...(content?.merged !== undefined
              ? {
                  pull_request: {
                    merged: content.merged,
                    title: content.title,
                  },
                }
              : {}),
          },
          refresh: false,
        });

        if (content?.number && content.repository?.nameWithOwner && content.merged === undefined) {
          await esClient.index({
            index: SDLC_INDEX_NAMES.GITHUB_INTEL_ISSUES,
            id: `issue:${content.repository.nameWithOwner}#${content.number}`,
            document: {
              ...doc,
              entity: {
                type: 'issue',
                id: content.id,
                number: content.number,
                url: content.url,
              },
              content: {
                title: content.title,
              },
              hierarchy: {
                epic: fieldMap.Epic,
                ticket_type: fieldMap['Ticket Type'],
              },
              delivery: {
                coverage_status: computeCoverageStatus({
                  issueState: content.state,
                  projectStatus: fieldMap.Status,
                }),
              },
            },
            refresh: false,
          });
        }

        if (content?.merged !== undefined && content.repository?.nameWithOwner) {
          await esClient.index({
            index: SDLC_INDEX_NAMES.GITHUB_INTEL_PULL_REQUESTS,
            id: `pr:${content.repository.nameWithOwner}#${content.number}`,
            document: {
              ...doc,
              entity: {
                type: 'pull_request',
                id: content.id,
                number: content.number,
                url: content.url,
              },
              hierarchy: {
                epic: fieldMap.Epic,
                ticket_type: fieldMap['Ticket Type'],
              },
              pull_request: {
                merged: content.merged,
                title: content.title,
              },
            },
            refresh: false,
          });
        }

        processed += 1;
        updated += 1;
        projectItemsProcessed += 1;
      }

      hasNextPage = project.items.pageInfo.hasNextPage;
      cursor = project.items.pageInfo.endCursor;

      await writeProjectSyncState({
        esClient,
        orgLogin,
        projectNumber,
        runId,
        status: 'in_progress',
        cursor: hasNextPage ? cursor : undefined,
        stats: {
          items_processed: projectItemsProcessed,
          project_meta_written: projectMetaWritten,
        },
      });
    }

    if (projectMissing) {
      await writeProjectSyncState({
        esClient,
        orgLogin,
        projectNumber,
        runId,
        status: 'failed',
        stats: {
          items_processed: projectItemsProcessed,
          project_meta_written: projectMetaWritten,
        },
      });
      continue;
    }

    await writeProjectSyncState({
      esClient,
      orgLogin,
      projectNumber,
      runId,
      status: 'completed',
      stats: {
        items_processed: projectItemsProcessed,
        project_meta_written: true,
      },
    });
    syncedProjectNumbers.push(projectNumber);
  }

  await esClient.indices.refresh({
    index: [
      SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECTS,
      SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_ITEMS,
      SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_VIEWS,
      SDLC_INDEX_NAMES.GITHUB_INTEL_ISSUES,
      SDLC_INDEX_NAMES.GITHUB_INTEL_PULL_REQUESTS,
      SDLC_INDEX_NAMES.GITHUB_SYNC_STATE,
    ],
  });

  return {
    processed,
    updated,
    projectNumbers: syncedProjectNumbers,
    skipped: skippedProjectNumbers.length,
    skippedProjectNumbers,
    resumedProjectNumbers,
  };
};

interface OrgTeamListNode {
  id: string;
  slug: string;
  name: string;
  description?: string;
  members: { totalCount: number };
}

const fetchTeamRepositories = async ({
  orgLogin,
  teamSlug,
  githubToken,
}: {
  orgLogin: string;
  teamSlug: string;
  githubToken: string;
}): Promise<string[]> => {
  const repositories: string[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await fetchGitHubGraphQl<{
      organization: {
        team: {
          repositories: {
            pageInfo: { hasNextPage: boolean; endCursor?: string };
            nodes: Array<{ nameWithOwner: string }>;
          };
        } | null;
      };
    }>({
      token: githubToken,
      query: ORG_TEAM_REPOS_QUERY,
      variables: { org: orgLogin, teamSlug, cursor },
    });

    const team = data.organization.team;
    if (!team) {
      break;
    }

    for (const repo of team.repositories.nodes) {
      repositories.push(repo.nameWithOwner);
    }

    hasNextPage = team.repositories.pageInfo.hasNextPage;
    cursor = team.repositories.pageInfo.endCursor;
  }

  return repositories;
};

const fetchTeamMemberLogins = async ({
  orgLogin,
  teamSlug,
  githubToken,
}: {
  orgLogin: string;
  teamSlug: string;
  githubToken: string;
}): Promise<string[]> => {
  const members: string[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await fetchGitHubGraphQl<{
      organization: {
        team: {
          members: {
            pageInfo: { hasNextPage: boolean; endCursor?: string };
            nodes: Array<{ login: string }>;
          };
        } | null;
      };
    }>({
      token: githubToken,
      query: ORG_TEAM_MEMBERS_QUERY,
      variables: { org: orgLogin, teamSlug, cursor },
    });

    const team = data.organization.team;
    if (!team) {
      break;
    }

    for (const member of team.members.nodes) {
      members.push(member.login);
    }

    hasNextPage = team.members.pageInfo.hasNextPage;
    cursor = team.members.pageInfo.endCursor;
  }

  return members;
};

export const syncGithubOrgCatalog = async ({
  esClient,
  orgLogin,
  githubToken,
  runId,
}: {
  esClient: ElasticsearchClient;
  orgLogin: string;
  githubToken: string;
  runId: string;
}) => {
  let processed = 0;
  let updated = 0;
  const failedTeams: string[] = [];

  let repoCursor: string | undefined;
  let reposHasNext = true;
  while (reposHasNext) {
    const data = await fetchGitHubGraphQl<{
      organization: {
        repositories: {
          pageInfo: { hasNextPage: boolean; endCursor?: string };
          nodes: Array<{
            id: string;
            name: string;
            nameWithOwner: string;
            url: string;
            description?: string;
            isPrivate: boolean;
            defaultBranchRef?: { name: string };
            updatedAt: string;
            createdAt: string;
          }>;
        };
      };
    }>({
      token: githubToken,
      query: ORG_REPOS_QUERY,
      variables: { org: orgLogin, cursor: repoCursor },
    });

    for (const repo of data.organization.repositories.nodes) {
      await esClient.index({
        index: SDLC_INDEX_NAMES.GITHUB_INTEL_REPOS,
        id: `repo:${repo.nameWithOwner}`,
        document: {
          '@timestamp': new Date().toISOString(),
          sync: { run_id: runId, source: 'workflow' },
          entity: { type: 'repository', id: repo.id, url: repo.url },
          repo: {
            name: repo.name,
            full_name: repo.nameWithOwner,
            description: repo.description,
            default_branch: repo.defaultBranchRef?.name,
            is_private: repo.isPrivate,
          },
          github: {
            created_at: repo.createdAt,
            updated_at: repo.updatedAt,
          },
        },
        refresh: false,
      });
      processed += 1;
      updated += 1;
    }

    reposHasNext = data.organization.repositories.pageInfo.hasNextPage;
    repoCursor = data.organization.repositories.pageInfo.endCursor;
  }

  let teamCursor: string | undefined;
  let teamsHasNext = true;
  while (teamsHasNext) {
    const data = await fetchGitHubGraphQl<{
      organization: {
        teams: {
          pageInfo: { hasNextPage: boolean; endCursor?: string };
          nodes: Array<OrgTeamListNode>;
        };
      };
    }>({
      token: githubToken,
      query: ORG_TEAMS_LIST_QUERY,
      variables: { org: orgLogin, cursor: teamCursor },
    });

    for (const team of data.organization.teams.nodes) {
      try {
        const [repositories, members] = await Promise.all([
          fetchTeamRepositories({ orgLogin, teamSlug: team.slug, githubToken }),
          fetchTeamMemberLogins({ orgLogin, teamSlug: team.slug, githubToken }),
        ]);

        await esClient.index({
          index: SDLC_INDEX_NAMES.GITHUB_INTEL_TEAMS,
          id: `team:${orgLogin}/${team.slug}`,
          document: {
            '@timestamp': new Date().toISOString(),
            sync: { run_id: runId, source: 'workflow' },
            team: {
              slug: team.slug,
              name: team.name,
              org: orgLogin,
              members_count: team.members.totalCount,
              members,
              repositories,
            },
          },
          refresh: false,
        });
        processed += 1;
        updated += 1;
      } catch (error) {
        failedTeams.push(
          `${team.slug}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    teamsHasNext = data.organization.teams.pageInfo.hasNextPage;
    teamCursor = data.organization.teams.pageInfo.endCursor;
  }

  await esClient.indices.refresh({
    index: [SDLC_INDEX_NAMES.GITHUB_INTEL_TEAMS, SDLC_INDEX_NAMES.GITHUB_INTEL_REPOS],
  });

  if (failedTeams.length > 0 && processed === 0) {
    throw new Error(`Failed to sync GitHub org catalog: ${failedTeams.join('; ')}`);
  }

  return { processed, updated, failed: failedTeams.length > 0 ? failedTeams : undefined };
};

interface EpicPhaseProjectItemSource {
  project?: { number?: number; url?: string };
  hierarchy?: { epic?: string; ticket_type?: string };
  fields?: Array<{ name?: string; value?: string }>;
  content?: { title?: string };
  content_ref?: { number?: number; url?: string; repo?: string; type?: string };
  entity?: { id?: string; type?: string };
  labels?: string[];
  people?: { assignees?: string[] };
  github?: { state?: string };
  pull_request?: { merged?: boolean; draft?: boolean; title?: string };
}

const projectItemFieldsToMap = (
  fields: EpicPhaseProjectItemSource['fields']
): Record<string, string> =>
  Object.fromEntries(
    (fields ?? [])
      .filter((field) => field.name && field.value)
      .map((field) => [field.name as string, field.value as string])
  );

const resolveEpicKeyFromProjectItem = (source: EpicPhaseProjectItemSource | undefined): string | undefined => {
  if (!source) {
    return undefined;
  }

  const fieldMap = projectItemFieldsToMap(source.fields);
  return source.hierarchy?.epic ?? fieldMap.Epic ?? fieldMap.Title ?? source.content?.title;
};

const listEpicKeysForProject = async ({
  esClient,
  projectNumber,
  epicAnchorsByKey,
}: {
  esClient: ElasticsearchClient;
  projectNumber: number;
  epicAnchorsByKey: Map<string, { source: EpicPhaseProjectItemSource; id: string }>;
}): Promise<string[]> => {
  const epicKeys = new Set<string>(epicAnchorsByKey.keys());

  const epicFieldValuesResponse = await esClient.search({
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_ITEMS,
    size: 0,
    query: {
      bool: {
        must: [
          { term: { 'project.number': projectNumber } },
          { exists: { field: 'hierarchy.epic' } },
        ],
      },
    },
    aggs: {
      epic_keys: {
        terms: {
          field: 'hierarchy.epic',
          size: 1000,
        },
      },
    },
  });

  const buckets =
    (
      epicFieldValuesResponse.aggregations?.epic_keys as
        | { buckets?: Array<{ key?: string }> }
        | undefined
    )?.buckets ?? [];

  for (const bucket of buckets) {
    if (typeof bucket.key === 'string' && bucket.key.length > 0) {
      epicKeys.add(bucket.key);
    }
  }

  return [...epicKeys].sort((left, right) => left.localeCompare(right));
};

const loadEpicAnchorByKey = async ({
  esClient,
  projectNumber,
}: {
  esClient: ElasticsearchClient;
  projectNumber: number;
}): Promise<Map<string, { source: EpicPhaseProjectItemSource; id: string }>> => {
  const epicRowsResponse = await esClient.search<EpicPhaseProjectItemSource>({
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_ITEMS,
    size: 500,
    query: {
      bool: {
        must: [
          { term: { 'project.number': projectNumber } },
          { term: { 'hierarchy.ticket_type': 'Epic' } },
        ],
      },
    },
  });

  const anchors = new Map<string, { source: EpicPhaseProjectItemSource; id: string }>();
  for (const hit of epicRowsResponse.hits.hits) {
    const epicKey = resolveEpicKeyFromProjectItem(hit._source);
    if (!epicKey || anchors.has(epicKey)) {
      continue;
    }

    anchors.set(epicKey, {
      source: hit._source ?? {},
      id: hit._id ?? epicKey,
    });
  }

  return anchors;
};

const buildEpicPhasesForProject = async ({
  esClient,
  projectNumber,
  runId,
}: {
  esClient: ElasticsearchClient;
  projectNumber: number;
  runId: string;
}) => {
  const epicAnchorsByKey = await loadEpicAnchorByKey({ esClient, projectNumber });
  const epicKeys = await listEpicKeysForProject({ esClient, projectNumber, epicAnchorsByKey });

  let processed = 0;
  for (const epicKey of epicKeys) {
    const anchor = epicAnchorsByKey.get(epicKey);
    const anchorSource = anchor?.source;
    const anchorFieldMap = projectItemFieldsToMap(anchorSource?.fields);

    const childItemsResponse = await esClient.search<EpicPhaseProjectItemSource>({
      index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_ITEMS,
      size: 500,
      query: {
        bool: {
          must: [
            { term: { 'project.number': projectNumber } },
            { term: { 'hierarchy.epic': epicKey } },
          ],
          must_not: [{ term: { 'hierarchy.ticket_type': 'Epic' } }],
        },
      },
    });

    const childIssues: Array<{
      state?: string;
      labels?: string[];
      assignees?: string[];
      projectStatus?: string;
      linkedPrOpenCount?: number;
    }> = [];
    const childPullRequests: Array<{ merged?: boolean; state?: string; draft?: boolean }> = [];
    const ticketChildItems: Array<{
      repo: string;
      number: number;
      title: string;
      state?: string;
      projectStatus?: string;
    }> = [];
    const epicPullRequestItems: Array<{ repo: string; number: number }> = [];
    const childFieldMaps: Record<string, string>[] = [];
    const seenPullRequestKeys = new Set<string>();

    const recordPullRequest = ({
      repo,
      number,
      merged,
      state,
      draft,
    }: {
      repo?: string;
      number?: number;
      merged?: boolean;
      state?: string;
      draft?: boolean;
    }): void => {
      if (!repo || number === undefined) {
        return;
      }

      const key = `${repo}#${number}`;
      if (seenPullRequestKeys.has(key)) {
        return;
      }
      seenPullRequestKeys.add(key);

      epicPullRequestItems.push({ repo, number });
      childPullRequests.push({ merged, state, draft });
    };

    for (const childHit of childItemsResponse.hits.hits) {
      const child = childHit._source;
      const childFieldMap = projectItemFieldsToMap(child?.fields);
      childFieldMaps.push(childFieldMap);
      const isPullRequest =
        child?.content_ref?.type === 'PullRequest' ||
        child?.entity?.type === 'pull_request' ||
        child?.pull_request !== undefined;

      if (isPullRequest) {
        recordPullRequest({
          repo: child?.content_ref?.repo,
          number: child?.content_ref?.number,
          merged: child?.pull_request?.merged,
          state: child?.github?.state,
          draft: child?.pull_request?.draft,
        });
        continue;
      }

      if (child?.content_ref?.repo && child.content_ref.number !== undefined) {
        ticketChildItems.push({
          repo: child.content_ref.repo,
          number: child.content_ref.number,
          title: child.content?.title ?? childFieldMap.Title ?? `Issue ${child.content_ref.number}`,
          state: child.github?.state,
          projectStatus: childFieldMap.Status,
        });
      }

      childIssues.push({
        state: child?.github?.state,
        labels: child?.labels,
        assignees: child?.people?.assignees,
        projectStatus: childFieldMap.Status,
      });
    }

    const linkedPrResponse = await esClient.search<{
      pull_request?: { merged?: boolean; draft?: boolean };
      github?: { state?: string };
      hierarchy?: { epic?: string };
      repository?: { full_name?: string };
      entity?: { number?: number };
      content_ref?: { repo?: string; number?: number };
    }>({
      index: SDLC_INDEX_NAMES.GITHUB_INTEL_PULL_REQUESTS,
      size: 200,
      query: {
        bool: {
          must: [{ term: { 'hierarchy.epic': epicKey } }],
        },
      },
      _source: [
        'pull_request.merged',
        'pull_request.draft',
        'github.state',
        'repository.full_name',
        'entity.number',
        'content_ref.repo',
        'content_ref.number',
      ],
    });

    for (const prHit of linkedPrResponse.hits.hits) {
      const pr = prHit._source;
      recordPullRequest({
        repo: pr?.content_ref?.repo ?? pr?.repository?.full_name,
        number: pr?.content_ref?.number ?? pr?.entity?.number,
        merged: pr?.pull_request?.merged,
        state: pr?.github?.state,
        draft: pr?.pull_request?.draft,
      });
    }

    const representativeChildFieldMap =
      childFieldMaps.find(
        (fieldMap) => fieldMap['Product Initiative'] || fieldMap.Team || fieldMap.Status
      ) ?? childFieldMaps[0] ?? {};

    const fields: Record<string, string> = {
      ...representativeChildFieldMap,
      ...anchorFieldMap,
      Epic: epicKey,
    };
    const projectUrl =
      anchorSource?.project?.url ?? childItemsResponse.hits.hits[0]?._source?.project?.url;

    const doc = buildEpicPhaseDocument({
      epicKey,
      displayId: anchorSource?.content_ref?.number
        ? `#${anchorSource.content_ref.number}`
        : epicKey,
      title: resolveEpicTitle({
        epicKey,
        anchorTitle: anchorSource?.content?.title,
        fields,
      }),
      owner: resolveEpicOwner({
        fields,
        githubAssignees: collectEpicGithubAssignees({
          anchorAssignees: anchorSource?.people?.assignees,
          childIssues,
        }),
      }),
      projectItemId: anchorSource?.entity?.id ?? anchor?.id ?? epicKey,
      projectNumber,
      projectUrl,
      links: extractEpicLinks({ fields, projectUrl }),
      issueRef: anchorSource?.content_ref?.number
        ? {
            repo: anchorSource.content_ref.repo,
            number: anchorSource.content_ref.number,
            url: anchorSource.content_ref.url,
          }
        : undefined,
      fields,
      epicLabels: anchorSource?.labels,
      childIssues,
      childPullRequests,
      ticketsByRepo: buildTicketsByRepo(ticketChildItems, epicPullRequestItems),
    });

    const roadmapId =
      (doc.roadmap as { id?: string } | undefined)?.id ??
      resolveRoadmapForEpic({
        epicKey,
        initiative: fields['Product Initiative'],
        projectNumber,
      })?.id ??
      'unmapped';

    await esClient.index({
      index: SDLC_INDEX_NAMES.SDLC_EPIC_PHASES,
      id: buildEpicPhaseDocumentId({ roadmapId, epicKey }),
      document: {
        ...doc,
        sync: { run_id: runId, source: 'workflow' },
      },
      refresh: false,
    });
    processed += 1;
  }

  await esClient.indices.refresh({ index: SDLC_INDEX_NAMES.SDLC_EPIC_PHASES });
  return { processed, updated: processed };
};

const listSyncedProjectNumbers = async (esClient: ElasticsearchClient): Promise<number[]> => {
  const response = await esClient.search<{ project?: { number?: number } }>({
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECTS,
    size: 1000,
    _source: ['project.number'],
  });

  const numbers = new Set<number>();
  for (const hit of response.hits.hits) {
    const projectNumber = hit._source?.project?.number;
    if (typeof projectNumber === 'number') {
      numbers.add(projectNumber);
    }
  }

  return [...numbers].sort((left, right) => left - right);
};

export const buildEpicPhases = async ({
  esClient,
  projectNumbers,
  runId,
}: {
  esClient: ElasticsearchClient;
  projectNumbers: number[];
  runId: string;
}) => {
  const numbersToProcess =
    projectNumbers.length > 0 ? projectNumbers : await listSyncedProjectNumbers(esClient);

  let processed = 0;
  for (const projectNumber of numbersToProcess) {
    const result = await buildEpicPhasesForProject({ esClient, projectNumber, runId });
    processed += result.processed;
  }

  return { processed, updated: processed, projectNumbers: numbersToProcess };
};

const PROJECT_ITEM_RELATIONSHIP_QUERY_SIZE = 5000;

const mapProjectItemSourceToRelationshipsInput = (
  source:
    | {
        entity?: { id?: string };
        project?: { number?: number };
        org?: { login?: string };
        hierarchy?: { ticket_type?: string; epic?: string; parent_issue?: string };
        content_ref?: { type?: string; repo?: string; number?: number };
        fields?: Array<{ name?: string; value?: string }>;
      }
    | undefined
): ProjectItemForRelationships | undefined => {
  const projectItemId = source?.entity?.id;
  const projectNumber = source?.project?.number;
  if (!projectItemId || projectNumber === undefined) {
    return undefined;
  }

  const fieldMap = Object.fromEntries(
    (source?.fields ?? [])
      .filter((field) => field.name && field.value)
      .map((field) => [field.name as string, field.value as string])
  );

  return {
    projectItemId,
    projectNumber,
    orgLogin: source?.org?.login,
    ticketType: source?.hierarchy?.ticket_type ?? fieldMap['Ticket Type'],
    epicKey: source?.hierarchy?.epic ?? fieldMap.Epic,
    parentIssue: source?.hierarchy?.parent_issue ?? fieldMap['Parent issue'],
    contentRef: source?.content_ref,
  };
};

const deleteProjectRelationshipEdges = async ({
  esClient,
  projectNumber,
}: {
  esClient: ElasticsearchClient;
  projectNumber: number;
}): Promise<void> => {
  await esClient.deleteByQuery({
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_RELATIONSHIPS,
    conflicts: 'proceed',
    query: {
      bool: {
        must: [
          { term: { 'metadata.scope': 'project' } },
          { term: { 'metadata.project_number': projectNumber } },
        ],
      },
    },
  });
};

const deleteOrgCatalogRelationshipEdges = async (
  esClient: ElasticsearchClient
): Promise<void> => {
  await esClient.deleteByQuery({
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_RELATIONSHIPS,
    conflicts: 'proceed',
    query: {
      term: { 'metadata.scope': 'org_catalog' },
    },
  });
};

const bulkIndexRelationshipEdges = async ({
  esClient,
  edges,
  runId,
}: {
  esClient: ElasticsearchClient;
  edges: ReturnType<typeof dedupeRelationshipEdges>;
  runId: string;
}): Promise<number> => {
  if (!edges.length) {
    return 0;
  }

  const timestamp = new Date().toISOString();
  const operations = edges.flatMap((edge) => [
    {
      index: {
        _index: SDLC_INDEX_NAMES.GITHUB_INTEL_RELATIONSHIPS,
        _id: buildRelationshipDocumentId(edge.from, edge.relation, edge.to),
      },
    },
    {
      '@timestamp': timestamp,
      sync: { run_id: runId, source: 'workflow' },
      from: edge.from,
      to: edge.to,
      relation: edge.relation,
      ...(edge.weight !== undefined ? { weight: edge.weight } : {}),
      ...(edge.metadata ? { metadata: edge.metadata } : {}),
    },
  ]);

  await esClient.bulk({ refresh: false, operations });
  return edges.length;
};

export const buildRelationshipsForProject = async ({
  esClient,
  projectNumber,
  runId,
}: {
  esClient: ElasticsearchClient;
  projectNumber: number;
  runId: string;
}): Promise<{ processed: number; updated: number }> => {
  const response = await esClient.search<{
    entity?: { id?: string };
    project?: { number?: number };
    org?: { login?: string };
    hierarchy?: { ticket_type?: string; epic?: string; parent_issue?: string };
    content_ref?: { type?: string; repo?: string; number?: number };
    fields?: Array<{ name?: string; value?: string }>;
  }>({
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_PROJECT_ITEMS,
    size: PROJECT_ITEM_RELATIONSHIP_QUERY_SIZE,
    query: {
      term: { 'project.number': projectNumber },
    },
    _source: [
      'entity.id',
      'project.number',
      'org.login',
      'hierarchy',
      'content_ref',
      'fields',
    ],
  });

  const items = response.hits.hits
    .map((hit) => mapProjectItemSourceToRelationshipsInput(hit._source))
    .filter((item): item is ProjectItemForRelationships => item !== undefined);

  const edges = dedupeRelationshipEdges(buildRelationshipEdgesFromProjectItems(items));
  await deleteProjectRelationshipEdges({ esClient, projectNumber });
  const updated = await bulkIndexRelationshipEdges({ esClient, edges, runId });

  return { processed: edges.length, updated };
};

export const buildOrgCatalogRelationships = async ({
  esClient,
  runId,
}: {
  esClient: ElasticsearchClient;
  runId: string;
}): Promise<{ processed: number; updated: number }> => {
  const response = await esClient.search<{
    team?: { slug?: string; org?: string; repositories?: string[] };
  }>({
    index: SDLC_INDEX_NAMES.GITHUB_INTEL_TEAMS,
    size: 1000,
    _source: ['team.slug', 'team.org', 'team.repositories'],
  });

  const edges = dedupeRelationshipEdges(
    response.hits.hits.flatMap((hit) => {
      const team = hit._source?.team;
      if (!team?.slug) {
        return [];
      }

      return buildTeamRepositoryEdges({
        slug: team.slug,
        orgLogin: team.org,
        repositories: team.repositories ?? [],
      });
    })
  );

  await deleteOrgCatalogRelationshipEdges(esClient);
  const updated = await bulkIndexRelationshipEdges({ esClient, edges, runId });

  return { processed: edges.length, updated };
};

export const buildRelationships = async ({
  esClient,
  projectNumbers,
  runId,
  includeOrgCatalog = true,
}: {
  esClient: ElasticsearchClient;
  projectNumbers: number[];
  runId: string;
  includeOrgCatalog?: boolean;
}): Promise<{ processed: number; updated: number; projectNumbers: number[] }> => {
  const numbersToProcess =
    projectNumbers.length > 0 ? projectNumbers : await listSyncedProjectNumbers(esClient);

  let processed = 0;
  let updated = 0;

  for (const projectNumber of numbersToProcess) {
    const result = await buildRelationshipsForProject({ esClient, projectNumber, runId });
    processed += result.processed;
    updated += result.updated;
  }

  if (includeOrgCatalog) {
    const orgCatalogResult = await buildOrgCatalogRelationships({ esClient, runId });
    processed += orgCatalogResult.processed;
    updated += orgCatalogResult.updated;
  }

  await esClient.indices.refresh({ index: SDLC_INDEX_NAMES.GITHUB_INTEL_RELATIONSHIPS });

  return { processed, updated, projectNumbers: numbersToProcess };
};

export const getTeamDimensionIds = (): string[] =>
  getTeamDimensionRecords().map((record: TeamDimensionRecord) =>
    getTeamDimensionDocumentId(record)
  );

export const getEpicDocumentId = ({
  roadmapId,
  epic,
}: {
  roadmapId: string;
  epic: string;
}): string => buildEpicPhaseDocumentId({ roadmapId, epicKey: slugifyEpicKey(epic) });
