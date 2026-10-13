/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationStatus } from '@kbn/nightshift-investigations-plugin/common';
import { getInvestigationTimeLabel } from './investigation_presentation';

/**
 * Returns a secondary subtitle for the row, shown under the `title` headline: the AI-generated
 * `summary` (post-run diagnosis) once it exists, else `subject.summary` (pre-run description of
 * what is being investigated), else nothing.
 */
export const getInvestigationSubtitleText = (investigation: {
  summary?: string;
  subject?: { summary?: string };
}): string | undefined =>
  investigation.summary?.trim() || investigation.subject?.summary?.trim() || undefined;

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
