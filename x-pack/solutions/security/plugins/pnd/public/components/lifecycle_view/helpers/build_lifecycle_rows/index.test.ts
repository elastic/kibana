/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PHASE_CATALOG, PND_GATE_PHASE_STEP_IDS } from '@kbn/pnd-common';
import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import {
  buildLifecycleRows,
  DUPLICATED_GATE_PAIRS,
  MISSING_LIVE_STATUS,
  MISSING_UPSTREAM_STATUS,
} from '.';

const executed = (
  phaseStepId: string,
  overrides: Partial<PndPhaseStepProjection> = {}
): PndPhaseStepProjection => ({
  deepLinkPath: `/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=${phaseStepId}-step`,
  finishedAt: '2026-08-03T10:00:01.000Z',
  phaseStepId,
  startedAt: '2026-08-03T10:00:00.000Z',
  status: 'completed',
  stepExecutionId: `${phaseStepId}-step`,
  workflowId: 'system-security-watch-deep',
  workflowRunId: 'run-1',
  ...overrides,
});

describe('buildLifecycleRows', () => {
  it('collapses the three duplicated gate rows, so 14 catalog entries render as 11 rows', () => {
    const rows = buildLifecycleRows({ steps: [] });

    expect(rows).toHaveLength(PHASE_CATALOG.length - DUPLICATED_GATE_PAIRS.length);
  });

  it('renders every one of the 14 catalog entries exactly once, as a row or a subordinate line', () => {
    const rows = buildLifecycleRows({ steps: [] });

    const rendered = rows.flatMap(({ entry, subordinates }) => [
      entry.id,
      ...subordinates.map((subordinate) => subordinate.entry.id),
    ]);

    expect(rendered.sort()).toEqual(PHASE_CATALOG.map(({ id }) => id).sort());
  });

  it('preserves catalog order', () => {
    const rows = buildLifecycleRows({ steps: [] });

    const catalogOrder = PHASE_CATALOG.map(({ id }) => id).filter(
      (id) => !DUPLICATED_GATE_PAIRS.some(({ subordinateId }) => subordinateId === id)
    );

    expect(rows.map(({ entry }) => entry.id)).toEqual(catalogOrder);
  });

  it.each(DUPLICATED_GATE_PAIRS)(
    'attaches $subordinateId to $primaryId as a subordinate line rather than a second row',
    ({ primaryId, subordinateId }) => {
      const rows = buildLifecycleRows({ steps: [] });

      const primary = rows.find(({ entry }) => entry.id === primaryId);

      expect(primary?.subordinates.map(({ entry }) => entry.id)).toEqual([subordinateId]);
    }
  );

  it('keeps the phase-1 gate as its own row, because it duplicates no step row', () => {
    const rows = buildLifecycleRows({ steps: [] });

    expect(rows.some(({ entry }) => entry.id === PND_GATE_PHASE_STEP_IDS.openInvestigation)).toBe(
      true
    );
  });

  it('gives a subordinate line the status of its primary row, so the pair can never disagree', () => {
    const rows = buildLifecycleRows({
      // only the step-row half of the pair is projected
      steps: [executed('step-2-7', { status: 'waiting_for_input' })],
    });

    const primary = rows.find(({ entry }) => entry.id === 'step-2-7');

    expect(primary?.subordinates[0].status).toBe('waiting_for_input');
  });

  it('falls back to the projection of the primary row, so a subordinate line still has a link', () => {
    const rows = buildLifecycleRows({ steps: [executed('step-2-7')] });

    const primary = rows.find(({ entry }) => entry.id === 'step-2-7');

    expect(primary?.subordinates[0].projection?.stepExecutionId).toBe('step-2-7-step');
  });

  it('prefers the projection of the subordinate line when the response carries one', () => {
    const rows = buildLifecycleRows({
      steps: [
        executed('step-2-7'),
        executed(PND_GATE_PHASE_STEP_IDS.promoteIncident, { stepExecutionId: 'gate-step' }),
      ],
    });

    const primary = rows.find(({ entry }) => entry.id === 'step-2-7');

    expect(primary?.subordinates[0].projection?.stepExecutionId).toBe('gate-step');
  });

  it('resolves a live row the response did not project to not_started', () => {
    const rows = buildLifecycleRows({ steps: [] });

    const row = rows.find(({ entry }) => entry.id === 'step-2-1');

    expect(row?.status).toBe(MISSING_LIVE_STATUS);
  });

  it('resolves an upstream row the response did not project to upstream, never not_started', () => {
    const rows = buildLifecycleRows({ steps: [] });

    const row = rows.find(({ entry }) => entry.id === 'step-1-2');

    expect(row?.status).toBe(MISSING_UPSTREAM_STATUS);
  });

  it('never renders completed on an upstream row, even when the response says completed', () => {
    const rows = buildLifecycleRows({ steps: [executed('step-1-2')] });

    const row = rows.find(({ entry }) => entry.id === 'step-1-2');

    expect(row?.status).toBe(MISSING_UPSTREAM_STATUS);
  });

  it('never renders not_started on an upstream row, which would read as "any moment now"', () => {
    const rows = buildLifecycleRows({
      steps: [executed('step-1-2', { status: MISSING_LIVE_STATUS })],
    });

    const row = rows.find(({ entry }) => entry.id === 'step-1-2');

    expect(row?.status).toBe(MISSING_UPSTREAM_STATUS);
  });

  it('keeps the projection it coerced, so nothing else about the row is discarded', () => {
    const rows = buildLifecycleRows({ steps: [executed('step-1-2')] });

    const row = rows.find(({ entry }) => entry.id === 'step-1-2');

    expect(row?.projection?.deepLinkPath).toBe(executed('step-1-2').deepLinkPath);
  });

  it('surfaces a genuine failure on an upstream row rather than hiding it as upstream', () => {
    const rows = buildLifecycleRows({ steps: [executed('step-1-2', { status: 'failed' })] });

    const row = rows.find(({ entry }) => entry.id === 'step-1-2');

    expect(row?.status).toBe('failed');
  });

  it('passes the projected status of a live row through', () => {
    const rows = buildLifecycleRows({
      steps: [executed('step-2-1', { status: 'waiting_for_input' })],
    });

    const row = rows.find(({ entry }) => entry.id === 'step-2-1');

    expect(row?.status).toBe('waiting_for_input');
  });

  it('passes the projection of a live row through', () => {
    const rows = buildLifecycleRows({ steps: [executed('step-2-1')] });

    const row = rows.find(({ entry }) => entry.id === 'step-2-1');

    expect(row?.projection).toEqual(executed('step-2-1'));
  });

  it('ignores a projection for a phase step the catalog does not know', () => {
    const rows = buildLifecycleRows({ steps: [executed('step-9-9')] });

    expect(rows.some(({ entry }) => entry.id === 'step-9-9')).toBe(false);
  });

  it('pairs by orchestratorStepId rather than by a hardcoded id list', () => {
    const rows = buildLifecycleRows({
      catalog: [
        {
          description: 'a lifecycle step',
          id: 'step-9-1',
          label: 'Something',
          liveness: 'live',
          orchestratorStepId: 'await_something',
          phase: 'post_incident',
        },
        {
          description: 'gate',
          id: 'gate-something',
          label: 'Phase gate - something',
          liveness: 'live',
          orchestratorStepId: 'await_something',
          phase: 'post_incident',
        },
      ],
      steps: [],
    });

    expect(rows.map(({ entry }) => entry.id)).toEqual(['step-9-1']);
  });
});

describe('DUPLICATED_GATE_PAIRS', () => {
  it('pins the three pairs the four-phase catalog duplicates', () => {
    expect(DUPLICATED_GATE_PAIRS).toEqual([
      { primaryId: 'step-2-7', subordinateId: PND_GATE_PHASE_STEP_IDS.promoteIncident },
      { primaryId: 'step-3-5', subordinateId: PND_GATE_PHASE_STEP_IDS.incidentContained },
      { primaryId: 'step-4-3', subordinateId: PND_GATE_PHASE_STEP_IDS.applyTuning },
    ]);
  });
});
