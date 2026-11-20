/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  KIS_ONBOARDING_IN_PROGRESS_STATUSES,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import {
  RUN_SOURCE_ONBOARDING_BUTTON_LABEL,
  RUN_SOURCE_ONBOARDING_CROSS_PROJECT_TOOLTIP,
} from './translations';

/** True while an onboarding run for the source is going or being canceled. */
export function isOnboardingInProgress(
  status: SignificantEventsWorkflowStatusResult['status'] | undefined
): boolean {
  return status !== undefined && KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(status);
}

/** Keeps the sources whose title, tags or query contain the text, ignoring case. */
export function filterSourcesByQuery(
  sources: NightshiftSource[],
  query: string
): NightshiftSource[] {
  if (!query) {
    return sources;
  }
  const lowerQuery = query.toLowerCase();
  return sources.filter(
    ({ title, tags, esql }) =>
      title.toLowerCase().includes(lowerQuery) ||
      esql.toLowerCase().includes(lowerQuery) ||
      tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Tooltip for the per-row onboard action. `activityBlockTooltip` (loading, error, or
 * pause) always wins, since onboarding cannot run in that state regardless of CPS scope.
 * Otherwise, the cross-project disclosure is appended once CPS has linked projects, since
 * onboarding is exactly the KI generation step that reads across all of them.
 */
export function getOnboardSourceTooltip({
  activityBlockTooltip,
  isCpsMultiProject,
}: {
  activityBlockTooltip: string | undefined;
  isCpsMultiProject: boolean | undefined;
}): string {
  if (activityBlockTooltip) {
    return activityBlockTooltip;
  }
  return isCpsMultiProject
    ? RUN_SOURCE_ONBOARDING_CROSS_PROJECT_TOOLTIP
    : RUN_SOURCE_ONBOARDING_BUTTON_LABEL;
}
