/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

/** User-data indices for SDLC analytics (Discover/Dashboards friendly). Created by admin setup workflow. */
export const SDLC_INDEX_NAMES = {
  GITHUB_SYNC_STATE: 'github-intel-sync-state',
  GITHUB_INTEL_PROJECTS: 'github-intel-projects',
  GITHUB_INTEL_PROJECT_ITEMS: 'github-intel-project-items',
  GITHUB_INTEL_PROJECT_VIEWS: 'github-intel-project-views',
  GITHUB_INTEL_REPOS: 'github-intel-repos',
  GITHUB_INTEL_ISSUES: 'github-intel-issues',
  GITHUB_INTEL_PULL_REQUESTS: 'github-intel-pull-requests',
  GITHUB_INTEL_COMMENTS: 'github-intel-comments',
  GITHUB_INTEL_PEOPLE: 'github-intel-people',
  GITHUB_INTEL_TEAMS: 'github-intel-teams',
  GITHUB_INTEL_RELATIONSHIPS: 'github-intel-relationships',
  SDLC_EPIC_PHASES: 'sdlc-epic-phases',
  SDLC_TEAM_DIMENSION: 'sdlc-team-dimension',
  SDLC_RELEASE_CALENDAR: 'sdlc-release-calendar',
} as const;

export type SdlcIndexName = (typeof SDLC_INDEX_NAMES)[keyof typeof SDLC_INDEX_NAMES];

/** @deprecated Renamed to `github-intel-sync-state`. Setup workflow adds this alias for old queries. */
export const LEGACY_GITHUB_SYNC_STATE_ALIAS = '.github-sync-state';

export const ALL_SDLC_DATA_INDICES: readonly SdlcIndexName[] = Object.values(SDLC_INDEX_NAMES);
