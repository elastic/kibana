/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionableFinding } from '../types';

/** Default `noData` message used by the Continuity dimension. */
export const CONTINUITY_NO_DATA_SUMMARY = 'No active ingest pipelines found.';

/**
 * Single source of truth for the human-readable Continuity summary string.
 *
 * Shared by:
 *   - the Continuity dimension (get_continuity.ts)
 *   - the agent continuity tool (get_continuity_tool.ts), which passes a
 *     category-scoped `noDataMessage`
 *
 * Keeping the finding-count phrasing here ensures the dimension summary and the
 * agent-facing summary never drift when a new finding type is added.
 */
export const buildContinuitySummary = (
  status: string,
  pipelineCount: number,
  findings: ActionableFinding[],
  noDataMessage: string = CONTINUITY_NO_DATA_SUMMARY
): string => {
  if (status === 'noData') return noDataMessage;
  if (findings.length === 0) return `All ${pipelineCount} active ingest pipelines are healthy.`;

  const silentCount = findings.filter((f) => f.type === 'silence').length;
  const dropCritical = findings.filter((f) => f.type === 'volume_drop_critical').length;
  const dropWarning = findings.filter((f) => f.type === 'volume_drop_warning').length;
  const failureCount = findings.filter((f) => f.type === 'pipeline_failure').length;

  const parts: string[] = [];
  if (silentCount) parts.push(`${silentCount} silent`);
  if (dropCritical) parts.push(`${dropCritical} critical volume drop`);
  if (dropWarning) parts.push(`${dropWarning} volume drop warning`);
  if (failureCount) parts.push(`${failureCount} pipeline failure`);

  return `${parts.join(', ')} across ${pipelineCount} active pipelines.`;
};
