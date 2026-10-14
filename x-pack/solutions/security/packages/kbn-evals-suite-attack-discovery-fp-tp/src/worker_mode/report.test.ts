/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildWorkerModePlan } from './plan';
import { formatWorkerModeReport, toWorkerModeAttackResults, toWorkerModeManifest } from './report';

const attack = (attackId: string) => ({ attackId, title: attackId, alertIds: ['a1'] });

const review = (attackId: string, verdict?: string) => ({
  attackId,
  investigationId: `inv-${attackId}`,
  reviewExecutionId: `review-${attackId}`,
  ...(verdict === undefined ? {} : { verdict }),
});

const plan = buildWorkerModePlan({
  space: 'qa-fp',
  exampleId: 'encoded-powershell.fp',
  now: new Date('2026-10-14T12:00:00.000Z'),
  suffix: 'run1',
});

describe('toWorkerModeAttackResults', () => {
  it('returns PASS, FAIL and PENDING against the expected outcome', () => {
    const results = toWorkerModeAttackResults(
      [attack('match'), attack('miss'), attack('open')],
      [review('match', 'false_positive'), review('miss', 'inconclusive'), review('open')],
      'false_positive'
    );
    expect(results.map(({ attackId, status }) => [attackId, status])).toEqual([
      ['match', 'PASS'],
      ['miss', 'FAIL'],
      ['open', 'PENDING'],
    ]);
  });

  it('returns the investigation the review opened', () => {
    const [result] = toWorkerModeAttackResults(
      [attack('match')],
      [review('match', 'false_positive')],
      'false_positive'
    );
    expect(result.investigationId).toBe('inv-match');
  });
});

describe('formatWorkerModeReport', () => {
  const trigger = {
    floorWorkflowId: 'floor',
    floorExecutionId: 'floor-run',
    floorStatus: 'completed',
    generatedAt: '2026-10-14T12:10:00.000Z',
  };

  it('reports that no attack was generated', () => {
    const lines = formatWorkerModeReport(plan, { ...trigger, attacks: [] });
    expect(lines[1]).toMatch(/^NO ATTACK GENERATED/);
  });

  it('returns one line per attack with its ids, verdict and result', () => {
    const lines = formatWorkerModeReport(plan, {
      ...trigger,
      attacks: toWorkerModeAttackResults(
        [attack('match')],
        [review('match', 'false_positive')],
        'false_positive'
      ),
    });
    expect(lines[1]).toBe(
      'PASS  attack match  investigation inv-match  verdict false_positive  expected false_positive  review review-match'
    );
  });
});

describe('toWorkerModeManifest', () => {
  it('returns the marker, ids, expected outcome and window deadline', () => {
    const manifest = toWorkerModeManifest(plan);
    expect(manifest).toEqual(
      expect.objectContaining({
        space: 'qa-fp',
        exampleId: 'encoded-powershell.fp',
        expectedOutcome: 'false_positive',
        runMarker: plan.runMarker,
        windowDeadline: plan.windowDeadline,
        alertIds: plan.alertIds,
        hostIds: plan.hostIds,
      })
    );
    expect(manifest.entityIds).toEqual(plan.entities.map(({ entityId }) => entityId));
    expect(manifest.trigger).toBeUndefined();
  });
});
