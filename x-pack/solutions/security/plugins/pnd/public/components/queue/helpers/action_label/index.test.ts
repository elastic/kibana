/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_IDS, PND_GATE_REGISTRY } from '@kbn/pnd-common';

import { actionLabel } from '.';

describe('actionLabel', () => {
  it('reads Open an investigation from gate.actionLabel', () => {
    expect(actionLabel(PND_GATE_IDS.openInvestigation)).toEqual('Open an investigation');
  });

  it('reads Escalate to an incident from gate.actionLabel', () => {
    expect(actionLabel(PND_GATE_IDS.promoteIncident)).toEqual('Escalate to an incident');
  });

  it('reads Review containment actions from gate.actionLabel', () => {
    expect(actionLabel(PND_GATE_IDS.incidentContained)).toEqual('Review containment actions');
  });

  it('reads Apply the rule tuning from gate.actionLabel', () => {
    expect(actionLabel(PND_GATE_IDS.applyTuning)).toEqual('Apply the rule tuning');
  });

  it('returns the registry actionLabel for every gate, never a restated copy', () => {
    expect(PND_GATE_REGISTRY.map(({ gateId }) => actionLabel(gateId))).toEqual(
      PND_GATE_REGISTRY.map(({ actionLabel: label }) => label)
    );
  });

  it('never returns a bare Approve', () => {
    expect(
      PND_GATE_REGISTRY.map(({ gateId }) => actionLabel(gateId)).some((label) =>
        label?.toLowerCase().startsWith('approve')
      )
    ).toBe(false);
  });

  it('returns undefined for a gate id outside the registry, so the row renders no action', () => {
    expect(actionLabel('not_a_gate')).toBeUndefined();
  });

  it('returns undefined for a waitForInput step id, which is not a gate id', () => {
    expect(actionLabel('await_open_investigation')).toBeUndefined();
  });
});
