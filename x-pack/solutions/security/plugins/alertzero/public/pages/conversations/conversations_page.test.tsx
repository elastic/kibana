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
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { useApproveProposal, useDismissProposal } from '@kbn/agentic-investigations-plugin/public';
import { useProposalsList } from '../../hooks/use_proposals_api';
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
jest.mock('../../components/proposals_trend_chart', () => ({
  ProposalsTrendChartRow: () => null,
}));

const mockUseProposalsList = useProposalsList as jest.Mock;
const mockUseApproveProposal = useApproveProposal as jest.Mock;
const mockUseDismissProposal = useDismissProposal as jest.Mock;

// Cards are proposals; the flyout and the chat both address the conversation they belong to, so
// each carries `conversationId` and its agent, never the proposal id.
const proposal: ProposalItem = {
  id: 'prop-1',
  spaceId: 'default',
  conversationId: 'inv-1',
  conversationTitle: 'Impossible travel — exec account',
  conversationAgentId: 'elastic-ai-agent',
  comment: 'MFA satisfied from two countries in 40 minutes.',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  category: 'investigate',
  origin: 'worker',
  createdAt: '2024-01-01T00:00:00Z',
  expired: false,
};

const renderPage = (initialEntry: string) => {
  const core = coreMock.createStart();
  // The real service returns a URL; the mock returns undefined, which would silently drop the
  // chat control's href and make the link assertions vacuous.
  core.application.getUrlForApp.mockImplementation(
    (appId, options) => `/app/${appId}${options?.path ?? ''}`
  );
  const agentBuilder = agentBuilderMocks.createStart();
  const closeFlyout = jest.fn();
  (agentBuilder.openConversationDetails as jest.Mock).mockResolvedValue(closeFlyout);
  const history: MemoryHistory = createMemoryHistory({ initialEntries: [initialEntry] });

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...core, agentBuilder }}>
          <Router history={history}>
            <ConversationsPage />
          </Router>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { core, agentBuilder, closeFlyout, history };
};

const approveMutate = jest.fn();
const dismissMutate = jest.fn();

beforeEach(() => {
  mockUseApproveProposal.mockReturnValue({ mutate: approveMutate });
  mockUseDismissProposal.mockReturnValue({ mutate: dismissMutate });
});

describe('ConversationsPage details flyout', () => {
  beforeEach(() => {
    mockUseProposalsList.mockReturnValue({
      data: { groups: { investigate: [proposal] }, total: 1, truncated: false },
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("opens Agent Builder's flyout for a conversation named in the URL", async () => {
    const { agentBuilder } = renderPage('/?selectedConversationId=inv-1');

    // An investigation is a templated conversation, so Agent Builder owns the flyout: it loads the
    // conversation and renders the slots this solution registered. Nothing here fetches it.
    await waitFor(() => {
      expect(agentBuilder.openConversationDetails).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'inv-1' })
      );
    });
  });

  it('opens nothing with no conversation in the URL', () => {
    const { agentBuilder } = renderPage('/');

    expect(agentBuilder.openConversationDetails).not.toHaveBeenCalled();
  });

  it("puts the card's conversation in the URL rather than the proposal id", async () => {
    const { agentBuilder, history } = renderPage('/');

    fireEvent.click(screen.getByRole('button', { name: 'Impossible travel — exec account' }));

    // Cards are keyed by proposal id, so the click has to resolve through the proposal's
    // conversation: the URL must carry `inv-1`, never the `prop-1` that was clicked.
    expect(history.location.search).toBe('?selectedConversationId=inv-1');
    await waitFor(() => {
      expect(agentBuilder.openConversationDetails).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'inv-1' })
      );
    });
  });

  it('closes the flyout it opened once the conversation leaves the URL', async () => {
    const { closeFlyout, history } = renderPage('/?selectedConversationId=inv-1');
    await waitFor(() => expect(closeFlyout).not.toHaveBeenCalled());

    act(() => history.push('/'));

    // The URL is the single source of truth, so clearing it has to take the flyout with it.
    await waitFor(() => expect(closeFlyout).toHaveBeenCalled());
  });

  it('clears the URL when the analyst dismisses the flyout', async () => {
    const { agentBuilder, history } = renderPage('/?selectedConversationId=inv-1');
    await waitFor(() => expect(agentBuilder.openConversationDetails).toHaveBeenCalled());

    const { onClose } = (agentBuilder.openConversationDetails as jest.Mock).mock.calls[0][0];
    act(() => onClose());

    // Otherwise the id would linger and reopen the flyout on the next render.
    expect(history.location.search).toBe('');
  });

  it('marks the cards of the open conversation, not just the clicked one', async () => {
    const sibling: ProposalItem = { ...proposal, id: 'prop-2', comment: 'Second proposal.' };
    mockUseProposalsList.mockReturnValue({
      data: { groups: { investigate: [proposal, sibling] }, total: 2, truncated: false },
      isLoading: false,
      error: undefined,
    });

    renderPage('/?selectedConversationId=inv-1');

    // Both rows belong to the conversation the flyout is showing.
    const cards = screen.getAllByRole('button', { name: 'Impossible travel — exec account' });
    expect(cards).toHaveLength(2);
    cards.forEach((card) => expect(card).toHaveAttribute('aria-current', 'true'));
  });

  it('stops marking the card as current once the conversation leaves the URL', async () => {
    const { history } = renderPage('/');
    const card = screen.getByRole('button', { name: 'Impossible travel — exec account' });

    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-current', 'true');

    act(() => history.push('/'));

    // A card left marked current with nothing open announces a selection that is not there.
    expect(card).not.toHaveAttribute('aria-current');
  });
});

