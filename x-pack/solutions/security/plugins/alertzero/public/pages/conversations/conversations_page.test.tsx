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
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { useApproveProposal, useDismissProposal } from '@kbn/proposals-plugin/public';
import {
  useAssignInvestigation,
  useUserProfiles,
  useSuggestUserProfiles,
  useSetInvestigationStatus,
  useInvestigationClosePreview,
} from '@kbn/agentic-investigations-plugin/public';
import {
  useProposalsByCategory,
  useProposalsByCategoryCount,
  useClosedProposals,
  useClosedProposalsCount,
} from '../../hooks/use_proposals_api';
import { CATEGORY_PAGE_SIZE, CLOSED_PAGE_SIZE } from './queue/use_queue_section';
import { useProposalChartsSummary } from '../../hooks/use_proposal_charts_summary';
import type { ProposalItem } from '../../../common/proposals/list';
import { ConversationsPage } from './conversations_page';

// Only the mutations are stubbed: the module also exports DISMISS_REASON_OPTIONS, which
// the dismiss modal's select needs for real.
jest.mock('@kbn/proposals-plugin/public', () => ({
  ...jest.requireActual('@kbn/proposals-plugin/public'),
  useApproveProposal: jest.fn(),
  useDismissProposal: jest.fn(),
}));
jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-plugin/public'),
  useAssignInvestigation: jest.fn(),
  useUserProfiles: jest.fn(),
  useSuggestUserProfiles: jest.fn(),
  useSetInvestigationStatus: jest.fn(),
  useInvestigationClosePreview: jest.fn(),
}));
jest.mock('@kbn/agentic-investigations-common', () => {
  const actual = jest.requireActual('@kbn/agentic-investigations-common');
  return {
    ...actual,
    // Replace AssignToUsers with a minimal stub so the queue renders without needing
    // a full EUI/user-profile environment.
    // eslint-disable-next-line react/display-name
    AssignToUsers: ({
      conversationId,
      onChange,
      canManage,
    }: {
      conversationId: string;
      onChange: (s: unknown[]) => void;
      canManage: boolean;
    }) =>
      canManage ? (
        <button
          data-test-subj={`mock-assign-${conversationId}`}
          onClick={() =>
            onChange([{ uid: 'user-uid-1', enabled: true, user: { username: 'alice' }, data: {} }])
          }
        >
          Assign
        </button>
      ) : (
        <span data-test-subj={`mock-assignees-readonly-${conversationId}`}>Read-only</span>
      ),
  };
});
jest.mock('../../hooks/use_proposals_api');
jest.mock('../../hooks/use_proposal_charts_summary');
jest.mock('../../components/proposals_trend_chart', () => ({
  ProposalsTrendChartRow: () => null,
}));
// Stub the lazy close-investigation modal so lazy-loading and provider complexity don't
// affect unit tests. The stub renders a minimal dialog and calls the mocked status hook
// so the mutation assertions still hold.
jest.mock('../../components/connected_status/connected_close_investigation_modal', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const agenticInvestigationsPublic = require('@kbn/agentic-investigations-plugin/public');
  // eslint-disable-next-line react/display-name
  const ConnectedCloseInvestigationModal = ({
    investigation,
    onClose,
  }: {
    investigation: { conversationId?: string; id?: string };
    onClose: () => void;
  }) => {
    const { mutate } = agenticInvestigationsPublic.useSetInvestigationStatus();
    return (
      <div role="dialog" aria-label="Close this investigation?">
        <button
          onClick={() =>
            mutate({
              investigationId: investigation.conversationId ?? investigation.id,
              body: { status: 'closed', dismiss_reason: undefined, rationale: undefined },
            })
          }
        >
          Close investigation
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
  return { ConnectedCloseInvestigationModal };
});

const mockUseProposalsByCategory = useProposalsByCategory as jest.Mock;
const mockUseProposalsByCategoryCount = useProposalsByCategoryCount as jest.Mock;
const mockUseClosedProposals = useClosedProposals as jest.Mock;
const mockUseClosedProposalsCount = useClosedProposalsCount as jest.Mock;
const mockUseProposalChartsSummary = useProposalChartsSummary as jest.Mock;
const mockUseApproveProposal = useApproveProposal as jest.Mock;
const mockUseDismissProposal = useDismissProposal as jest.Mock;
const mockUseAssignInvestigation = useAssignInvestigation as jest.Mock;
const mockUseUserProfiles = useUserProfiles as jest.Mock;
const mockUseSuggestUserProfiles = useSuggestUserProfiles as jest.Mock;
const mockUseSetInvestigationStatus = useSetInvestigationStatus as jest.Mock;
const mockUseInvestigationClosePreview = useInvestigationClosePreview as jest.Mock;

/** Records the fetchNextPage of each bucket, so a Show more click can be asserted. */
const fetchNextPage: Record<string, jest.Mock> = {};

/**
 * Fans a category→proposals map across the four hooks a section uses: a count-only
 * read, and an infinite rows query that only runs while open. Both answer nothing
 * while disabled, which is what makes the badge's source observable. `total` is the
 * whole bucket and the pages only what was asked for, so the fake keeps them apart.
 */
const mockProposals = (groups: Record<string, ProposalItem[]>) => {
  const count = (all: ProposalItem[], enabled: boolean) => ({
    data: enabled ? { proposals: [], total: all.length } : undefined,
    isLoading: false,
    error: undefined,
  });

  const pages = (bucket: string, all: ProposalItem[], firstPageSize: number, enabled: boolean) => {
    // Resolves, like the real one: the caller waits on it to hear that a page failed.
    fetchNextPage[bucket] = fetchNextPage[bucket] ?? jest.fn().mockResolvedValue({});
    if (!enabled) {
      return {
        data: undefined,
        fetchNextPage: fetchNextPage[bucket],
        hasNextPage: undefined,
        isFetchingNextPage: false,
        isInitialLoading: false,
        error: undefined,
      };
    }
    return {
      data: {
        pages: [{ proposals: all.slice(0, firstPageSize), total: all.length }],
        pageParams: [undefined],
      },
      fetchNextPage: fetchNextPage[bucket],
      hasNextPage: all.length > firstPageSize,
      isFetchingNextPage: false,
      isInitialLoading: false,
      error: undefined,
    };
  };

  mockUseProposalsByCategoryCount.mockImplementation((category: string, enabled: boolean) =>
    count(groups[category] ?? [], enabled)
  );
  mockUseClosedProposalsCount.mockImplementation((enabled: boolean) =>
    count(groups.closed ?? [], enabled)
  );

  mockUseProposalsByCategory.mockImplementation(
    (category: string, { firstPageSize, enabled }: { firstPageSize: number; enabled: boolean }) =>
      pages(category, groups[category] ?? [], firstPageSize, enabled)
  );
  mockUseClosedProposals.mockImplementation(
    ({ firstPageSize, enabled }: { firstPageSize: number; enabled: boolean }) =>
      pages('closed', groups.closed ?? [], firstPageSize, enabled)
  );
};

/** The Closed accordion starts collapsed, so its rows need an expand first. */
const expandClosed = () => fireEvent.click(screen.getByRole('button', { name: /^Closed/ }));

/** The header count comes from the charts-summary scalar, not from the pages above. */
const mockOpenCount = (currentOpen: number) =>
  mockUseProposalChartsSummary.mockReturnValue({
    data: { currentOpen, buckets: [] },
    isLoading: false,
    error: undefined,
  });

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
  conversationAssignees: [],
};

