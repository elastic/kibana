/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { useApproveProposal, useDismissProposal } from '@kbn/agentic-investigations-plugin/public';
import { useProposalsList } from '../../hooks/use_proposals_api';
import { useInvestigation } from '../../hooks/use_investigations_api';
import type { ProposalItem } from '../../../common/proposals/list';
import { ConversationsPage } from './conversations_page';

// Only the mutations are stubbed: the module also exports DISMISS_REASON_OPTIONS, which
// the dismiss modal's select needs for real.
jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-plugin/public'),
  useApproveProposal: jest.fn(),
  useDismissProposal: jest.fn(),
}));
jest.mock('../../hooks/use_proposals_api');
jest.mock('../../hooks/use_investigations_api');
jest.mock('../../components/proposals_trend_chart', () => ({
  ProposalsTrendChartRow: () => null,
}));

const mockUseProposalsList = useProposalsList as jest.Mock;
const mockUseApproveProposal = useApproveProposal as jest.Mock;
const mockUseDismissProposal = useDismissProposal as jest.Mock;
const mockUseInvestigation = useInvestigation as jest.Mock;

// Cards are proposals; the flyout addresses the investigation they belong to, so the URL
// carries `conversationId`, not the proposal id.
const proposal: ProposalItem = {
  id: 'prop-1',
  spaceId: 'default',
  conversationId: 'inv-1',
  conversationTitle: 'Impossible travel — exec account',
  comment: 'MFA satisfied from two countries in 40 minutes.',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  category: 'investigate',
  origin: 'worker',
  createdAt: '2024-01-01T00:00:00Z',
  expired: false,
};

// Deliberately titled differently from the proposal card, so assertions can tell whether
// the flyout rendered the investigation or just re-rendered the proposal.
const investigation = {
  id: 'inv-1',
  template_id: 'investigation' as const,
  title: 'Impossible travel — full investigation',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  pendingProposalCount: 1,
  events: [],
};

const renderPage = (initialEntry: string) => {
  const core = coreMock.createStart();
  const history: MemoryHistory = createMemoryHistory({ initialEntries: [initialEntry] });

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <Router history={history}>
            <ConversationsPage />
          </Router>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { core, history };
};

const approveMutate = jest.fn();
const dismissMutate = jest.fn();

beforeEach(() => {
  mockUseApproveProposal.mockReturnValue({ mutate: approveMutate });
  mockUseDismissProposal.mockReturnValue({ mutate: dismissMutate });
  mockUseInvestigation.mockImplementation((id?: string) => ({
    data: id === investigation.id ? { investigation } : undefined,
    isLoading: false,
    error: undefined,
  }));
});