describe('ConversationsPage open in chat', () => {
  beforeEach(() => {
    mockUseProposalsList.mockReturnValue({
      data: { groups: { investigate: [proposal] }, total: 1, truncated: false },
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => jest.clearAllMocks());

  const chatControl = () => screen.getByTestId('conversationCardOpenInChat');

  it("navigates to the conversation's Agent Builder page", () => {
    const { core } = renderPage('/');

    fireEvent.click(chatControl());

    // The chat is the investigation's own Agent Builder conversation, so the card resolves its
    // proposal to that conversation and its agent — the route is scoped to the agent.
    expect(core.application.navigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: '/agents/elastic-ai-agent/conversations/inv-1',
    });
  });

  it('renders the control as a link so it can be opened in a new tab', () => {
    const { core } = renderPage('/');

    expect(core.application.getUrlForApp).toHaveBeenCalledWith('agent_builder', {
      path: '/agents/elastic-ai-agent/conversations/inv-1',
    });
    expect(chatControl()).toHaveAttribute(
      'href',
      '/app/agent_builder/agents/elastic-ai-agent/conversations/inv-1'
    );
  });

  it("falls back to Agent Builder's own redirect when the agent is unknown", () => {
    // The agent id is decoration from a conversation read that can fail; the legacy route
    // resolves the agent server-side rather than dropping the link.
    mockUseProposalsList.mockReturnValue({
      data: {
        groups: { investigate: [{ ...proposal, conversationAgentId: undefined }] },
        total: 1,
        truncated: false,
      },
      isLoading: false,
      error: undefined,
    });
    const { core } = renderPage('/');

    fireEvent.click(chatControl());

    expect(core.application.navigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: '/conversations/inv-1',
    });
  });

  it('does not open the details flyout when the chat control is clicked', () => {
    const { agentBuilder, history } = renderPage('/');

    fireEvent.click(chatControl());

    // The control sits inside a clickable card, so the event must not reach it.
    expect(history.location.search).toBe('');
    expect(agentBuilder.openConversationDetails).not.toHaveBeenCalled();
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

  // The modal is titled with the action name, which distinguishes it from the actions
  // popover — also a dialog — and from the menu item that opened it.
  const approvalDialog = () => within(screen.getByRole('dialog', { name: 'Revoke sessions' }));

  // The recommended action lives in the ⋮ menu, not on the card.
  const openApproval = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));
    fireEvent.click(screen.getByText('Revoke sessions'));
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
    expect(screen.getByRole('dialog', { name: 'Revoke sessions' })).toBeInTheDocument();

    const [, handlers] = approveMutate.mock.calls[0];
    act(() => handlers.onSuccess());

    expect(screen.queryByRole('dialog', { name: 'Revoke sessions' })).not.toBeInTheDocument();
  });

  it('dismisses with the reason the analyst chose rather than a default', () => {
    renderPage('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));
    // The menu item is "Close investigation"; the modal it opens still dismisses the
    // underlying proposal, which is the API operation and the confirm button's label.
    fireEvent.click(screen.getByText('Close investigation'));

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
    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));

    // Asserted inside the open menu, since that is now the only place the decision
    // could appear — a card-level assertion would pass whatever the menu contained.
    expect(screen.queryByText('Revoke sessions')).not.toBeInTheDocument();
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
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