const renderPage = (
  initialEntry: string,
  { capabilities = {} }: { capabilities?: Record<string, unknown> } = {}
) => {
  const core = coreMock.createStart();
  // The real service returns a URL; the mock returns undefined, which would silently drop the
  // chat control's href and make the link assertions vacuous.
  core.application.getUrlForApp.mockImplementation(
    (appId, options) => `/app/${appId}${options?.path ?? ''}`
  );
  (core.application.capabilities as Record<string, unknown>).agenticInvestigations = capabilities;
  const agentBuilder = agentBuilderMocks.createStart();
  const closeFlyout = jest.fn();
  (agentBuilder.openConversationDetails as jest.Mock).mockResolvedValue(closeFlyout);
  const history: MemoryHistory = createMemoryHistory({ initialEntries: [initialEntry] });

  // The sections discard their accumulated pages through the query client on
  // collapse, so the page needs a real one even with the hooks stubbed.
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...core, agentBuilder }}>
          <QueryClientProvider client={new QueryClient()}>
            <Router history={history}>
              <ConversationsPage />
            </Router>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { core, agentBuilder, closeFlyout, history };
};

const approveMutate = jest.fn();
const dismissMutate = jest.fn();
const setStatusMutate = jest.fn();
const assignInvestigationMutate = jest.fn().mockResolvedValue({});

