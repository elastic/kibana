/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import {
  useApproveProposal,
  useConversationProposals,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
} from '@kbn/proposals-plugin/public';
import { useCurrentUserProfile } from '@kbn/agentic-investigations-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ProposedActionsSlot } from './proposed_actions_slot';

jest.mock('@kbn/proposals-plugin/public', () => ({
  useConversationProposals: jest.fn(),
  useApproveProposal: jest.fn(),
  useDismissProposal: jest.fn(),
  useIsApprovingProposal: jest.fn(),
  useIsDecliningProposal: jest.fn(),
}));

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  useCurrentUserProfile: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseConversationProposals = useConversationProposals as jest.MockedFunction<
  typeof useConversationProposals
>;
const mockUseApproveProposal = useApproveProposal as jest.MockedFunction<typeof useApproveProposal>;
const mockUseDismissProposal = useDismissProposal as jest.MockedFunction<typeof useDismissProposal>;
const mockUseIsApprovingProposal = useIsApprovingProposal as jest.MockedFunction<
  typeof useIsApprovingProposal
>;
const mockUseIsDecliningProposal = useIsDecliningProposal as jest.MockedFunction<
  typeof useIsDecliningProposal
>;
const mockUseCurrentUserProfile = useCurrentUserProfile as jest.MockedFunction<
  typeof useCurrentUserProfile
>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const approveMutateAsync = jest.fn().mockResolvedValue(undefined);
const dismissMutateAsync = jest.fn().mockResolvedValue(undefined);
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

/**
 * Stands in for one page of `useConversationProposals`'s real (now paged) shape — every test
 * here cares about the rows it renders, not the pagination machinery, so this fakes a single,
 * complete page unless a test overrides it (the "Show more" tests do, explicitly).
 */
const mockConversationProposalsPage = (
  proposals: ProposalWithMetadata[],
  overrides: Partial<ReturnType<typeof useConversationProposals>> = {}
) =>
  mockUseConversationProposals.mockReturnValue({
    data: { pages: [{ proposals, total: proposals.length }], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useConversationProposals>);

describe('ProposedActionsSlot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    approveMutateAsync.mockResolvedValue(undefined);
    dismissMutateAsync.mockResolvedValue(undefined);
    mockUseApproveProposal.mockReturnValue({
      mutateAsync: approveMutateAsync,
    } as unknown as ReturnType<typeof useApproveProposal>);
    mockUseDismissProposal.mockReturnValue({
      mutateAsync: dismissMutateAsync,
    } as unknown as ReturnType<typeof useDismissProposal>);
    mockUseIsApprovingProposal.mockReturnValue(false);
    mockUseIsDecliningProposal.mockReturnValue(false);
    mockUseCurrentUserProfile.mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof useCurrentUserProfile>);
    mockUseKibana.mockReturnValue({
      services: { notifications: { toasts: { addDanger } } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('renders a proposed-action button for each proposal, decided or not', () => {
    mockConversationProposalsPage([mockProposal, decidedProposal]);

    renderSlot();

    expect(screen.getByText('Isolate cfo-mbp-14 — host isolation')).toBeInTheDocument();
    expect(screen.getByText('After-hours domain admin logins — fin-dc-01')).toBeInTheDocument();
  });

  it('renders a decided proposal as a closed record, but still opens a read-only modal for it', () => {
    mockConversationProposalsPage([decidedProposal]);

    renderSlot();

    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText(/Bonnie Fishel/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('investigationFlyoutProposedAction-proposal-2'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Applied')).toBeInTheDocument();
    expect(
      screen.queryByTestId('investigationFlyoutProposedAction-proposal-2-modal-confirm')
    ).not.toBeInTheDocument();
    expect(approveMutateAsync).not.toHaveBeenCalled();
  });

  it('shows an empty state when this conversation has no proposals', () => {
    mockConversationProposalsPage([]);

    renderSlot();

    expect(screen.getByText('No proposed actions for this investigation.')).toBeInTheDocument();
  });

  it('shows a load-error state rather than claiming there are no proposed actions', () => {
    mockUseConversationProposals.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useConversationProposals>);

    renderSlot();

    expect(
      screen.getByText('Unable to load proposed actions. Try refreshing the page.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No proposed actions for this investigation.')
    ).not.toBeInTheDocument();
  });

  it('approves with the proposal id and its own action input', () => {
    mockConversationProposalsPage([mockProposal]);

    renderSlot();
    fireEvent.click(screen.getByTestId('investigationFlyoutProposedAction-proposal-1'));
    fireEvent.click(
      screen.getByTestId('investigationFlyoutProposedAction-proposal-1-modal-confirm')
    );

    expect(approveMutateAsync).toHaveBeenCalledWith({
      id: 'proposal-1',
      body: { actionInput: undefined },
    });
  });

  it('shows Applying on the row and its modal, scoped to the proposal useIsApprovingProposal reports', () => {
    mockConversationProposalsPage([mockProposal]);
    mockUseIsApprovingProposal.mockImplementation((id) => id === 'proposal-1');

    renderSlot();

    const row = screen.getByTestId('investigationFlyoutProposedAction-proposal-1');
    expect(within(row).getByText('Applying')).toBeInTheDocument();

    fireEvent.click(row);
    // Approving only resumes the gate workflow — the action it starts still runs afterward, so
    // being in flight must not yet claim "Applied". Only a refetched, real decision can.
    expect(within(screen.getByRole('dialog')).getAllByText('Applying').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('dialog')).queryByText('Applied')).not.toBeInTheDocument();
  });

  it('surfaces a toast and keeps the modal open for retry when approving fails', async () => {
    approveMutateAsync.mockRejectedValueOnce(new Error('boom'));
    mockConversationProposalsPage([mockProposal]);

    renderSlot();
    fireEvent.click(screen.getByTestId('investigationFlyoutProposedAction-proposal-1'));
    fireEvent.click(
      screen.getByTestId('investigationFlyoutProposedAction-proposal-1-modal-confirm')
    );

    await waitFor(() => expect(addDanger).toHaveBeenCalledTimes(1));
    expect(
      screen.getByTestId('investigationFlyoutProposedAction-proposal-1-modal-confirm')
    ).toBeInTheDocument();
  });

  it('opens the dismiss modal instead of dismissing directly', () => {
    mockConversationProposalsPage([mockProposal]);

    renderSlot();
    fireEvent.click(screen.getByTestId('investigationFlyoutProposedAction-proposal-1'));
    fireEvent.click(
      screen.getByTestId('investigationFlyoutProposedAction-proposal-1-modal-dismiss')
    );

    expect(screen.getByText('Close the investigation?')).toBeInTheDocument();
    expect(dismissMutateAsync).not.toHaveBeenCalled();
  });

  it('offers Show more when the conversation has more proposals than the loaded page, and fetches the next one', () => {
    const fetchNextPage = jest.fn();
    mockConversationProposalsPage([mockProposal], {
      hasNextPage: true,
      fetchNextPage,
    });

    renderSlot();
    const showMore = screen.getByTestId('investigationFlyoutProposedActionsShowMore');
    fireEvent.click(showMore);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('omits Show more once every proposal in the conversation is loaded', () => {
    mockConversationProposalsPage([mockProposal]);

    renderSlot();

    expect(
      screen.queryByTestId('investigationFlyoutProposedActionsShowMore')
    ).not.toBeInTheDocument();
  });
});
