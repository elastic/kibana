/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_STEP_IDS } from '@kbn/pnd-common';

import { shouldEmitDetectionChangeSignal } from '.';

describe('shouldEmitDetectionChangeSignal', () => {
  it('emits when the containment gate is approved', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'approve',
        stepId: PND_GATE_STEP_IDS.awaitIncidentContained,
      })
    ).toBe(true);
  });

  it('emits when the containment gate is dismissed', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'dismiss',
        stepId: PND_GATE_STEP_IDS.awaitIncidentContained,
      })
    ).toBe(true);
  });

  it('emits when opening an investigation is dismissed', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'dismiss',
        stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
      })
    ).toBe(true);
  });

  it('emits when promoting an incident is dismissed', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'dismiss',
        stepId: PND_GATE_STEP_IDS.awaitPromoteIncident,
      })
    ).toBe(true);
  });

  it('does not emit when opening an investigation is approved', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'approve',
        stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
      })
    ).toBe(false);
  });

  it('does not emit when promoting an incident is approved', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'approve',
        stepId: PND_GATE_STEP_IDS.awaitPromoteIncident,
      })
    ).toBe(false);
  });

  it('does not emit when a tuning gate is approved', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'approve',
        stepId: PND_GATE_STEP_IDS.awaitApplyTuning,
      })
    ).toBe(false);
  });

  it('does not emit when a tuning gate is dismissed', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'dismiss',
        stepId: PND_GATE_STEP_IDS.awaitApplyTuning,
      })
    ).toBe(false);
  });

  it('does not emit for an unknown step', () => {
    expect(
      shouldEmitDetectionChangeSignal({
        decision: 'dismiss',
        stepId: 'not_a_gate',
      })
    ).toBe(false);
  });
});
