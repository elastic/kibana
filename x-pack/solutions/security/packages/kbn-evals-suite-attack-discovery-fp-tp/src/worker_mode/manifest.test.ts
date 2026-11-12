/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toWorkerModeManifest } from './manifest';
import { buildWorkerModePlan } from './plan';

const plan = buildWorkerModePlan({
  space: 'qa-fp',
  exampleId: 'encoded-powershell.fp',
  now: new Date('2026-10-14T12:00:00.000Z'),
  suffix: 'run1',
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
  });
});
