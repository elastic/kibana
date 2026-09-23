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

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { classifySources } from './classify_sources';

const makeExecution = (
  sourceId: string,
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto =>
  ({
    id: `exec-${sourceId}`,
    spaceId: '*',
    status: ExecutionStatus.COMPLETED,
    isTestRun: false,
    startedAt: '2025-01-01T00:00:00Z',
    finishedAt: '2025-01-01T00:05:00Z',
    error: null,
    workflowId: 'streams_ki/onboarding',
    duration: 300000,
    concurrencyGroupKey: `streams-ki-onboarding-${sourceId}`,
    ...overrides,
  } as WorkflowExecutionListItemDto);

const makeSource = (id: string, esqlUpdatedAt = '2020-01-01T00:00:00.000Z') => ({
  id,
  esql_updated_at: esqlUpdatedAt,
});

const candidateNames = (result: ReturnType<typeof classifySources>) =>
  result.candidates.map((candidate) => candidate.streamName);

describe('classifySources', () => {
  const defaultArgs = {
    sources: [] as Array<ReturnType<typeof makeSource>>,
    executions: [] as WorkflowExecutionListItemDto[],
    intervalHours: 12,
  };

  it('treats sources without an execution as never-processed candidates', () => {
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('source-a'), makeSource('source-b')],
    });

    expect(candidateNames(result)).toEqual(['source-a', 'source-b']);
    expect(result.unsupported).toEqual([]);
  });

  it('identifies already running executions, even when the query changed mid-run', () => {
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('running-source', '2026-06-01T00:00:00.000Z')],
      executions: [
        makeExecution('running-source', {
          status: ExecutionStatus.RUNNING,
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: '',
        }),
      ],
    });

    expect(result.alreadyRunning).toEqual([
      { streamName: 'running-source', scheduledAt: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(result.candidates).toEqual([]);
  });

  it('treats pending executions as already running', () => {
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('pending-source')],
      executions: [
        makeExecution('pending-source', {
          status: ExecutionStatus.PENDING,
          finishedAt: '',
        }),
      ],
    });

    expect(result.alreadyRunning).toHaveLength(1);
    expect(result.candidates).toEqual([]);
  });

  it('marks a recent completion as up to date when it started after the stored query', () => {
    const recentCompletion = new Date().toISOString();
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('fresh-source', '2020-01-01T00:00:00.000Z')],
      executions: [
        makeExecution('fresh-source', {
          startedAt: '2025-01-01T00:00:00.000Z',
          finishedAt: recentCompletion,
        }),
      ],
    });

    expect(result.upToDate).toEqual([
      { streamName: 'fresh-source', lastCompletedAt: recentCompletion },
    ]);
    expect(result.candidates).toEqual([]);
  });

  it('schedules a source whose last execution finished past the extraction interval', () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('old-source')],
      executions: [makeExecution('old-source', { finishedAt: oldCompletion })],
    });

    expect(result.candidates).toEqual([
      { streamName: 'old-source', lastCompletedAt: oldCompletion },
    ]);
  });

  it('schedules a source when the stored query changed after the run started, even inside the interval', () => {
    const recentCompletion = new Date().toISOString();
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('edited-source', '2026-06-01T00:00:00.000Z')],
      executions: [
        makeExecution('edited-source', {
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: recentCompletion,
        }),
      ],
    });

    expect(result.candidates).toEqual([
      { streamName: 'edited-source', lastCompletedAt: recentCompletion },
    ]);
    expect(result.upToDate).toEqual([]);
  });

  it('uses finishedAt for failed executions in the interval calculation', () => {
    const recentFailure = new Date().toISOString();
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('failed-source')],
      executions: [
        makeExecution('failed-source', {
          status: ExecutionStatus.FAILED,
          finishedAt: recentFailure,
        }),
      ],
    });

    expect(result.upToDate).toEqual([
      { streamName: 'failed-source', lastCompletedAt: recentFailure },
    ]);
    expect(result.candidates).toEqual([]);
  });

  it('immediately reschedules a cancelled execution', () => {
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('cancelled-source')],
      executions: [
        makeExecution('cancelled-source', {
          status: ExecutionStatus.CANCELLED,
          finishedAt: new Date().toISOString(),
        }),
      ],
    });

    expect(result.candidates).toEqual([{ streamName: 'cancelled-source', lastCompletedAt: null }]);
    expect(result.upToDate).toEqual([]);
  });

  it('places never-run sources before sources with an old execution', () => {
    const oldCompletion = '2024-01-01T00:00:00Z';
    const result = classifySources({
      ...defaultArgs,
      sources: [makeSource('old-source'), makeSource('new-source')],
      executions: [makeExecution('old-source', { finishedAt: oldCompletion })],
    });

    expect(candidateNames(result)).toEqual(['new-source', 'old-source']);
  });

  it('orders candidates by oldest completion first', () => {
    const finishedTwelveMinAgo = new Date(Date.now() - 12 * 60_000).toISOString();
    const finishedTenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const result = classifySources({
      ...defaultArgs,
      intervalHours: 0,
      sources: [makeSource('recent-source'), makeSource('older-source')],
      executions: [
        makeExecution('recent-source', { finishedAt: finishedTenMinAgo }),
        makeExecution('older-source', { finishedAt: finishedTwelveMinAgo }),
      ],
    });

    expect(candidateNames(result)).toEqual(['older-source', 'recent-source']);
  });
});
