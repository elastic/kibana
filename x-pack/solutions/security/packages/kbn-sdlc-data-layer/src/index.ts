/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

export {
  SDLC_INDEX_NAMES,
  LEGACY_GITHUB_SYNC_STATE_ALIAS,
  ALL_SDLC_DATA_INDICES,
  type SdlcIndexName,
} from './constants/indices';
export {
  SDLC_INDEX_DEFINITIONS,
  getIndexDefinition,
  type IndexDefinition,
} from './mappings/index';
export { TEAM_DIMENSION_SEED, type TeamDimensionRecord } from './config/team_dimension';
export {
  PRODUCT_INITIATIVE_ROADMAP_MAP,
  VIEW_ROADMAP_MAP,
  resolveRoadmapFromInitiative,
  type RoadmapMappingEntry,
} from './config/roadmap_mapping';
export {
  attributeTeam,
  normalizeTeamLabel,
  resolveOrgTeamsFromLabels,
  resolveOrgTeamsFromProjectTeam,
  teamDimensionToBulkDocuments,
  getTeamDimensionRecords,
  getTeamDimensionDocumentId,
  type TeamAttribution,
} from './lib/team_attribution';
export {
  rollupTickets,
  rollupPullRequests,
  computeP4Gate,
  computeP5Gate,
  computeDeliveryCoveragePct,
  computeCoverageStatus,
} from './lib/phase_gates';
export {
  buildEpicPhaseDocument,
  buildEpicPhaseDocumentId,
  slugifyEpicKey,
  type BuildEpicPhaseInput,
} from './lib/build_epic_phases';
export {
  buildTicketsByRepo,
  extractEpicLinks,
  formatIssueRef,
  formatPullRequestRef,
  resolveEpicOwner,
  resolveEpicTitle,
  resolveTicketStatus,
  type EpicPullRequestItem,
  type TicketChildItem,
} from './lib/build_tickets_by_repo';
export {
  buildEpicRef,
  buildIssueRef,
  buildPullRequestRef,
  buildProjectItemRef,
  buildRelationshipDocumentId,
  buildRelationshipEdgesFromProjectItem,
  buildRelationshipEdgesFromProjectItems,
  buildRepoRef,
  buildTeamRef,
  buildTeamRepositoryEdges,
  dedupeRelationshipEdges,
  type ProjectItemForRelationships,
  type RelationshipEdge,
  type TeamForRelationships,
} from './lib/build_relationships';
export {
  PROJECTS_QUERY,
  ORG_PROJECTS_LIST_QUERY,
  ORG_TEAMS_QUERY,
  ORG_TEAMS_LIST_QUERY,
  ORG_TEAM_REPOS_QUERY,
  ORG_TEAM_MEMBERS_QUERY,
  ORG_REPOS_QUERY,
  fetchGitHubGraphQl,
  fieldValuesToMap,
} from './lib/github_graphql';
export {
  filterGithubProjects,
  resolveGithubProjectsToSync,
  type GithubProjectSummary,
  type GithubProjectSyncFilters,
} from './lib/project_filters';
