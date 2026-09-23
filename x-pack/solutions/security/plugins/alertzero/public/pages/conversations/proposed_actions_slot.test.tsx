/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import {
  useApproveProposal,
  useConversationProposals,
  useDismissProposal,
} from '@kbn/proposals-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ProposedActionsSlot } from './proposed_actions_slot';

jest.mock('@kbn/proposals-plugin/public', () => ({
  useConversationProposals: jest.fn(),
  useApproveProposal: jest.fn(),
  useDismissProposal: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseConversationProposals = useConversationProposals as jest.MockedFunction<
  typeof useConversationProposals
>;
const mockUseApproveProposal = useApproveProposal as jest.MockedFunction<typeof useApproveProposal>;
const mockUseDismissProposal = useDismissProposal as jest.MockedFunction<typeof useDismissProposal>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const approveMutate = jest.fn();
const dismissMutate = jest.fn();
const addDanger = jest.fn();

const mockProposal: ProposalWithMetadata = {
  id: 'proposal-1',
  spaceId: 'default',
  conversationId: 'conversation-1',
  comment: 'Isolate the host to cut off the replayed session.',
  status: 'pending',
  impact: 'critical',
  confidence: 'high',
  origin: 'worker',
  createdAt: '2024-01-01T00:00:00Z',
  expired: false,
  action: { name: 'Isolate cfo-mbp-14 — host isolation', category: 'Response action' },
};

const decidedProposal: ProposalWithMetadata = {
  ...mockProposal,
  id: 'proposal-2',
  status: 'succeeded',
  decision: 'approved',
  decidedBy: { fullName: 'Bonnie Fishel', username: 'bfishel', email: null },
  decidedAt: '2024-01-01T17:20:00.000Z',
  action: { name: 'After-hours domain admin logins — fin-dc-01', category: 'Response action' },
};

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const renderSlot = () =>
  render(<ProposedActionsSlot conversationId="conversation-1" />, { wrapper });

describe('ProposedActionsSlot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApproveProposal.mockReturnValue({ mutate: approveMutate } as unknown as ReturnType<
      typeof useApproveProposal
    >);
    mockUseDismissProposal.mockReturnValue({ mutate: dismissMutate } as unknown as ReturnType<
      typeof useDismissProposal
    >);
    mockUseKibana.mockReturnValue({
      services: { notifications: { toasts: { addDanger } } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('renders a proposed-action button for each proposal, decided or not', () => {
    mockUseConversationProposals.mockReturnValue({
      data: { proposals: [mockProposal, decidedProposal], total: 2 },
      isLoading: false,
    } as unknown as ReturnType<typeof useConversationProposals>);

    renderSlot();

    expect(screen.getByText('Isolate cfo-mbp-14 — host isolation')).toBeInTheDocument();
    expect(screen.getByText('After-hours domain admin logins — fin-dc-01')).toBeInTheDocument();
  });

  it('renders a decided proposal as a closed, non-interactive record rather than dropping it', () => {
    mockUseConversationProposals.mockReturnValue({
      data: { proposals: [decidedProposal], total: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof useConversationProposals>);

    renderSlot();

    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText(/Bonnie Fishel/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('investigationFlyoutProposedAction-proposal-2'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(approveMutate).not.toHaveBeenCalled();
  });

  it('shows an empty state when this conversation has no proposals', () => {
    mockUseConversationProposals.mockReturnValue({
      data: { proposals: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useConversationProposals>);

    renderSlot();

    expect(screen.getByText('No proposed actions for this investigation.')).toBeInTheDocument();
  });

  it('approves with the proposal id and its own action input', () => {
    mockUseConversationProposals.mockReturnValue({
      data: { proposals: [mockProposal], total: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof useConversationProposals>);

    renderSlot();
    fireEvent.click(screen.getByTestId('investigationFlyoutProposedAction-proposal-1'));
    fireEvent.click(
      screen.getByTestId('investigationFlyoutProposedAction-proposal-1-modal-confirm')
    );

    expect(approveMutate).toHaveBeenCalledWith(
      { id: 'proposal-1', body: { actionInput: undefined } },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it('opens the dismiss modal instead of dismissing directly', () => {
    mockUseConversationProposals.mockReturnValue({
      data: { proposals: [mockProposal], total: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof useConversationProposals>);

    renderSlot();
    fireEvent.click(screen.getByTestId('investigationFlyoutProposedAction-proposal-1'));
    fireEvent.click(
      screen.getByTestId('investigationFlyoutProposedAction-proposal-1-modal-dismiss')
    );

    expect(screen.getByText('Close the investigation?')).toBeInTheDocument();
    expect(dismissMutate).not.toHaveBeenCalled();
  });
});
