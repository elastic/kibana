/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';
import {
  useApproveProposal,
  useDismissProposal,
  usePendingProposals,
} from '../../hooks/use_proposals_api';
import { PendingProposalsPanel } from './pending_proposals_panel';

jest.mock('../../hooks/use_proposals_api');

const mockUsePendingProposals = usePendingProposals as jest.Mock;
const mockUseApproveProposal = useApproveProposal as jest.Mock;
const mockUseDismissProposal = useDismissProposal as jest.Mock;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

const proposal = (overrides: Partial<ProposalWithMetadata> = {}): ProposalWithMetadata =>
  ({
    id: 'proposal-1',
    spaceId: 'default',
    conversationId: 'conv-1',
    comment: 'Tune the noisy rule',
    actionWorkflowId: 'system-alertzero-action-create-rule',
    actionInput: { name: 'Suspicious PowerShell' },
    status: 'pending',
    impact: 'low',
    confidence: 'medium',
    category: 'tune',
    origin: 'worker',
    createdAt: '2026-09-01T00:00:00.000Z',
    expired: false,
    action: { name: 'Create detection rule', category: 'tune' },
    ...overrides,
  }) as ProposalWithMetadata;

const setup = ({
  proposals = [proposal()],
  isLoading = false,
  error = null,
}: {
  proposals?: ProposalWithMetadata[];
  isLoading?: boolean;
  error?: unknown;
} = {}) => {
  const approveMutate = jest.fn();
  const dismissMutate = jest.fn();

  mockUsePendingProposals.mockReturnValue({
    data: { proposals, total: proposals.length },
    isLoading,
    error,
  });
  mockUseApproveProposal.mockReturnValue({
    mutate: approveMutate,
    isLoading: false,
    isError: false,
  });
  mockUseDismissProposal.mockReturnValue({
    mutate: dismissMutate,
    isLoading: false,
    isError: false,
  });

  return { approveMutate, dismissMutate };
};

describe('PendingProposalsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the action name resolved from the catalog', () => {
    setup();

    render(<PendingProposalsPanel />, { wrapper });

    expect(screen.getByText('Create detection rule')).toBeInTheDocument();
    expect(screen.getByText('Tune the noisy rule')).toBeInTheDocument();
  });

  it('should submit the action input it rendered, so a stale approval can be refused', async () => {
    const { approveMutate } = setup();

    render(<PendingProposalsPanel />, { wrapper });
    fireEvent.click(screen.getByTestId('alertZeroProposalApprove'));
    await waitFor(() =>
      expect(screen.getByTestId('alertZeroApproveProposalModal')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('Approve and run'));

    expect(approveMutate).toHaveBeenCalledWith(
      { id: 'proposal-1', body: { actionInput: { name: 'Suspicious PowerShell' } } },
      expect.anything()
    );
  });

  it('should require a structured reason and rationale before dismissing', async () => {
    const { dismissMutate } = setup();

    render(<PendingProposalsPanel />, { wrapper });
    fireEvent.click(screen.getByTestId('alertZeroProposalDismiss'));
    await waitFor(() =>
      expect(screen.getByTestId('alertZeroDismissReasonSelect')).toBeInTheDocument()
    );

    // The shared modal keeps the primary action disabled until a rationale is typed.
    const dismissButtons = screen.getAllByText('Dismiss');
    const modalConfirm = dismissButtons[dismissButtons.length - 1];
    fireEvent.click(modalConfirm);
    expect(dismissMutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('alertZeroDismissReasonSelect'), {
      target: { value: 'duplicate' },
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Same as yesterday' } });
    fireEvent.click(modalConfirm);

    expect(dismissMutate).toHaveBeenCalledWith(
      {
        id: 'proposal-1',
        body: { dismissReason: 'duplicate', rationale: 'Same as yesterday' },
      },
      expect.anything()
    );
  });

  it('should disable approval for an expired proposal', () => {
    setup({ proposals: [proposal({ expired: true })] });

    render(<PendingProposalsPanel />, { wrapper });

    expect(screen.getByTestId('alertZeroProposalApprove')).toBeDisabled();
    expect(screen.getByTestId('alertZeroProposalExpired')).toBeInTheDocument();
  });

  it('should explain that a proposal without an action is carried out by the analyst', () => {
    setup({
      proposals: [
        proposal({ actionWorkflowId: undefined, actionInput: undefined, action: undefined }),
      ],
    });

    render(<PendingProposalsPanel />, { wrapper });

    expect(
      screen.getAllByText('No automated action — carry this out yourself, then approve').length
    ).toBeGreaterThan(0);
  });

  it('should render nothing when empty and asked to hide', () => {
    setup({ proposals: [] });

    const { container } = render(<PendingProposalsPanel hideWhenEmpty />, { wrapper });

    expect(container).toBeEmptyDOMElement();
  });

  it('should surface a load failure instead of an empty queue', () => {
    setup({ proposals: [], error: new Error('boom') });

    render(<PendingProposalsPanel />, { wrapper });

    expect(screen.getByText('Unable to load proposals')).toBeInTheDocument();
  });
});
