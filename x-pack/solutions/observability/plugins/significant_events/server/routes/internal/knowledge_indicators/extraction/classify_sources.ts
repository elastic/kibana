/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { parseStreamNameFromConcurrencyKey } from '../../../../lib/workflows/onboarding_workflow_client';

const MILLISECONDS_PER_HOUR = 3_600_000;

export interface SourceCandidate {
  /** Workflow YAML reads `streamName`. The value is the source id. */
  streamName: string;
  lastCompletedAt: string | null;
}

export interface SourceClassificationResult {
  alreadyRunning: Array<{ streamName: string; scheduledAt: string | null }>;
  candidates: SourceCandidate[];
  upToDate: SourceCandidate[];
  unsupported: string[];
}

interface ClassifySourcesArgs {
  sources: Array<Pick<NightshiftSource, 'id' | 'esql_updated_at'>>;
  executions: WorkflowExecutionListItemDto[];
  intervalHours: number;
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
}: ClassifySourcesArgs): SourceClassificationResult => {
  const latestBySource = latestExecutionBySource(sources, executions);
  const esqlUpdatedAtById = new Map(sources.map((source) => [source.id, source.esql_updated_at]));
  const nowMs = Date.now();
  const intervalMs = intervalHours * MILLISECONDS_PER_HOUR;

  const alreadyRunning: SourceClassificationResult['alreadyRunning'] = [];
  const ranCandidates: SourceCandidate[] = [];
  const upToDate: SourceCandidate[] = [];

  for (const [sourceId, execution] of latestBySource) {
    const bucket = classifyExecution({
      execution,
      esqlUpdatedAt: esqlUpdatedAtById.get(sourceId) ?? 0,
      nowMs,
      intervalMs,
    });

    if (bucket.kind === 'running') {
      alreadyRunning.push({ streamName: sourceId, scheduledAt: execution.startedAt ?? null });
      continue;
    }
    if (bucket.kind === 'candidate') {
      ranCandidates.push({ streamName: sourceId, lastCompletedAt: bucket.lastCompletedAt });
      continue;
    }
    upToDate.push({ streamName: sourceId, lastCompletedAt: bucket.lastCompletedAt });
  }

  // Oldest completion first, so a source that has waited longer is scheduled sooner.
  ranCandidates.sort(
    (left, right) => completedAtMs(left.lastCompletedAt) - completedAtMs(right.lastCompletedAt)
  );

  // Never-run sources have no completion time, so they go ahead of anything that has run.
  const neverRun = sources
    .filter((source) => !latestBySource.has(source.id))
    .map((source) => ({ streamName: source.id, lastCompletedAt: null }));

  return {
    alreadyRunning,
    candidates: [...neverRun, ...ranCandidates],
    upToDate,
    unsupported: [],
  };
};

/**
 * Executions arrive newest-first. The first row whose concurrency key belongs
 * to a known source is that source's latest run.
 */
const latestExecutionBySource = (
  sources: ClassifySourcesArgs['sources'],
  executions: WorkflowExecutionListItemDto[]
): Map<string, WorkflowExecutionListItemDto> => {
  const sourceIds = new Set(sources.map((source) => source.id));
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

  return latestBySource;
};

type ExecutionBucket =
  | { kind: 'running' }
  | { kind: 'candidate'; lastCompletedAt: string | null }
  | { kind: 'upToDate'; lastCompletedAt: string | null };

/**
 * Running and cancelled are decided before the interval. A finished run is a
 * candidate when the stored query is newer than `startedAt`, or when
 * `finishedAt` is already outside the interval.
 */
const classifyExecution = ({
  execution,
  esqlUpdatedAt,
  nowMs,
  intervalMs,
}: {
  execution: WorkflowExecutionListItemDto;
  esqlUpdatedAt: string | number;
  nowMs: number;
  intervalMs: number;
}): ExecutionBucket => {
  if (!isTerminalStatus(execution.status)) {
    return { kind: 'running' };
  }

  if (execution.status === ExecutionStatus.CANCELLED) {
    return { kind: 'candidate', lastCompletedAt: null };
  }

  const startedMs = execution.startedAt ? new Date(execution.startedAt).getTime() : 0;
  const esqlUpdatedMs = new Date(esqlUpdatedAt).getTime();
  const finishedAt = execution.finishedAt ?? null;
  if (startedMs < esqlUpdatedMs) {
    return { kind: 'candidate', lastCompletedAt: finishedAt };
  }

  const finishedMs = finishedAt ? new Date(finishedAt).getTime() : 0;
  if (nowMs - finishedMs >= intervalMs) {
    return { kind: 'candidate', lastCompletedAt: finishedAt };
  }

  return { kind: 'upToDate', lastCompletedAt: finishedAt };
};

const completedAtMs = (lastCompletedAt: string | null): number =>
  lastCompletedAt ? new Date(lastCompletedAt).getTime() : 0;
