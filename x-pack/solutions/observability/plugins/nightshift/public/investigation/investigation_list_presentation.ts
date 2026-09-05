/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationStatus } from '@kbn/nightshift-investigations-plugin/common';
import { getInvestigationTimeLabel } from './investigation_presentation';

/**
 * Returns the headline text for an investigation list row or flyout header.
 * Prefers the AI-generated `summary` (post-run diagnosis) over `subject.summary`
 * (pre-run description of what is being investigated).
 */
export const getInvestigationPrimaryText = (investigation: {
  investigation_id: string;
  summary?: string;
  subject?: { id: string; summary?: string };
}): string =>
  investigation.summary?.trim() ||
  investigation.subject?.summary?.trim() ||
  investigation.subject?.id ||
  investigation.investigation_id;

/**
 * Returns a secondary subtitle for the row, shown under the headline.
 * When the AI summary is the headline, shows `subject.summary` as context for
 * what entity/subject was investigated. Falls back to nothing when there is no
 * secondary text worth showing.
 */
export const getInvestigationSubtitleText = (investigation: {
  investigation_id: string;
  summary?: string;
  subject?: { id: string; summary?: string };
}): string | undefined => {
  const hasAiSummary = Boolean(investigation.summary?.trim());
  const subjectSummary = investigation.subject?.summary?.trim();
  // Only show subject.summary as subtitle when the AI summary is taking the headline slot.
  return hasAiSummary && subjectSummary ? subjectSummary : undefined;
};

/**
 * Wrapper around `getInvestigationTimeLabel` that handles the optional `started_at` from
 * the new API (unset until a run leaves `pending`). Returns `undefined` for pending rows.
 */
export const getInvestigationRunTimeLabel = ({
  startedAt,
  completedAt,
  status,
}: {
  startedAt: string | undefined;
  completedAt: string | undefined;
  status: InvestigationStatus;
}): string | undefined => {
  if (!startedAt) {
    return undefined;
  }
  return getInvestigationTimeLabel({
    startedAt,
    endedAt: completedAt,
    isRunning: status === 'running',
  });
};