beforeEach(() => {
  mockUseApproveProposal.mockReturnValue({ mutate: approveMutate });
  mockUseDismissProposal.mockReturnValue({ mutate: dismissMutate });
  mockUseAssignInvestigation.mockReturnValue({ mutateAsync: assignInvestigationMutate });
  mockUseUserProfiles.mockReturnValue({ data: [], isFetching: false });
  mockUseSuggestUserProfiles.mockReturnValue({ data: [], isLoading: false });
  mockUseSetInvestigationStatus.mockReturnValue({ mutate: setStatusMutate, isLoading: false });
  mockUseInvestigationClosePreview.mockReturnValue({
    data: { pending_proposal_count: 0, pending_proposals: [] },
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
  });
  mockOpenCount(0);
});

describe('ConversationsPage details flyout', () => {
  beforeEach(() => {
    mockProposals({ investigate: [proposal] });
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
    mockProposals({ investigate: [proposal, sibling] });

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
    mockProposals({ investigate: [proposal] });
  });

  afterEach(() => jest.clearAllMocks());

  const chatControl = () => screen.getByTestId('conversationCardOpenInChat');

  it("navigates to the conversation's Agent Builder page with the details flyout open", () => {
    const { core } = renderPage('/');

    fireEvent.click(chatControl());

    // The chat is the investigation's own Agent Builder conversation, so the card resolves its
    // proposal to that conversation and its agent — the route is scoped to the agent.
    expect(core.application.navigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: '/agents/elastic-ai-agent/conversations/inv-1?openConversationDetails=true',
    });
  });

  it('renders the control as a link so it can be opened in a new tab', () => {
    const { core } = renderPage('/');

    expect(core.application.getUrlForApp).toHaveBeenCalledWith('agent_builder', {
      path: '/agents/elastic-ai-agent/conversations/inv-1?openConversationDetails=true',
    });
    expect(chatControl()).toHaveAttribute(
      'href',
      '/app/agent_builder/agents/elastic-ai-agent/conversations/inv-1?openConversationDetails=true'
    );
  });

  it("falls back to Agent Builder's own redirect when the agent is unknown", () => {
    // The agent id is decoration from a conversation read that can fail; the legacy route
    // resolves the agent server-side rather than dropping the link.
    mockProposals({ investigate: [{ ...proposal, conversationAgentId: undefined }] });
    const { core } = renderPage('/');

    fireEvent.click(chatControl());

    expect(core.application.navigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: '/conversations/inv-1?openConversationDetails=true',
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
    mockProposals({ respond: [actionProposal] });
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

    fireEvent.click(approvalDialog().getByRole('button', { name: 'Approve' }));

    expect(approveMutate).toHaveBeenCalledWith(
      { id: 'prop-1', body: { actionInput: { user: 'cfo@corp' } } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('keeps the approval modal open until the mutation succeeds', () => {
    renderPage('/');
    openApproval();
    fireEvent.click(approvalDialog().getByRole('button', { name: 'Approve' }));

    // A refusal — expired deadline, someone decided first — must not close the modal as
    // though the decision had landed. onSuccess is the only thing that closes it.
    expect(screen.getByRole('dialog', { name: 'Revoke sessions' })).toBeInTheDocument();

    const [, handlers] = approveMutate.mock.calls[0];
    act(() => handlers.onSuccess());

    expect(screen.queryByRole('dialog', { name: 'Revoke sessions' })).not.toBeInTheDocument();
  });

  it('hands Dismiss off to the dismiss modal rather than deciding without a reason', () => {
    renderPage('/');
    openApproval();

    fireEvent.click(approvalDialog().getByRole('button', { name: 'Dismiss' }));

    // The approval modal closes and the reason form takes over for the same proposal: a
    // dismissal is a decision with a reason, never a silent close.
    expect(screen.queryByRole('dialog', { name: 'Revoke sessions' })).not.toBeInTheDocument();

    const dialog = within(screen.getByRole('dialog', { name: 'Action modal' }));
    fireEvent.change(screen.getByTestId('alertZeroDismissReasonSelect'), {
      target: { value: 'low_value' },
    });
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Not worth chasing.' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Dismiss' }));

    expect(dismissMutate).toHaveBeenCalledWith(
      { id: 'prop-1', body: { dismissReason: 'low_value', rationale: 'Not worth chasing.' } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('opens the close-investigation modal when the ⋮ Close action is triggered with manage capability', () => {
    // canManageInvestigations must be true for renderCloseModal to be wired.
    renderPage('/', { capabilities: { manageInvestigations: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));
    fireEvent.click(screen.getByText('Close investigation'));

    expect(screen.getByRole('dialog', { name: 'Close this investigation?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close investigation' }));

    expect(setStatusMutate).toHaveBeenCalledWith({
      investigationId: 'inv-1',
      body: { status: 'closed', dismiss_reason: undefined, rationale: undefined },
    });
  });

  it('hides the actions menu trigger for a decided proposal when escalation is not available', () => {
    // A decided investigation without `canManageEscalations` has no available actions —
    // the menu trigger must not be rendered at all, not just show an empty popover.
    mockProposals({ closed: [{ ...actionProposal, decidedAt: '2024-01-02T00:00:00Z' }] });

    renderPage('/');
    expandClosed();

    expect(screen.queryByRole('button', { name: 'Open actions menu' })).not.toBeInTheDocument();
  });

  // That the scalar itself excludes decided proposals is covered in the service tests.
  it('counts only undecided proposals as work needing attention', () => {
    mockProposals({
      respond: [actionProposal],
      closed: [{ ...actionProposal, id: 'prop-2', decidedAt: '2024-01-02T00:00:00Z' }],
    });
    mockOpenCount(1);

    renderPage('/');

    expect(screen.getByText('1 action needs you')).toBeInTheDocument();
  });

  it('keeps the last good count when a poll fails, rather than reporting it lost', () => {
    mockProposals({ respond: [actionProposal] });
    // React Query keeps `data` and sets `error` when a background refetch fails.
    mockUseProposalChartsSummary.mockReturnValue({
      data: { currentOpen: 1, buckets: [] },
      isLoading: false,
      error: new Error('poll failed'),
    });

    renderPage('/');

    expect(screen.getByText('1 action needs you')).toBeInTheDocument();
    expect(screen.queryByText("Your action count couldn't be loaded")).not.toBeInTheDocument();
  });

  it('reads as an empty queue when the window holds only decisions already made', () => {
    mockProposals({ closed: [{ ...actionProposal, decidedAt: '2024-01-02T00:00:00Z' }] });
    mockOpenCount(0);

    renderPage('/');

    // Closed holds rows, but they are not work: the header must not read
    // "0 actions need you" beside them.
    expect(screen.getByText('No events found')).toBeInTheDocument();
  });
});

describe('ConversationsPage queue sections', () => {
  const closedProposal = { ...proposal, id: 'prop-c', decidedAt: '2024-01-02T00:00:00Z' };
  const bucketOf = (size: number, overrides: Partial<ProposalItem> = {}) =>
    Array.from({ length: size }, (_, i) => ({ ...proposal, id: `prop-${i}`, ...overrides }));

  it('starts Closed collapsed and runs no rows query', () => {
    mockProposals({ closed: [closedProposal] });

    renderPage('/');

    expect(mockUseClosedProposals).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    expect(screen.queryByText(closedProposal.conversationTitle!)).not.toBeInTheDocument();
  });

  it('shows the bucket total on a collapsed section, which has loaded no rows', () => {
    mockProposals({ closed: [closedProposal, { ...closedProposal, id: 'prop-d' }] });

    renderPage('/');

    expect(screen.getByRole('button', { name: /^Closed/ })).toHaveTextContent('2');
  });

  it('fetches rows once Closed is expanded', () => {
    mockProposals({ closed: [closedProposal] });

    renderPage('/');
    expandClosed();

    expect(mockUseClosedProposals).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true, firstPageSize: CLOSED_PAGE_SIZE })
    );
    expect(screen.getByText(closedProposal.conversationTitle!)).toBeInTheDocument();
  });

  it('stops the rows query again when Closed is collapsed', () => {
    mockProposals({ closed: [closedProposal] });

    renderPage('/');
    expandClosed();
    expandClosed();

    expect(mockUseClosedProposals).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('counts the whole bucket, not the page it rendered', () => {
    mockProposals({ respond: bucketOf(CATEGORY_PAGE_SIZE + 5, { category: 'respond' }) });

    renderPage('/');

    expect(screen.getByRole('button', { name: /^Respond/ })).toHaveTextContent(
      String(CATEGORY_PAGE_SIZE + 5)
    );
  });

  it('drops the count-only request for a section whose rows already report the total', () => {
    mockProposals({
      respond: bucketOf(CATEGORY_PAGE_SIZE + 5, { category: 'respond' }),
      closed: [closedProposal],
    });

    renderPage('/');

    expect(mockUseProposalsByCategoryCount).toHaveBeenCalledWith('respond', false);
    // Collapsed, so nothing else can report it.
    expect(mockUseClosedProposalsCount).toHaveBeenLastCalledWith(true);
  });

  describe('show more', () => {
    it('offers the rows still to come', () => {
      mockProposals({ respond: bucketOf(CATEGORY_PAGE_SIZE + 5, { category: 'respond' }) });

      renderPage('/');

      expect(screen.getByTestId('conversationQueueShowMore-respond')).toHaveTextContent(
        'Show more (5)'
      );
    });

    it('is absent once the bucket fits in one page', () => {
      mockProposals({ respond: bucketOf(CATEGORY_PAGE_SIZE, { category: 'respond' }) });

      renderPage('/');

      expect(screen.queryByTestId('conversationQueueShowMore-respond')).not.toBeInTheDocument();
    });

    it('asks the query for the next page', () => {
      mockProposals({ respond: bucketOf(CATEGORY_PAGE_SIZE + 5, { category: 'respond' }) });

      renderPage('/');
      fireEvent.click(screen.getByTestId('conversationQueueShowMore-respond'));

      expect(fetchNextPage.respond).toHaveBeenCalled();
    });

    it('is offered on Closed too, once expanded', () => {
      mockProposals({
        closed: bucketOf(CLOSED_PAGE_SIZE + 7).map((p) => ({
          ...p,
          decidedAt: '2024-01-02T00:00:00Z',
        })),
      });

      renderPage('/');
      expandClosed();

      expect(screen.getByTestId('conversationQueueShowMore-closed')).toHaveTextContent(
        'Show more (7)'
      );
    });
  });

  it('reports a failed section without letting its neighbours vouch for it', () => {
    // The review this fixes: an aggregate across all four queries let a healthy
    // `respond` suppress a broken `investigate`, which then read as simply empty.
    mockProposals({ respond: [proposal] });
    mockUseProposalsByCategory.mockImplementation((category: string) =>
      category === 'investigate'
        ? {
            data: undefined,
            fetchNextPage: jest.fn(),
            hasNextPage: undefined,
            isFetchingNextPage: false,
            isInitialLoading: false,
            error: new Error('boom'),
          }
        : {
            data: {
              pages: [{ proposals: category === 'respond' ? [proposal] : [], total: 1 }],
              pageParams: [undefined],
            },
            fetchNextPage: jest.fn(),
            hasNextPage: false,
            isFetchingNextPage: false,
            isInitialLoading: false,
            error: undefined,
          }
    );

    renderPage('/');

    expect(screen.getByTestId('conversationQueueError-investigate')).toBeInTheDocument();
    // The healthy neighbour still renders its rows rather than being blanked with it.
    expect(screen.getByText(proposal.conversationTitle!)).toBeInTheDocument();
    expect(screen.queryByTestId('conversationQueueError-respond')).not.toBeInTheDocument();
  });

  it('scaffolds only as many rows as the bucket holds, not a whole page', () => {
    // The count read already said the bucket holds 3, so a 25-row scaffold would
    // promise rows that are never coming.
    mockProposals({});
    mockUseClosedProposalsCount.mockReturnValue({
      data: { proposals: [], total: 3 },
      isLoading: false,
      error: undefined,
    });
    mockUseClosedProposals.mockReturnValue({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: undefined,
      isFetchingNextPage: false,
      isInitialLoading: true,
      error: undefined,
    });

    renderPage('/');
    expandClosed();

    const scaffold = screen.getByLabelText('Loading events…');
    expect(within(scaffold).getAllByRole('progressbar')).toHaveLength(6);
  });
});

describe('ConversationsPage impact pills', () => {
  const hostProposal: ProposalItem = {
    ...proposal,
    id: 'prop-host',
    conversationTitle: 'Host investigation',
    entityIds: ['host-1'],
  };
  const userProposal: ProposalItem = {
    ...proposal,
    id: 'prop-user',
    conversationTitle: 'User investigation',
    entityIds: ['user-1'],
  };

  beforeEach(() => {
    mockProposals({ investigate: [hostProposal, userProposal] });
  });

  afterEach(() => jest.clearAllMocks());

  it('filters the queue to conversations whose entity ids include the selected pill', () => {
    renderPage('/');

    expect(screen.getByText('Host investigation')).toBeInTheDocument();
    expect(screen.getByText('User investigation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'host-1' }));

    expect(screen.getByText('Host investigation')).toBeInTheDocument();
    expect(screen.queryByText('User investigation')).not.toBeInTheDocument();
  });
});

describe('ConversationsPage assignee picker', () => {
  beforeEach(() => {
    mockProposals({ investigate: [proposal] });
  });

  afterEach(() => jest.clearAllMocks());

  it('passes the conversationId (not the proposal id) to the assignment mutation', async () => {
    renderPage('/', { capabilities: { manageInvestigations: true } });

    // The stub AssignToUsers is keyed by getRowKey (proposal id), so the button test-id uses it.
    fireEvent.click(screen.getByTestId('mock-assign-prop-1'));

    await waitFor(() =>
      expect(assignInvestigationMutate).toHaveBeenCalledWith(
        expect.objectContaining({ investigationId: 'inv-1' })
      )
    );
    // The proposal id 'prop-1' must NOT appear as the investigation id.
    expect(assignInvestigationMutate).not.toHaveBeenCalledWith(
      expect.objectContaining({ investigationId: 'prop-1' })
    );
  });

  it('does not open the conversation flyout when the assign button is clicked', async () => {
    const { agentBuilder } = renderPage('/', { capabilities: { manageInvestigations: true } });

    fireEvent.click(screen.getByTestId('mock-assign-prop-1'));

    // Wait for any async handlers.
    await waitFor(() => expect(assignInvestigationMutate).toHaveBeenCalled());
    expect(agentBuilder.openConversationDetails).not.toHaveBeenCalled();
  });

  it('renders the assignee picker as read-only when manageInvestigations is false', () => {
    renderPage('/', { capabilities: { manageInvestigations: false } });

    expect(screen.getByTestId('mock-assignees-readonly-prop-1')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-assign-prop-1')).not.toBeInTheDocument();
  });
});
