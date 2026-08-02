/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow } from '@kbn/pnd-common';
import { PND_GATE_IDS, SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';

import { queueEventFromProposal } from '.';

const proposal: PndProposalRow = {
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-03T12:00:00.000Z',
  gateId: PND_GATE_IDS.openInvestigation,
  inputSchema: {},
  message: 'Open an investigation into the credential-dumping attack on host-1?',
  reasoning: 'Three alerts on host-1 chain to a credential access technique.',
  recommendedAction: 'investigate',
  reversible: true,
  sourceId: 'system-security-watch-floor:run-1:step-exec-1',
  stepExecutionId: 'step-exec-1',
  stepId: 'await_open_investigation',
  threadConversationId: 'thread-1',
  threadTitle: 'Credential dumping on host-1',
  title: 'Open an investigation into the credential-dumping attack on host-1?',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
};

describe('queueEventFromProposal', () => {
  it('uses the thread title as the headline when the thread has materialised', () => {
    expect(queueEventFromProposal({ proposal }).title).toEqual('Credential dumping on host-1');
  });

  it('falls back to the gate prompt title when the thread has not materialised', () => {
    expect(
      queueEventFromProposal({ proposal: { ...proposal, threadTitle: undefined } }).title
    ).toEqual(proposal.title);
  });

  it('carries the gate prompt as the description', () => {
    expect(queueEventFromProposal({ proposal }).description).toEqual(proposal.message);
  });

  it('addresses the row by the gate source id', () => {
    expect(queueEventFromProposal({ proposal }).id).toEqual(proposal.sourceId);
  });

  it('uses the discovery id as the case id', () => {
    expect(queueEventFromProposal({ proposal }).caseId).toEqual('alert-1');
  });

  it('falls back to the source id when the run is uncorrelated', () => {
    expect(queueEventFromProposal({ proposal: { ...proposal, correlationId: '' } }).caseId).toEqual(
      proposal.sourceId
    );
  });

  it('fills actionLabel from gate.actionLabel, never a hardcoded verb', () => {
    expect(queueEventFromProposal({ proposal }).actionLabel).toEqual('Open an investigation');
  });

  it('fills the promote_incident label from the registry too', () => {
    expect(
      queueEventFromProposal({ proposal: { ...proposal, gateId: PND_GATE_IDS.promoteIncident } })
        .actionLabel
    ).toEqual('Escalate to an incident');
  });

  it('omits actionLabel for a gate outside the registry, so the row renders no action', () => {
    expect(
      queueEventFromProposal({ proposal: { ...proposal, gateId: 'not_a_gate' } }).actionLabel
    ).toBeUndefined();
  });

  it('passes a derived risk score through when one exists', () => {
    expect(queueEventFromProposal({ proposal, riskScore: 94 }).riskScore).toEqual(94);
  });

  it('passes a real score of zero through rather than dropping it', () => {
    expect(queueEventFromProposal({ proposal, riskScore: 0 }).riskScore).toEqual(0);
  });

  it('leaves riskScore unset when none was derived', () => {
    expect(queueEventFromProposal({ proposal }).riskScore).toBeUndefined();
  });

  it('carries the thread id so the row can offer chat', () => {
    expect(queueEventFromProposal({ proposal }).threadConversationId).toEqual('thread-1');
  });
});
