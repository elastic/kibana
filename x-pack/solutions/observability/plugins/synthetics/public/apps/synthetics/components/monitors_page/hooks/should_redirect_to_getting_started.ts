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
}

/**
 * Whether an empty origin saved-object list should onboard the user away from
 * Overview / Management. Linked-project monitors have no local SO, so CPS with
 * linked projects — or a failed/unsettled status fetch — must not look like a
 * fresh install.
 */
export const shouldRedirectToGettingStarted = ({
  absoluteTotal,
  overviewSettled,
  overviewError,
  hasActiveFilter,
  hasExternalMonitors,
  cpsReady,
  hasLinkedProjects,
}: ShouldRedirectToGettingStartedParams): boolean => {
  if (absoluteTotal > 0 || hasExternalMonitors || hasActiveFilter) {
    return false;
  }
  if (!overviewSettled || overviewError || !cpsReady || hasLinkedProjects) {
    return false;
  }
  return true;
};
