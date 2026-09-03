/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PhaseCatalogEntry,
  PndPhaseStepProjection,
  PndPhaseStepStatus,
} from '@kbn/pnd-common';
import type { LifecycleRow } from '../../../lifecycle_view';

import { buildLifecycleTimeline } from '.';

const entry = (id: string): PhaseCatalogEntry => ({
  description: `${id} description`,
  id,
  label: `${id} label`,
  liveness: 'live',
  phase: 'signal_triage',
});

const row = ({
  id,
  projection,
  status = 'completed',
}: {
  id: string;
  projection?: PndPhaseStepProjection;
  status?: PndPhaseStepStatus;
}): LifecycleRow => ({
  entry: entry(id),
  projection,
  status,
  subordinates: [],
});

const projection = ({
  finishedAt,
  phaseStepId,
  startedAt,
}: {
  finishedAt?: string;
  phaseStepId: string;
  startedAt?: string;
}): PndPhaseStepProjection => ({
  finishedAt,
  phaseStepId,
  startedAt,
  status: 'completed',
  workflowRunId: 'run-1',
});

describe('buildLifecycleTimeline', () => {
  it('returns nothing when no row has run', () => {
    expect(buildLifecycleTimeline([row({ id: 'step-1-1' })])).toEqual([]);
  });

  it('skips a row whose projection carries no start time, because it has no place on a timeline', () => {
    const rows = [
      row({
        id: 'step-1-1',
        projection: projection({ phaseStepId: 'step-1-1' }),
      }),
    ];

    expect(buildLifecycleTimeline(rows)).toEqual([]);
  });

  it('keeps a row that started', () => {
    const rows = [
      row({
        id: 'step-1-1',
        projection: projection({ phaseStepId: 'step-1-1', startedAt: '2026-08-05T00:00:00.000Z' }),
      }),
    ];

    expect(buildLifecycleTimeline(rows).map(({ entry: { id } }) => id)).toEqual(['step-1-1']);
  });

  it('orders by start time rather than by catalog position', () => {
    const rows = [
      row({
        id: 'step-4-2',
        projection: projection({ phaseStepId: 'step-4-2', startedAt: '2026-08-05T00:00:02.000Z' }),
      }),
      row({
        id: 'step-1-1',
        projection: projection({ phaseStepId: 'step-1-1', startedAt: '2026-08-05T00:00:01.000Z' }),
      }),
    ];

    expect(buildLifecycleTimeline(rows).map(({ entry: { id } }) => id)).toEqual([
      'step-1-1',
      'step-4-2',
    ]);
  });

  it('keeps catalog order for rows that started at the same instant', () => {
    const startedAt = '2026-08-05T00:00:01.000Z';
    const rows = [
      row({
        id: 'step-1-1',
        projection: projection({ phaseStepId: 'a', startedAt }),
      }),
      row({
        id: 'step-2-1',
        projection: projection({ phaseStepId: 'b', startedAt }),
      }),
    ];

    expect(buildLifecycleTimeline(rows).map(({ entry: { id } }) => id)).toEqual([
      'step-1-1',
      'step-2-1',
    ]);
  });

  it('carries the start time through', () => {
    const rows = [
      row({
        id: 'step-1-1',
        projection: projection({ phaseStepId: 'step-1-1', startedAt: '2026-08-05T00:00:01.000Z' }),
      }),
    ];

    expect(buildLifecycleTimeline(rows)[0].startedAt).toBe('2026-08-05T00:00:01.000Z');
  });

  it('carries the finish time through when there is one', () => {
    const rows = [
      row({
        id: 'step-1-1',
        projection: projection({
          finishedAt: '2026-08-05T00:00:09.000Z',
          phaseStepId: 'step-1-1',
          startedAt: '2026-08-05T00:00:01.000Z',
        }),
      }),
    ];

    expect(buildLifecycleTimeline(rows)[0].finishedAt).toBe('2026-08-05T00:00:09.000Z');
  });

  it('carries the resolved status through, not the raw projection status', () => {
    const rows = [
      row({
        id: 'step-1-2',
        projection: projection({ phaseStepId: 'step-1-2', startedAt: '2026-08-05T00:00:01.000Z' }),
        status: 'upstream',
      }),
    ];

    expect(buildLifecycleTimeline(rows)[0].status).toBe('upstream');
  });

  it('carries the projection through, so each entry keeps its own deep link', () => {
    const stepProjection = projection({
      phaseStepId: 'step-1-1',
      startedAt: '2026-08-05T00:00:01.000Z',
    });

    const timeline = buildLifecycleTimeline([row({ id: 'step-1-1', projection: stepProjection })]);

    expect(timeline[0].projection).toBe(stepProjection);
  });

  it('does not mutate the rows it was given', () => {
    const rows = [
      row({
        id: 'step-4-2',
        projection: projection({ phaseStepId: 'step-4-2', startedAt: '2026-08-05T00:00:02.000Z' }),
      }),
      row({
        id: 'step-1-1',
        projection: projection({ phaseStepId: 'step-1-1', startedAt: '2026-08-05T00:00:01.000Z' }),
      }),
    ];

    buildLifecycleTimeline(rows);

    expect(rows.map(({ entry: { id } }) => id)).toEqual(['step-4-2', 'step-1-1']);
  });
});
