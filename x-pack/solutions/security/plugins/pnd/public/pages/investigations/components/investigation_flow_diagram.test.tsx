/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Investigation, Proposal, TimelineEvent } from '@kbn/pnd-common';
import { InvestigationFlowDiagram } from './investigation_flow_diagram';

const makeEvent = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: 'evt-1',
  timestamp: '2026-07-23T07:01:00Z',
  type: 'triage',
  summary: 'Default event summary',
  actor: 'system-security-watch-floor',
  ...overrides,
});

const makeInvestigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'inv-floor-ransom-008',
  template_id: 'investigation',
  title: 'Sales NAS ransomware — 1,431 files renamed .lkx in 4 minutes',
  createdAt: '2026-07-23T07:00:00Z',
  updatedAt: '2026-07-23T07:21:00Z',
  watch_id: 'system-security-watch-floor',
  watch_execution_id: 'exec-1',
  watch_tier: 'floor',
  pendingProposalCount: 1,
  events: [],
  ...overrides,
});

const makeProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-floor-ransom-008',
  template_id: 'proposal',
  parentConversationId: 'inv-floor-ransom-008',
  type: 'contain',
  confidence: 0.93,
  reasoning: 'Ransomware pattern matched.',
  evidenceRefs: [],
  status: 'pending',
  assignee: null,
  sla: null,
  events: [],
  sourceWatchId: 'system-security-watch-floor',
  approvalRequired: true,
  summary: 'Isolate SALES-NAS.',
  recommendation: 'Isolate endpoint',
  ...overrides,
});

describe('InvestigationFlowDiagram', () => {
  it('renders the empty state when there are no investigation or proposal events', () => {
    render(<InvestigationFlowDiagram investigation={makeInvestigation()} proposals={[]} />);

    expect(screen.queryByTestId('pndInvestigationFlowTimeline')).not.toBeInTheDocument();
    expect(screen.getByText(/no timeline events recorded/i)).toBeInTheDocument();
  });

  it('merges investigation and proposal events into one chronologically-sorted flow', () => {
    const investigation = makeInvestigation({
      events: [
        makeEvent({ id: 'evt-2', timestamp: '2026-07-23T07:05:00Z', summary: 'Second event' }),
        makeEvent({ id: 'evt-1', timestamp: '2026-07-23T07:01:00Z', summary: 'First event' }),
      ],
    });
    const proposals = [
      makeProposal({
        events: [
          makeEvent({
            id: 'evt-3',
            timestamp: '2026-07-23T07:10:00Z',
            type: 'proposal_created',
            summary: 'Proposal drafted',
          }),
        ],
      }),
    ];

    render(<InvestigationFlowDiagram investigation={investigation} proposals={proposals} />);

    const rows = screen.getAllByText(/First event|Second event|Proposal drafted/);
    expect(rows.map((row) => row.textContent)).toEqual([
      'First event',
      'Second event',
      'Proposal drafted',
    ]);
  });

  it('tags investigation-sourced rows as Investigation and proposal-sourced rows by proposal type', () => {
    const investigation = makeInvestigation({
      events: [makeEvent({ id: 'evt-1', summary: 'Own event' })],
    });
    const proposals = [
      makeProposal({
        type: 'contain',
        events: [
          makeEvent({
            id: 'evt-2',
            timestamp: '2026-07-23T07:15:00Z',
            type: 'proposal_created',
            summary: 'Contain proposal drafted',
          }),
        ],
      }),
    ];

    render(<InvestigationFlowDiagram investigation={investigation} proposals={proposals} />);

    expect(screen.getByTestId('pndFlowEventSource-evt-1')).toHaveTextContent('Investigation');
    expect(screen.getByTestId('pndFlowEventSource-evt-2')).toHaveTextContent(/contain/i);
  });

  it('invokes onSelectProposal with the proposal id when a proposal-sourced row is clicked', async () => {
    const user = userEvent.setup();
    const onSelectProposal = jest.fn();
    const investigation = makeInvestigation({ events: [] });
    const proposals = [
      makeProposal({
        id: 'prop-abc',
        events: [
          makeEvent({
            id: 'evt-proposal',
            type: 'proposal_created',
            summary: 'Proposal drafted',
          }),
        ],
      }),
    ];

    render(
      <InvestigationFlowDiagram
        investigation={investigation}
        proposals={proposals}
        onSelectProposal={onSelectProposal}
      />
    );

    await user.click(screen.getByTestId('pndFlowEventSource-evt-proposal'));

    expect(onSelectProposal).toHaveBeenCalledWith('prop-abc');
  });

  it('does not attach a click handler to investigation-sourced rows even when onSelectProposal is provided', async () => {
    const user = userEvent.setup();
    const onSelectProposal = jest.fn();
    const investigation = makeInvestigation({
      events: [makeEvent({ id: 'evt-own', summary: 'Own event' })],
    });

    render(
      <InvestigationFlowDiagram
        investigation={investigation}
        proposals={[]}
        onSelectProposal={onSelectProposal}
      />
    );

    await user.click(screen.getByTestId('pndFlowEventSource-evt-own'));

    expect(onSelectProposal).not.toHaveBeenCalled();
  });

  it('marks the Decided stage current once a proposal has left the pending state', () => {
    const investigation = makeInvestigation({ pendingProposalCount: 0 });
    const proposals = [makeProposal({ status: 'escalated' })];

    render(<InvestigationFlowDiagram investigation={investigation} proposals={proposals} />);

    expect(screen.getByRole('button', { name: /current step 4: decided/i })).toBeInTheDocument();
  });

  it('marks the Proposed stage current while proposals exist but are still pending', () => {
    const investigation = makeInvestigation({ pendingProposalCount: 1 });
    const proposals = [makeProposal({ status: 'pending' })];

    render(<InvestigationFlowDiagram investigation={investigation} proposals={proposals} />);

    expect(screen.getByRole('button', { name: /current step 3: proposed/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /step 2: investigated is complete/i })
    ).toBeInTheDocument();
  });

  it('marks the Investigated stage current when no proposals exist yet', () => {
    const investigation = makeInvestigation({ pendingProposalCount: 0 });

    render(<InvestigationFlowDiagram investigation={investigation} proposals={[]} />);

    expect(
      screen.getByRole('button', { name: /current step 2: investigated/i })
    ).toBeInTheDocument();
  });

  it('renders the watch tier icon and watch id alongside the investigation title', () => {
    const investigation = makeInvestigation({
      watch_id: 'system-security-watch-floor',
      watch_tier: 'floor',
      title: 'Sales NAS ransomware — 1,431 files renamed .lkx in 4 minutes',
    });

    render(<InvestigationFlowDiagram investigation={investigation} proposals={[]} />);

    expect(screen.getByText('system-security-watch-floor')).toBeInTheDocument();
    expect(
      screen.getByText('Sales NAS ransomware — 1,431 files renamed .lkx in 4 minutes')
    ).toBeInTheDocument();
  });
});
