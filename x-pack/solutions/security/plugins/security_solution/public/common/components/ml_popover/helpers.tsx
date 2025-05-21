/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityJob } from './types';

/**
 * Returns a filtered array of Jobs according to JobsTableFilters selections
 *
 * @param jobs to filter
 * @param selectedGroups groups to filter on
 * @param showCustomJobs whether or not to show all Custom Jobs (Non-embedded Jobs in SIEM Group)
 * @param showElasticJobs whether or not to show Elastic Jobs (Embedded ConfigTemplate Jobs)
 * @param filterQuery user-provided search string to filter for occurrence in job names/description
 */
export const filterJobs = ({
  jobs,
  selectedGroups,
  showCustomJobs,
  showElasticJobs,
  filterQuery,
}: {
  jobs: SecurityJob[];
  selectedGroups: string[];
  showCustomJobs: boolean;
  showElasticJobs: boolean;
  filterQuery: string;
}): SecurityJob[] =>
  searchFilter(
    jobs
      .filter((job) => !showCustomJobs || (showCustomJobs && !job.isElasticJob))
      .filter((job) => !showElasticJobs || (showElasticJobs && job.isElasticJob))
      .filter(
        (job) => selectedGroups.length === 0 || selectedGroups.some((g) => job.groups.includes(g))
      ),
    filterQuery
  );

/**
 * Returns filtered array of Jobs based on user-provided search string to filter for occurrence in job names/description
 *
 * @param jobs to filter
 * @param filterQuery user-provided search string to filter for occurrence in job names/description
 */
export const searchFilter = (jobs: SecurityJob[], filterQuery?: string): SecurityJob[] => {
  const lowerCaseFilterQuery = filterQuery?.toLowerCase();
  return jobs.filter((job) =>
    lowerCaseFilterQuery == null
      ? true
      : job.id.includes(lowerCaseFilterQuery) ||
        job.customSettings?.security_app_display_name
          ?.toLowerCase()
          ?.includes(lowerCaseFilterQuery) ||
        job.description.toLowerCase().includes(lowerCaseFilterQuery)
  );
};

/**
 * Given an array of titles this will always return the same string for usage within
 * useEffect and other shallow compare areas.
 * This won't return a stable reference for case sensitive strings intentionally for speed.
 * @param patterns string[] string array that will return a stable reference regardless of ordering or case sensitivity.
 */
export const getStablePatternTitles = (patterns: string[]) => patterns.sort().join();