describe('ConversationsPage details flyout URL state', () => {
  beforeEach(() => {
    mockUseProposalsList.mockReturnValue({
      data: { groups: { investigate: [proposal] }, total: 1, truncated: false },
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('opens the flyout for a conversation named in the URL', async () => {
    renderPage('/?selectedConversationId=inv-1&show=overview');

    const flyout = await screen.findByTestId('investigationDetailsFlyout');

    expect(within(flyout).getByText('Impossible travel — full investigation')).toBeInTheDocument();
  });

  it('opens the linked investigation when a proposal card is clicked', async () => {
    const { history } = renderPage('/');

    fireEvent.click(screen.getByRole('button', { name: 'Impossible travel — exec account' }));

    // Cards are keyed by proposal id, so the click has to resolve through the proposal's
    // conversation: the URL must carry `inv-1`, never the `prop-1` that was clicked.
    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=overview');

    const flyout = await screen.findByTestId('investigationDetailsFlyout');
    expect(within(flyout).getByText('Impossible travel — full investigation')).toBeInTheDocument();
  });

  it('shows the investigation in the flyout rather than repeating the proposal', async () => {
    renderPage('/?selectedConversationId=inv-1&show=overview');

    const flyout = await screen.findByTestId('investigationDetailsFlyout');

    // A proposal has no timeline, watch or assignee, so rendering the adapted card here
    // would show the card again with every detail field blank.
    expect(within(flyout).queryByText('Impossible travel — exec account')).not.toBeInTheDocument();
    expect(mockUseInvestigation).toHaveBeenCalledWith('inv-1');
  });

  it('keeps the flyout closed with no conversation in the URL', () => {
    renderPage('/');

    expect(screen.queryByTestId('investigationDetailsFlyout')).not.toBeInTheDocument();
  });

  it('ignores an unrecognized tab, leaving the URL untouched', () => {
    const { core, history } = renderPage('/?selectedConversationId=inv-1&show=nonsense');

    expect(screen.queryByTestId('investigationDetailsFlyout')).not.toBeInTheDocument();
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=nonsense');
  });

  it('completes a bare conversation id and opens the flyout', async () => {
    const { history } = renderPage('/?selectedConversationId=inv-1');

    expect(await screen.findByTestId('investigationDetailsFlyout')).toBeInTheDocument();
    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=overview');
  });

  it('shows skeleton content until the investigation resolves', () => {
    // The flyout's content is the investigation, so it skeletons on that query, not on
    // the proposals list that populates the queue behind it.
    mockUseInvestigation.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

    renderPage('/?selectedConversationId=inv-1&show=overview');

    expect(screen.getByTestId('investigationDetailsFlyoutBodySkeleton')).toBeInTheDocument();
  });

  it('closes the flyout and warns when no investigation matches the id', async () => {
    const { core, history } = renderPage('/?selectedConversationId=missing&show=overview');

    await waitFor(() => {
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    });
    expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith(
      expect.stringContaining('missing')
    );
    expect(history.location.search).toBe('');
    expect(screen.queryByTestId('investigationDetailsFlyout')).not.toBeInTheDocument();
  });

  it('leaves no history entry pointing at the missing conversation', async () => {
    const { core, history } = renderPage('/?selectedConversationId=missing&show=overview');

    await waitFor(() => {
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    });

    // Going back must not land on the bad id and warn all over again.
    expect(history.entries.map((entry) => entry.search)).not.toContain(
      '?selectedConversationId=missing&show=overview'
    );
  });

  it('does not warn while the investigation is still loading', () => {
    mockUseInvestigation.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

    const { core } = renderPage('/?selectedConversationId=missing&show=overview');

    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });
});

describe('ConversationsPage decisions', () => {
  const actionProposal: ProposalItem = {
    ...proposal,
    id: 'prop-1',
    conversationTitle: 'Impossible travel — exec account',
    category: 'respond',
    actionWorkflowId: 'system-alertzero-action-revoke-sessions',
    actionInput: { user: 'cfo@corp' },
    action: { name: 'Revoke sessions' },
  };

  beforeEach(() => {
    mockUseProposalsList.mockReturnValue({
      data: { groups: { respond: [actionProposal] }, total: 1, truncated: false },
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // The modal's confirm button carries the action name, same as the card's call to
  // action, so assertions have to be scoped to the dialog.
  const approvalDialog = () => within(screen.getByRole('dialog'));

  const openApproval = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Revoke sessions' }));
  };

  it('submits the action input the analyst was shown, so the API can refuse a stale approval', () => {
    renderPage('/');
    openApproval();

    fireEvent.click(approvalDialog().getByRole('button', { name: 'Revoke sessions' }));

    expect(approveMutate).toHaveBeenCalledWith(
      { id: 'prop-1', body: { actionInput: { user: 'cfo@corp' } } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('keeps the approval modal open until the mutation succeeds', () => {
    renderPage('/');
    openApproval();
    fireEvent.click(approvalDialog().getByRole('button', { name: 'Revoke sessions' }));

    // A refusal — expired deadline, someone decided first — must not close the modal as
    // though the decision had landed. onSuccess is the only thing that closes it.
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const [, handlers] = approveMutate.mock.calls[0];
    act(() => handlers.onSuccess());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismisses with the reason the analyst chose rather than a default', () => {
    renderPage('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));
    fireEvent.click(screen.getByText('Dismiss'));

    // The actions popover is also a dialog, so the modal has to be named.
    const dialog = within(screen.getByRole('dialog', { name: 'Action modal' }));
    fireEvent.change(screen.getByTestId('alertZeroDismissReasonSelect'), {
      target: { value: 'already_handled' },
    });
    // Rationale is required — the confirm button stays disabled without it.
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Handled out of band.' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Dismiss' }));

    expect(dismissMutate).toHaveBeenCalledWith(
      {
        id: 'prop-1',
        body: { dismissReason: 'already_handled', rationale: 'Handled out of band.' },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('offers no decision on a proposal that was already decided', () => {
    mockUseProposalsList.mockReturnValue({
      data: {
        groups: { closed: [{ ...actionProposal, decidedAt: '2024-01-02T00:00:00Z' }] },
        total: 1,
        truncated: false,
      },
      isLoading: false,
      error: undefined,
    });

    renderPage('/');

    expect(screen.queryByRole('button', { name: 'Revoke sessions' })).not.toBeInTheDocument();
  });

  it('counts only undecided proposals as work needing attention', () => {
    mockUseProposalsList.mockReturnValue({
      data: {
        groups: {
          respond: [actionProposal],
          closed: [{ ...actionProposal, id: 'prop-2', decidedAt: '2024-01-02T00:00:00Z' }],
        },
        total: 2,
        truncated: false,
      },
      isLoading: false,
      error: undefined,
    });

    renderPage('/');

    expect(screen.getByText('1 action needs you')).toBeInTheDocument();
  });

  it('reads as an empty queue when the window holds only decisions already made', () => {
    mockUseProposalsList.mockReturnValue({
      data: {
        groups: { closed: [{ ...actionProposal, decidedAt: '2024-01-02T00:00:00Z' }] },
        total: 1,
        truncated: false,
      },
      isLoading: false,
      error: undefined,
    });

    renderPage('/');

    // Closed rows are still rendered, but they are not work: the header must not read
    // "0 actions need you" beside them.
    expect(screen.getByText('No events found')).toBeInTheDocument();
  });
});
