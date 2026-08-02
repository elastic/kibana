/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getGateDefinitionByGateId,
  PND_GATE_IDS,
  type PndGateDefinition,
  type PndProposalRow,
} from '@kbn/pnd-common';

import { buildThreadAttachments, PND_THREAD_ATTACHMENT_IDS } from '.';

const gateFor = (gateId: string): PndGateDefinition => {
  const gate = getGateDefinitionByGateId(gateId);
  if (gate == null) {
    throw new Error(`no gate registered for "${gateId}"`);
  }
  return gate;
};

const proposal = (overrides: Partial<PndProposalRow> = {}): PndProposalRow => ({
  alwaysGate: true,
  correlationId: 'ad-1',
  createdAt: '2026-08-02T00:05:00.000Z',
  gateId: PND_GATE_IDS.applyTuning,
  inputSchema: {},
  message: 'Apply a tuning to detection rule "Endpoint Security [Insights]"?',
  reasoning: 'Two false positives in seven days.',
  recommendedAction: 'tune',
  reversible: false,
  sourceId: 'source-1',
  stepExecutionId: 'step-exec-1',
  stepId: 'await_apply_tuning',
  title: 'Tune Endpoint Security [Insights]',
  workflowId: 'security.watch.detection',
  workflowRunId: 'run-1',
  ...overrides,
});

describe('buildThreadAttachments', () => {
  it('always builds exactly three attachments', () => {
    expect(
      buildThreadAttachments({
        attackDiscoveryMarkdown: '## Attack Discovery',
        gate: gateFor(PND_GATE_IDS.applyTuning),
        proposal: proposal(),
      })
    ).toHaveLength(3);
  });

  it('gives every attachment a deterministic id, so a retry can only ever conflict', () => {
    const attachments = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal(),
    });

    expect(attachments.map(({ id }) => id)).toEqual([
      PND_THREAD_ATTACHMENT_IDS.attackDiscovery,
      PND_THREAD_ATTACHMENT_IDS.proposedChange,
      PND_THREAD_ATTACHMENT_IDS.backtestComparison,
    ]);
  });

  it('creates every attachment as a text attachment', () => {
    const attachments = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal(),
    });

    expect(attachments.every(({ type }) => type === 'text')).toEqual(true);
  });

  it('carries the Attack Discovery markdown verbatim', () => {
    const [attackDiscovery] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery\n\nA long narrative.',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal(),
    });

    expect(attackDiscovery.data.content).toEqual('## Attack Discovery\n\nA long narrative.');
  });

  it('says the discovery is unavailable rather than attaching an empty body', () => {
    const [attackDiscovery] = buildThreadAttachments({
      attackDiscoveryMarkdown: '   ',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal(),
    });

    expect(attackDiscovery.data.content).toContain('could not be rendered');
  });

  it('names the tuning attachment a proposed rule change', () => {
    const [, proposedChange] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal(),
    });

    expect(proposedChange.description).toEqual('Proposed rule change');
  });

  it('does not claim a rule change on a gate that proposes none', () => {
    const [, proposedChange] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.promoteIncident),
    });

    expect(proposedChange.description).toEqual('Proposed action');
  });

  it('carries the full rationale, unclipped, so the analyst loses nothing the prompt clipped', () => {
    const reasoning = 'z'.repeat(8192);
    const [, proposedChange] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal({ reasoning }),
    });

    expect(proposedChange.data.content).toContain(reasoning);
  });

  it('says the watch has not drafted yet when the gate has not parked', () => {
    const [, proposedChange] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
    });

    expect(proposedChange.data.content).toContain('has not parked yet');
  });

  it('renders a measured backtest', () => {
    const [, , backtest] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal({
        preview: {
          after: { alertCount: 3, from: 'now-7d', to: 'now' },
          before: { alertCount: 41, from: 'now-7d', to: 'now' },
        },
      }),
    });

    expect(backtest.data.content).toContain('41');
    expect(backtest.data.content).toContain('3');
  });

  // The counts reach the analyst through the rationale's anchored labels, not through
  // `PndProposalRow.preview`, so an empty preview here does not mean nothing was measured.
  it('points at the rationale, where the watch actually writes the counts', () => {
    const [, , backtest] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal({ preview: {} }),
    });

    expect(backtest.data.content).toContain('rationale');
  });

  it('says a tuning that rewrites no query has no backtest by design', () => {
    const [, , backtest] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal({ preview: {} }),
    });

    expect(backtest.data.content).toContain('rewrites no query');
  });

  it('does not treat a model-authored non-number as a measurement', () => {
    const [, , backtest] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal({ preview: { before: { from: 'now-7d', to: 'now' } } }),
    });

    expect(backtest.data.content).toContain('No backtest');
  });

  it('never renders an absent backtest as a zero', () => {
    const [, , backtest] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.applyTuning),
      proposal: proposal(),
    });

    expect(backtest.data.content).not.toContain('0 alerts');
    expect(backtest.data.content).toContain('No backtest');
  });

  it('says a non-tuning gate has nothing to backtest', () => {
    const [, , backtest] = buildThreadAttachments({
      attackDiscoveryMarkdown: '## Attack Discovery',
      gate: gateFor(PND_GATE_IDS.incidentContained),
    });

    expect(backtest.data.content).toContain('proposes no detection-rule change');
  });
});
