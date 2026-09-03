/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_GATE_IDS,
  PND_GATE_REGISTRY,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  type PndProposalRow,
} from '@kbn/pnd-common';

import { readInvestigationId } from '.';

const ALERT_ID = 'ff6e6b5c-3e2a-4a1c-9f4d-6c5b4a3d2e1f';

const createProposal = ({
  correlationId = ALERT_ID,
  gateId,
}: {
  correlationId?: string;
  gateId: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId,
  createdAt: '2026-08-18T12:00:00.000Z',
  gateId,
  inputSchema: {},
  message: `Gate message for ${gateId}`,
  reasoning: `Reasoning for ${gateId}`,
  recommendedAction: 'investigate',
  reversible: true,
  sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-1`,
  stepExecutionId: 'step-1',
  stepId: 'await_open_investigation',
  title: `Gate message for ${gateId}`,
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
});

describe('readInvestigationId', () => {
  it('reads the discovery id as the investigation a gate inside a container belongs to', () => {
    const proposal = createProposal({ gateId: PND_GATE_IDS.incidentContained });

    expect(readInvestigationId(proposal)).toBe(ALERT_ID);
  });

  /**
   * `apply_tuning` is a worker thread rather than a proposal thread, and its `parentKind` is the
   * incident — but the incident only exists inside an investigation, so the row still groups under
   * one. This is the row that would break if the rule read `parentKind === 'investigation'` alone
   * instead of asking whether the gate *opens* the investigation.
   */
  it('reads the investigation of a worker-thread gate too', () => {
    const proposal = createProposal({ gateId: PND_GATE_IDS.applyTuning });

    expect(readInvestigationId(proposal)).toBe(ALERT_ID);
  });

  it('reads the investigation of the gate that opens the incident', () => {
    const proposal = createProposal({ gateId: PND_GATE_IDS.promoteIncident });

    expect(readInvestigationId(proposal)).toBe(ALERT_ID);
  });

  /** The lane's first gate parks before `open_investigation` runs, so there is nothing to sit under. */
  it('places the gate that opens the investigation in no investigation at all', () => {
    const proposal = createProposal({ gateId: PND_GATE_IDS.openInvestigation });

    expect(readInvestigationId(proposal)).toBeUndefined();
  });

  it('places an uncorrelated run in no investigation, because it has no identity to read', () => {
    const proposal = createProposal({
      correlationId: '',
      gateId: PND_GATE_IDS.incidentContained,
    });

    expect(readInvestigationId(proposal)).toBeUndefined();
  });

  it('treats a whitespace-only discovery id as uncorrelated rather than as an id', () => {
    const proposal = createProposal({
      correlationId: '   ',
      gateId: PND_GATE_IDS.incidentContained,
    });

    expect(readInvestigationId(proposal)).toBeUndefined();
  });

  /** Fail closed: a gate this cannot place in the lane must not be claimed to sit inside a container. */
  it('places a gate the registry does not know in no investigation', () => {
    const proposal = createProposal({ gateId: 'gate-investigate' });

    expect(readInvestigationId(proposal)).toBeUndefined();
  });

  /**
   * The rule is structural — `role: 'container'` plus `parentKind: 'investigation'` — so this pins the
   * registry fact it rests on: exactly one gate opens the investigation. A second one added without a
   * decision would silently move rows into the container-less group.
   */
  it('rests on exactly one registered gate opening the investigation', () => {
    const openers = PND_GATE_REGISTRY.filter(
      ({ parentKind, role }) => role === 'container' && parentKind === 'investigation'
    );

    expect(openers.map(({ gateId }) => gateId)).toEqual([PND_GATE_IDS.openInvestigation]);
  });
});
