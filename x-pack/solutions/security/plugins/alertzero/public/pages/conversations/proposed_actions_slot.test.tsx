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
  useDismissProposal,
  usePendingProposals,
} from '@kbn/proposals-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ProposedActionsSlot } from './proposed_actions_slot';

jest.mock('@kbn/proposals-plugin/public', () => ({
  usePendingProposals: jest.fn(),
  useApproveProposal: jest.fn(),
  useDismissProposal: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUsePendingProposals = usePendingProposals as jest.MockedFunction<
  typeof usePendingProposals
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

  it('renders a proposed-action button for each pending proposal', () => {
    mockUsePendingProposals.mockReturnValue({
      data: { proposals: [mockProposal], total: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingProposals>);

    renderSlot();

    expect(screen.getByText('Isolate cfo-mbp-14 — host isolation')).toBeInTheDocument();
  });

  it('shows an empty state when there are no pending proposals', () => {
    mockUsePendingProposals.mockReturnValue({
      data: { proposals: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingProposals>);

    renderSlot();

    expect(screen.getByText('No proposed actions for this investigation.')).toBeInTheDocument();
  });

  it('approves with the proposal id and its own action input', () => {
    mockUsePendingProposals.mockReturnValue({
      data: { proposals: [mockProposal], total: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingProposals>);

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
    mockUsePendingProposals.mockReturnValue({
      data: { proposals: [mockProposal], total: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingProposals>);

    renderSlot();
    fireEvent.click(screen.getByTestId('investigationFlyoutProposedAction-proposal-1'));
    fireEvent.click(
      screen.getByTestId('investigationFlyoutProposedAction-proposal-1-modal-dismiss')
    );

    expect(screen.getByText('Close the investigation?')).toBeInTheDocument();
    expect(dismissMutate).not.toHaveBeenCalled();
  });
});
