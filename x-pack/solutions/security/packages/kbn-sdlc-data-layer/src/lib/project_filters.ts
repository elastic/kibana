/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

export interface GithubProjectSummary {
  readonly number: number;
  readonly title: string;
  readonly url?: string;
}

export interface GithubProjectSyncFilters {
  readonly includeProjectNumbers?: readonly number[];
  readonly excludeProjectNumbers?: readonly number[];
  readonly titleIncludes?: readonly string[];
  readonly titleExcludes?: readonly string[];
}

const matchesAnyPattern = (value: string, patterns: readonly string[]): boolean => {
  const normalizedValue = value.toLowerCase();
  return patterns.some((pattern) => normalizedValue.includes(pattern.trim().toLowerCase()));
};

export const filterGithubProjects = (
  projects: readonly GithubProjectSummary[],
  filters: GithubProjectSyncFilters = {}
): GithubProjectSummary[] => {
  const includeNumbers = filters.includeProjectNumbers ?? [];
  const excludeNumbers = new Set(filters.excludeProjectNumbers ?? []);
  const titleIncludes = (filters.titleIncludes ?? []).filter((pattern) => pattern.trim().length > 0);
  const titleExcludes = (filters.titleExcludes ?? []).filter((pattern) => pattern.trim().length > 0);

  return projects.filter((project) => {
    if (includeNumbers.length > 0 && !includeNumbers.includes(project.number)) {
      return false;
    }
    if (excludeNumbers.has(project.number)) {
      return false;
    }
    if (titleIncludes.length > 0 && !matchesAnyPattern(project.title, titleIncludes)) {
      return false;
    }
    if (titleExcludes.length > 0 && matchesAnyPattern(project.title, titleExcludes)) {
      return false;
    }
    return true;
  });
};

export const resolveGithubProjectsToSync = ({
  explicitProjectNumbers,
  discoveredProjects,
  filters = {},
}: {
  explicitProjectNumbers: readonly number[];
  discoveredProjects: readonly GithubProjectSummary[];
  filters?: GithubProjectSyncFilters;
}): GithubProjectSummary[] => {
  const hasTitleFilters =
    (filters.titleIncludes?.some((pattern) => pattern.trim().length > 0) ?? false) ||
    (filters.titleExcludes?.some((pattern) => pattern.trim().length > 0) ?? false);
  const hasExcludeNumbers = (filters.excludeProjectNumbers?.length ?? 0) > 0;
  const hasIncludeNumbers = (filters.includeProjectNumbers?.length ?? 0) > 0;
  const needsDiscovery =
    explicitProjectNumbers.length === 0 || hasTitleFilters || hasExcludeNumbers || hasIncludeNumbers;

  if (!needsDiscovery) {
    return explicitProjectNumbers.map((number) => ({ number, title: '' }));
  }

  let candidates = discoveredProjects;
  if (explicitProjectNumbers.length > 0) {
    const allowed = new Set(explicitProjectNumbers);
    candidates = discoveredProjects.filter((project) => allowed.has(project.number));
  }

  return filterGithubProjects(candidates, filters);
};
