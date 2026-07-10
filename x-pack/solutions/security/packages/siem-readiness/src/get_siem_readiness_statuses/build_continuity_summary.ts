/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionableFinding, VisibilityStatus } from '../types';

export const SERVERLESS_FAILURE_RATE_NOTE = ' Failure-rate is not evaluated in serverless.';

export interface BuildContinuitySummaryParams {
  status: VisibilityStatus;
  pipelineCount: number;
  findings: ActionableFinding[];
  isServerless: boolean;
  /** Context-specific noData text (dimension vs agent tool). */
  noDataMessage: string;
}

/**
 * Single source of truth for Continuity dimension and agent-tool summaries.
 * Callers supply noDataMessage so each surface keeps its context-specific wording.
 */
export const buildContinuitySummary = ({
  status,
  pipelineCount,
  findings,
  isServerless,
  noDataMessage,
}: BuildContinuitySummaryParams): string => {
  const serverlessNote = isServerless ? SERVERLESS_FAILURE_RATE_NOTE : '';

  if (status === 'noData') {
    return `${noDataMessage}${serverlessNote}`;
  }

  if (findings.length === 0) {
    return `All ${pipelineCount} active ingest pipelines are healthy.${serverlessNote}`;
  }

  const silentCount = findings.filter((f) => f.type === 'silence').length;
  const dropCritical = findings.filter((f) => f.type === 'volume_drop_critical').length;
  const dropWarning = findings.filter((f) => f.type === 'volume_drop_warning').length;
  const failureCount = findings.filter((f) => f.type === 'pipeline_failure').length;

  const parts: string[] = [];
  if (silentCount) parts.push(`${silentCount} silent`);
  if (dropCritical) parts.push(`${dropCritical} critical volume drop`);
  if (dropWarning) parts.push(`${dropWarning} volume drop warning`);
  if (failureCount) parts.push(`${failureCount} pipeline failure`);

  return `${parts.join(', ')} across ${pipelineCount} active pipelines.${serverlessNote}`;
};
