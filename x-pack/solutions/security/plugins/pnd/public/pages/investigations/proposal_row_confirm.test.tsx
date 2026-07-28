/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import type { Proposal } from '@kbn/pnd-common';
import { ProposalRow } from './investigation_detail';

const mockPost = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: { post: (...args: unknown[]) => mockPost(...args) },
      notifications: {
        toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
      },
    },
  }),
}));

const baseProposal = (overrides: Partial<Proposal> = {}): Proposal =>
  ({
    id: 'proposal-1',
    template_id: 'proposal',
    parentConversationId: 'inv-1',
    type: 'contain',
    confidence: 0.9,
    reasoning: 'Lateral movement observed',
    evidenceRefs: [],
    status: 'pending',
    assignee: null,
    sla: null,
    events: [],
    sourceWatchId: 'watch-floor',
    approvalRequired: true,
    summary: 'Isolate endpoint',
    recommendation: 'Isolate FIN-WS-04',
    ...overrides,
  } as unknown as Proposal);

const renderRow = (proposal: Proposal, onStatusChange = jest.fn()) => {
  const history = createMemoryHistory({ initialEntries: ['/investigations/inv-1'] });
  render(
    <Router history={history}>
      <ProposalRow proposal={proposal} investigationId="inv-1" onStatusChange={onStatusChange} />
    </Router>
  );
  return { onStatusChange };
};

/**
 * Regression coverage for the "confirm before consequential action" fix: every
 * proposal decision button (approve/isolate, modify, escalate, defer, dismiss)
 * used to call the API directly on click. A misclick — trivial on a dense
 * button row — could isolate a live endpoint with no way back except a second,
 * separate response action. Each button now opens an EuiConfirmModal first;
 * the API call only fires from the modal's own confirm button.
 */
describe('ProposalRow decision confirmation', () => {
  beforeEach(() => {
    mockPost.mockReset().mockResolvedValue({});
    mockAddSuccess.mockReset();
    mockAddError.mockReset();
  });

  it('does not call the API on the initial button click — only opens a confirmation modal', () => {
    renderRow(baseProposal());
    fireEvent.click(screen.getByTestId('pndProposalApprove'));

    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.getByTestId('pndProposalConfirmModal-accept')).toBeInTheDocument();
  });

  it('names the specific consequence for an endpoint-isolating (contain) proposal', () => {
    renderRow(baseProposal({ type: 'contain' }));
    fireEvent.click(screen.getByTestId('pndProposalApprove'));

    const modal = screen.getByTestId('pndProposalConfirmModal-accept');
    expect(modal).toHaveTextContent('Isolate endpoint and approve this proposal?');
    expect(modal).toHaveTextContent(/isolates the affected endpoint from the network/);
    expect(screen.getByText('Isolate & approve')).toBeInTheDocument();
  });

  it('only calls the API after the modal confirm button is clicked', async () => {
    renderRow(baseProposal({ type: 'contain' }));
    fireEvent.click(screen.getByTestId('pndProposalApprove'));
    expect(mockPost).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith(
      '/internal/pnd/investigations/inv-1/proposals/proposal-1/accept',
      expect.objectContaining({ body: expect.any(String) })
    );
  });

  it('cancels without calling the API and closes the modal', () => {
    renderRow(baseProposal());
    fireEvent.click(screen.getByTestId('pndProposalApprove'));
    expect(screen.getByTestId('pndProposalConfirmModal-accept')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.queryByTestId('pndProposalConfirmModal-accept')).not.toBeInTheDocument();
  });

  it('gates escalate behind its own confirmation before triggering the Watch workflow', () => {
    renderRow(baseProposal({ type: 'contain' }));
    fireEvent.click(screen.getByTestId('pndProposalEscalate'));

    expect(mockPost).not.toHaveBeenCalled();
    const modal = screen.getByTestId('pndProposalConfirmModal-escalate');
    expect(modal).toHaveTextContent('Escalate this proposal to a case?');
  });

  it('gates defer behind a confirmation naming the concrete effect', () => {
    renderRow(baseProposal());
    fireEvent.click(screen.getByTestId('pndProposalDefer'));

    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.getByTestId('pndProposalConfirmModal-defer')).toHaveTextContent(
      'Defer this decision?'
    );
  });

  it('gates modify behind a confirmation', () => {
    renderRow(baseProposal());
    fireEvent.click(screen.getByTestId('pndProposalModify'));

    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.getByTestId('pndProposalConfirmModal-modify')).toHaveTextContent(
      'Modify this proposal?'
    );
  });

  it('surfaces the chosen dismissal reason in the confirmation title before calling the API', async () => {
    renderRow(baseProposal());
    fireEvent.click(screen.getByTestId('pndProposalDismiss'));
    fireEvent.click(screen.getByTestId('pndDismissReason-duplicate'));

    expect(mockPost).not.toHaveBeenCalled();
    const modal = screen.getByTestId('pndProposalConfirmModal-dismiss');
    expect(modal).toHaveTextContent('Dismiss this proposal as "Duplicate"?');

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith(
      '/internal/pnd/investigations/inv-1/proposals/proposal-1/reject',
      expect.objectContaining({
        body: JSON.stringify({ dismissalReason: 'duplicate' }),
      })
    );
  });
});
