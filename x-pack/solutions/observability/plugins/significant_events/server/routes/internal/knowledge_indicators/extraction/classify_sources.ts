/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { parseStreamNameFromConcurrencyKey } from '../../../../lib/workflows/onboarding_workflow_client';

export interface SourceCandidate {
  streamName: string;
  lastCompletedAt: string | null;
}

export interface SourceClassificationResult {
  alreadyRunning: Array<{ streamName: string; scheduledAt: string | null }>;
  candidates: SourceCandidate[];
  upToDate: SourceCandidate[];
  unsupported: string[];
}

/**
 * Buckets enabled sources by the latest onboarding execution.
 * A non-terminal run stays in `alreadyRunning` even when `esql_updated_at`
 * moved during that run. A terminal run that started before the stored ES|QL
 * changed is a candidate, even inside the interval. A title edit does not
 * move `esql_updated_at`.
 */
export const classifySources = ({
  sources,
  executions,
  intervalHours,
}: {
  sources: Array<Pick<NightshiftSource, 'id' | 'esql_updated_at'>>;
  executions: WorkflowExecutionListItemDto[];
  intervalHours: number;
}): SourceClassificationResult => {
  const sourceIds = new Set(sources.map((source) => source.id));
  const esqlUpdatedAtById = new Map(sources.map((source) => [source.id, source.esql_updated_at]));

  const latestBySource = new Map<string, WorkflowExecutionListItemDto>();
  for (const execution of executions) {
    if (!execution.concurrencyGroupKey) {
      continue;
    }
    const sourceId = parseStreamNameFromConcurrencyKey(execution.concurrencyGroupKey);
    if (!sourceId || !sourceIds.has(sourceId) || latestBySource.has(sourceId)) {
      continue;
    }
    latestBySource.set(sourceId, execution);
  }

  const intervalMs = intervalHours * 3_600_000;
  const now = Date.now();
  const alreadyRunning: SourceClassificationResult['alreadyRunning'] = [];
  const candidates: SourceCandidate[] = [];
  const upToDate: SourceCandidate[] = [];

  for (const [sourceId, execution] of latestBySource) {
    if (!isTerminalStatus(execution.status)) {
      alreadyRunning.push({ streamName: sourceId, scheduledAt: execution.startedAt ?? null });
      continue;
    }

    if (execution.status === ExecutionStatus.CANCELLED) {
      candidates.push({ streamName: sourceId, lastCompletedAt: null });
      continue;
    }

    const startedMs = execution.startedAt ? new Date(execution.startedAt).getTime() : 0;
    const esqlUpdatedMs = new Date(esqlUpdatedAtById.get(sourceId) ?? 0).getTime();
    const finishedAt = execution.finishedAt ?? null;
    if (startedMs < esqlUpdatedMs) {
      candidates.push({ streamName: sourceId, lastCompletedAt: finishedAt });
      continue;
    }

    const finishedMs = finishedAt ? new Date(finishedAt).getTime() : 0;
    if (now - finishedMs >= intervalMs) {
      candidates.push({ streamName: sourceId, lastCompletedAt: finishedAt });
    } else {
      upToDate.push({ streamName: sourceId, lastCompletedAt: finishedAt });
    }
  }

  candidates.sort(
    (a, b) =>
      (a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0) -
      (b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0)
  );

  const noExecutionSources = [...sourceIds].filter((id) => !latestBySource.has(id));
  const allCandidates = [
    ...noExecutionSources.map((id) => ({ streamName: id, lastCompletedAt: null })),
    ...candidates,
  ];

  return {
    alreadyRunning,
    candidates: allCandidates,
    upToDate,
    unsupported: [],
  };
};
