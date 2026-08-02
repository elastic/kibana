/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_GATE_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  deriveConversationIds,
} from '@kbn/pnd-common';
import type { PndProposalRow } from '@kbn/pnd-common';

import { readOpenedIncidentId } from '.';

const ALERT_ID = 'alert-1';

const createProposal = ({
  correlationId = ALERT_ID,
  gateId = PND_GATE_IDS.promoteIncident,
}: {
  correlationId?: string;
  gateId?: string;
} = {}): PndProposalRow => ({
  alwaysGate: false,
  correlationId,
  createdAt: '2026-08-17T12:00:00.000Z',
  gateId,
  inputSchema: {},
  message: 'Escalate "Suspicious activity" to an incident?',
  reasoning: 'Approval escalates the investigation.',
  recommendedAction: 'escalate',
  reversible: false,
  sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-1`,
  stepExecutionId: 'step-1',
  stepId: 'await_promote_incident',
  title: 'Escalate "Suspicious activity" to an incident?',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
});

describe('readOpenedIncidentId', () => {
  it('derives the incident conversation id when the promote gate is approved', () => {
    expect(
      readOpenedIncidentId({ answer: { decision: 'approve' }, proposal: createProposal() })
    ).toEqual(deriveConversationIds(ALERT_ID).incidentConversationId);
  });

  /**
   * The id is the same UUIDv5 `watch_floor.yaml`'s `open_incident` step creates the conversation at, so
   * the link cannot point somewhere else — which is why this asserts the namespace rather than a
   * literal.
   */
  it('derives the same id the incident namespace derives, not the investigation one', () => {
    const { incidentConversationId, investigationConversationId } = deriveConversationIds(ALERT_ID);

    expect(
      readOpenedIncidentId({ answer: { decision: 'approve' }, proposal: createProposal() })
    ).not.toEqual(investigationConversationId);
    expect(
      readOpenedIncidentId({ answer: { decision: 'approve' }, proposal: createProposal() })
    ).toEqual(incidentConversationId);
  });

  /**
   * `stop_if_dismissed_incident` records the refusal in the *investigation* conversation and ends the
   * run: no incident is opened, so there is nothing to link to.
   */
  it('returns undefined when the promote gate is dismissed, because no incident is opened', () => {
    expect(
      readOpenedIncidentId({ answer: { decision: 'dismiss' }, proposal: createProposal() })
    ).toBeUndefined();
  });

  it('returns undefined when the answer carries no decision at all', () => {
    expect(
      readOpenedIncidentId({ answer: { rationale: 'Confirmed.' }, proposal: createProposal() })
    ).toBeUndefined();
  });

  it.each([
    PND_GATE_IDS.applyTuning,
    PND_GATE_IDS.incidentContained,
    PND_GATE_IDS.openInvestigation,
  ])('returns undefined for the %s gate, which opens no incident', (gateId) => {
    expect(
      readOpenedIncidentId({
        answer: { decision: 'approve' },
        proposal: createProposal({ gateId }),
      })
    ).toBeUndefined();
  });

  /** Fail closed: a gate the registry does not know is not the one gate that opens an incident. */
  it('returns undefined for a gate id outside the registry', () => {
    expect(
      readOpenedIncidentId({
        answer: { decision: 'approve' },
        proposal: createProposal({ gateId: 'not_a_gate' }),
      })
    ).toBeUndefined();
  });

  /** A `waitForInput` step id is not a gate id, and the registry is keyed on the short id. */
  it('returns undefined for the gate step id', () => {
    expect(
      readOpenedIncidentId({
        answer: { decision: 'approve' },
        proposal: createProposal({ gateId: 'await_promote_incident' }),
      })
    ).toBeUndefined();
  });

  it.each(['', '   '])(
    'returns undefined for an uncorrelated run, whose discovery id is %p',
    (correlationId) => {
      expect(
        readOpenedIncidentId({
          answer: { decision: 'approve' },
          proposal: createProposal({ correlationId }),
        })
      ).toBeUndefined();
    }
  );
});
