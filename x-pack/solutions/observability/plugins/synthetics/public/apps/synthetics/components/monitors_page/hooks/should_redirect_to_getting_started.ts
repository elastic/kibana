/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ShouldRedirectToGettingStartedParams {
  absoluteTotal: number;
  overviewSettled: boolean;
  overviewError: boolean;
  hasActiveFilter: boolean;
  hasExternalMonitors: boolean;
  /** False until `cpsManager.whenReady()` resolves. Absent CPS → treat as ready. */
  cpsReady: boolean;
  hasLinkedProjects: boolean;
  /**
   * True when overview status was queried with project routing `_alias:*`, so an
   * empty result includes linked projects. An origin-only query must not onboard
   * away from remotes it did not search.
   */
  statusIncludesLinkedProjects: boolean;
}

/**
 * Whether an empty origin saved-object list should onboard the user away from
 * Overview / Management. Linked-project monitors have no local SO. A failed or
 * unsettled status fetch, or an origin-only query while linked projects exist,
 * must not look like a fresh install. A settled all-projects status with no
 * monitors should onboard — otherwise Create Monitor stays hidden too.
 */
export const shouldRedirectToGettingStarted = ({
  absoluteTotal,
  overviewSettled,
  overviewError,
  hasActiveFilter,
  hasExternalMonitors,
  cpsReady,
  hasLinkedProjects,
  statusIncludesLinkedProjects,
}: ShouldRedirectToGettingStartedParams): boolean => {
  if (absoluteTotal > 0 || hasExternalMonitors || hasActiveFilter) {
    return false;
  }
  if (!overviewSettled || overviewError || !cpsReady) {
    return false;
  }
  if (hasLinkedProjects && !statusIncludesLinkedProjects) {
    return false;
  }
  return true;
};
