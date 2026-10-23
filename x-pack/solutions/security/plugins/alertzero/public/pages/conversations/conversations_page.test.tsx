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
import {
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
} from '@kbn/proposals-plugin/public';
import {
  useAssignInvestigation,
  useProposalImpactPills,
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
import { useRunningSummary } from '../../hooks/use_running_summary';
import type { ProposalItem } from '../../../common/proposals/list';
import { ConversationsPage } from './conversations_page';

const mockDropDecided = jest.fn();
jest.mock('./queue/use_drop_decided_proposal', () => ({
  useDropDecidedProposal: () => mockDropDecided,
}));

jest.mock('../../components/scan_failure_callout/scan_failure_callout', () => ({
  ScanFailureCallout: () => <div data-test-subj="alertZeroScanFailureCallout" />,
}));

// Only the mutations are stubbed — everything else this module exports stays real.
jest.mock('@kbn/proposals-plugin/public', () => ({
  ...jest.requireActual('@kbn/proposals-plugin/public'),
  useApproveProposal: jest.fn(),
  useDismissProposal: jest.fn(),
  useIsApprovingProposal: jest.fn(),
  useIsDecliningProposal: jest.fn(),
}));
// Only the profile lookup and the assignee-picker's own hooks are stubbed here — two separate
// jest.mock calls for the same module would silently replace one another rather than merge.
jest.mock('@kbn/agentic-investigations-plugin/public', () => {
  const mockUseSetInvestigationStatus = jest.fn();
  return {
    ...jest.requireActual('@kbn/agentic-investigations-plugin/public'),
    useCurrentUserProfile: jest.fn(() => ({ data: null })),
    useProposalImpactPills: jest.fn(),
    useAssignInvestigation: jest.fn(),
    useUserProfiles: jest.fn(),
    useSuggestUserProfiles: jest.fn(),
    useSetInvestigationStatus: mockUseSetInvestigationStatus,
    useInvestigationClosePreview: jest.fn(),
    // Stub the lazy close-investigation modal so lazy-loading and provider complexity don't
    // affect unit tests. The stub renders a minimal dialog and calls the mocked status hook
    // so the mutation assertions still hold.
    // eslint-disable-next-line react/display-name
    LazyConnectedCloseInvestigationModal: ({
      investigation,
      onClose,
    }: {
      investigation: { conversationId?: string; id?: string };
      onClose: () => void;
    }) => {
      const { mutate } = mockUseSetInvestigationStatus();
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
    },
  };
});
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
jest.mock('../../hooks/use_running_summary');
jest.mock('../../components/proposals_trend_chart', () => ({
  ProposalsTrendChartRow: () => null,
}));

const mockUseProposalsByCategory = useProposalsByCategory as jest.Mock;
const mockUseProposalsByCategoryCount = useProposalsByCategoryCount as jest.Mock;
const mockUseClosedProposals = useClosedProposals as jest.Mock;
const mockUseClosedProposalsCount = useClosedProposalsCount as jest.Mock;
const mockUseProposalChartsSummary = useProposalChartsSummary as jest.Mock;
const mockUseRunningSummary = useRunningSummary as jest.Mock;
const mockUseProposalImpactPills = useProposalImpactPills as jest.Mock;
const mockUseApproveProposal = useApproveProposal as jest.Mock;
const mockUseDismissProposal = useDismissProposal as jest.Mock;
const mockUseIsApprovingProposal = useIsApprovingProposal as jest.Mock;
const mockUseIsDecliningProposal = useIsDecliningProposal as jest.Mock;
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
  // The server applies the entity filter, so the fake narrows the rows the same way.
  const narrowed = (rows: ProposalItem[], entity?: string | null) =>
    entity ? rows.filter(({ entityIds }) => entityIds?.includes(entity)) : rows;

  const count = (rows: ProposalItem[], enabled: boolean, entity?: string | null) => ({
    data: enabled ? { proposals: [], total: narrowed(rows, entity).length } : undefined,
    isLoading: false,
    error: undefined,
  });

  const pages = (
    bucket: string,
    rows: ProposalItem[],
    {
      firstPageSize,
      enabled,
      entity,
    }: { firstPageSize: number; enabled: boolean; entity?: string | null }
  ) => {
    const all = narrowed(rows, entity);
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

  mockUseProposalsByCategoryCount.mockImplementation(
    (category: string, enabled: boolean, entity?: string | null) =>
      count(groups[category] ?? [], enabled, entity)
  );
  mockUseClosedProposalsCount.mockImplementation((enabled: boolean, entity?: string | null) =>
    count(groups.closed ?? [], enabled, entity)
  );

  mockUseProposalsByCategory.mockImplementation(
    (
      category: string,
      options: { firstPageSize: number; enabled: boolean; entity?: string | null }
    ) => pages(category, groups[category] ?? [], options)
  );
  mockUseClosedProposals.mockImplementation(
    (options: { firstPageSize: number; enabled: boolean; entity?: string | null }) =>
      pages('closed', groups.closed ?? [], options)
  );
};

/**
 * The Closed accordion starts collapsed, so its rows need an expand first. Awaiting flushes the
 * badge's MutationObserver update, which would otherwise land outside `act`.
 */
const expandClosed = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^Closed Actions/ }));
  await act(async () => {});
};

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
  title: 'Investigate impossible travel',
  comment: 'MFA satisfied from two countries in 40 minutes.',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  category: 'investigate',
  origin: 'alertzero',
  createdAt: '2024-01-01T00:00:00Z',
  conversationAssignees: [],
};

const renderPage = (
  initialEntry: string,
  {
    capabilities = {},
    proposalsCapabilities = { showProposals: true, decideProposals: true },
    alertZeroWrite = true,
  }: {
    capabilities?: Record<string, unknown>;
    proposalsCapabilities?: Record<string, boolean>;
    alertZeroWrite?: boolean;
  } = {}
) => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    alertzero: { show: true, write: alertZeroWrite },
    proposals: proposalsCapabilities,
  };
  // The real service returns a URL; the mock returns undefined, which would silently drop the
  // chat control's href and make the link assertions vacuous.
  core.application.getUrlForApp.mockImplementation(
    (appId, options) => `/app/${appId}${options?.path ?? ''}`
  );
  (core.application.capabilities as Record<string, unknown>).agenticInvestigations = capabilities;
  // The real hooks behind the details flyout and the assignee picker read these services, and
  // react-query rejects a query function that resolves to undefined.
  core.http.get.mockResolvedValue(proposal);
  core.userProfile.suggest.mockResolvedValue([]);
  const agentBuilder = agentBuilderMocks.createStart();
  const closeFlyout = jest.fn();
  (agentBuilder.openConversationDetails as jest.Mock).mockResolvedValue(closeFlyout);
  const history: MemoryHistory = createMemoryHistory({ initialEntries: [initialEntry] });

  // The sections discard their accumulated pages through the query client on
  // collapse, so the page needs a real one even with the hooks stubbed.
  // A fresh element each time: React bails out of a root update when the element
  // is the same reference, so a poll-style mock change would never re-render.
  const queryClient = new QueryClient();
  const page = () => (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...core, agentBuilder }}>
          <QueryClientProvider client={queryClient}>
            <Router history={history}>
              <ConversationsPage />
            </Router>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  const rendered = render(page());

  return { core, agentBuilder, closeFlyout, history, rerender: () => rendered.rerender(page()) };
};

const approveMutateAsync = jest.fn().mockResolvedValue(undefined);
const dismissMutateAsync = jest.fn().mockResolvedValue(undefined);
const setStatusMutate = jest.fn();
const assignInvestigationMutate = jest.fn().mockResolvedValue({});

beforeEach(() => {
  mockDropDecided.mockClear();
  approveMutateAsync.mockResolvedValue(undefined);
  dismissMutateAsync.mockResolvedValue(undefined);
  mockUseApproveProposal.mockReturnValue({ mutateAsync: approveMutateAsync });
  mockUseDismissProposal.mockReturnValue({ mutateAsync: dismissMutateAsync });
  mockUseIsApprovingProposal.mockReturnValue(false);
  mockUseIsDecliningProposal.mockReturnValue(false);
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
  mockUseProposalImpactPills.mockReturnValue({ data: [] });
  mockOpenCount(0);
  mockUseRunningSummary.mockReturnValue({ watchCount: 4, enabledWorkerCount: 6, workerCount: 6 });
});

describe('ConversationsPage proposals access', () => {
  afterEach(() => jest.clearAllMocks());

  it.each<Record<string, boolean>>([{}, { showProposals: false }])(
    'names the missing privilege and prevents queue requests with capabilities %s',
    (proposalsCapabilities) => {
      renderPage('/', { proposalsCapabilities });

      expect(
        screen.getByText(
          'To view the AlertZero queue in this space, you need the Proposed Actions Read privilege.'
        )
      ).toBeInTheDocument();
      expect(mockUseProposalsByCategory).not.toHaveBeenCalled();
      expect(mockUseProposalsByCategoryCount).not.toHaveBeenCalled();
      expect(mockUseClosedProposals).not.toHaveBeenCalled();
      expect(mockUseClosedProposalsCount).not.toHaveBeenCalled();
      expect(mockUseProposalChartsSummary).not.toHaveBeenCalled();
    }
  );

  it('allows the queue with Proposals read access alone', () => {
    mockProposals({ investigate: [proposal] });
    renderPage('/', { proposalsCapabilities: { showProposals: true, decideProposals: false } });

    expect(screen.queryByTestId('alertzeroProposalsPrivilegesGate')).not.toBeInTheDocument();
    expect(mockUseProposalsByCategory).toHaveBeenCalled();
  });
});

describe('ConversationsPage scan failures', () => {
  it('mounts the scan-failure callout', () => {
    mockProposals({});
    renderPage('/');

    expect(screen.getByTestId('alertZeroScanFailureCallout')).toBeInTheDocument();
  });
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

    fireEvent.click(screen.getByRole('button', { name: proposal.title }));

    // The flyout addresses the conversation, so `selectedConversationId` is `inv-1`, never the
    // `prop-1` that was clicked; the clicked proposal rides along only to mark its card.
    expect(history.location.search).toBe('?selectedConversationId=inv-1&selectedProposalId=prop-1');
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

  it('marks only the clicked card, not its siblings in the same conversation', async () => {
    const sibling: ProposalItem = { ...proposal, id: 'prop-2', comment: 'Second proposal.' };
    mockProposals({ investigate: [proposal, sibling] });

    renderPage('/');

    const [first, second] = screen.getAllByRole('button', { name: proposal.title });
    fireEvent.click(second);

    expect(second).toHaveAttribute('aria-current', 'true');
    expect(first).not.toHaveAttribute('aria-current');
  });

  it('ignores a proposal id that belongs to a different conversation', async () => {
    mockProposals({ investigate: [proposal] });

    renderPage('/?selectedConversationId=inv-2&selectedProposalId=prop-1');

    expect(screen.getByRole('button', { name: proposal.title })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('marks no card when the link names only the conversation', async () => {
    mockProposals({ investigate: [proposal] });

    renderPage('/?selectedConversationId=inv-1');

    expect(screen.getByRole('button', { name: proposal.title })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('stops marking the card as current once the conversation leaves the URL', async () => {
    const { history } = renderPage('/');
    const card = screen.getByRole('button', { name: proposal.title });

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
      path: '/agents/elastic-ai-agent/conversations/inv-1?openConversationDetails=true&sidebarCollapsed=true',
    });
  });

  it('renders the control as a link so it can be opened in a new tab', () => {
    const { core } = renderPage('/');

    expect(core.application.getUrlForApp).toHaveBeenCalledWith('agent_builder', {
      path: '/agents/elastic-ai-agent/conversations/inv-1?openConversationDetails=true&sidebarCollapsed=true',
    });
    expect(chatControl()).toHaveAttribute(
      'href',
      '/app/agent_builder/agents/elastic-ai-agent/conversations/inv-1?openConversationDetails=true&sidebarCollapsed=true'
    );
  });

  it("falls back to Agent Builder's own redirect when the agent is unknown", () => {
    // The agent id is decoration from a conversation read that can fail; the legacy route
    // resolves the agent server-side rather than dropping the link.
    mockProposals({ investigate: [{ ...proposal, conversationAgentId: undefined }] });
    const { core } = renderPage('/');

    fireEvent.click(chatControl());

    expect(core.application.navigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: '/conversations/inv-1?openConversationDetails=true&sidebarCollapsed=true',
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
    // What `create()` stores for a caller that names nothing itself.
    title: 'Revoke sessions',
    actionWorkflowId: 'system-alertzero-action-revoke-sessions',
    actionInput: { user: 'cfo@corp' },
    action: { name: 'Revoke sessions', approvalPolicy: 'always-gate' },
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
    // By role: the card's summary carries the same text, because the title the
    // server stored for this proposal is the action's own name.
    fireEvent.click(screen.getByRole('menuitem', { name: 'Revoke sessions' }));
  };

  it('allows Proposals Manage to approve without AlertZero Write and submits the displayed input', async () => {
    renderPage('/', { alertZeroWrite: false });
    openApproval();

    fireEvent.click(approvalDialog().getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(approveMutateAsync).toHaveBeenCalledWith({
        id: 'prop-1',
        body: { actionInput: { user: 'cfo@corp' } },
      })
    );
  });

  it('keeps an approved proposal in its category while its action runs', async () => {
    renderPage('/');
    openApproval();

    fireEvent.click(approvalDialog().getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(approveMutateAsync).toHaveBeenCalled());

    expect(mockDropDecided).not.toHaveBeenCalled();
  });

  it('removes a declined proposal from its category because it closes at once', async () => {
    renderPage('/');
    openApproval();

    fireEvent.click(approvalDialog().getByRole('button', { name: 'Decline' }));
    fireEvent.click(approvalDialog().getByRole('button', { name: 'Decline' }));

    await waitFor(() => expect(mockDropDecided).toHaveBeenCalledWith('prop-1'));
  });

  it('does not offer proposal decisions without Proposals Manage even with AlertZero All', () => {
    renderPage('/', { proposalsCapabilities: { showProposals: true, decideProposals: false } });
    // Only the read-only "Copy link" remains in the menu: no decision can be made from it.
    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));
    expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Revoke sessions' })).not.toBeInTheDocument();
    expect(approveMutateAsync).not.toHaveBeenCalled();
    expect(dismissMutateAsync).not.toHaveBeenCalled();
  });

  it('stays open and shows Applying while useIsApprovingProposal reports this proposal in flight', () => {
    mockUseIsApprovingProposal.mockImplementation((id: string) => id === 'prop-1');
    renderPage('/');
    openApproval();

    // The decision's own outcome shows in place — the modal never auto-closes, so a refusal
    // (expired deadline, someone decided first) reads the same way: still open. Approving only
    // resumes the gate workflow, whose action still runs afterward, so being in flight must not
    // yet claim "Applied" — only a refetched, real decision can.
    expect(approvalDialog().getAllByText('Applying').length).toBeGreaterThan(0);
    expect(approvalDialog().queryByText('Applied')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Revoke sessions' })).toBeInTheDocument();
  });

  it('shows the reason form in the same modal, not a second one, when Decline is clicked', () => {
    renderPage('/');
    openApproval();

    fireEvent.click(approvalDialog().getByRole('button', { name: 'Decline' }));

    // Same dialog, same title — its body swapped to the reason form rather than a second modal
    // (the old flow's own) opening beside or instead of it.
    expect(screen.getByRole('dialog', { name: 'Revoke sessions' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Action modal' })).not.toBeInTheDocument();
    expect(approvalDialog().getByRole('radio', { name: 'Decline without a reason' })).toBeChecked();
  });

  it('submits the selected reason and rationale, and returns to the read-only decided state', async () => {
    renderPage('/');
    openApproval();
    fireEvent.click(approvalDialog().getByRole('button', { name: 'Decline' }));

    fireEvent.click(
      approvalDialog().getByRole('radio', {
        name: 'No actions needed (risk is acceptable)',
      })
    );
    fireEvent.change(approvalDialog().getByRole('textbox'), {
      target: { value: 'Not worth chasing.' },
    });
    fireEvent.click(approvalDialog().getByRole('button', { name: 'Decline' }));

    await waitFor(() =>
      expect(dismissMutateAsync).toHaveBeenCalledWith({
        id: 'prop-1',
        body: { dismissReason: 'risk_accepted', rationale: 'Not worth chasing.' },
      })
    );
    // The modal resets its form once the decision resolves; wait for that before the test ends.
    await waitFor(() =>
      expect(approvalDialog().getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    );
  });

  it('returns to the approval view without declining when Cancel is clicked', () => {
    renderPage('/');
    openApproval();
    fireEvent.click(approvalDialog().getByRole('button', { name: 'Decline' }));

    fireEvent.click(approvalDialog().getByRole('button', { name: 'Cancel' }));

    expect(approvalDialog().getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(dismissMutateAsync).not.toHaveBeenCalled();
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

  it('offers only Copy link for a decided proposal when escalation is not available', async () => {
    // A decided investigation without `canManageEscalations` keeps just the read-only item.
    mockProposals({
      closed: [
        { ...actionProposal, decidedAt: '2024-01-02T00:00:00Z', status: 'succeeded' as const },
      ],
    });

    renderPage('/');
    await expandClosed();

    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Copy link']);
  });

  // That the scalar itself excludes decided proposals is covered in the service tests.
  it('counts only undecided proposals as work needing attention', () => {
    mockProposals({
      respond: [actionProposal],
      closed: [
        {
          ...actionProposal,
          id: 'prop-2',
          decidedAt: '2024-01-02T00:00:00Z',
          status: 'succeeded' as const,
        },
      ],
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
    mockProposals({
      closed: [
        { ...actionProposal, decidedAt: '2024-01-02T00:00:00Z', status: 'succeeded' as const },
      ],
    });
    mockOpenCount(0);

    renderPage('/');

    // Closed holds rows, but they are not work: the header must not read
    // "0 actions need you" beside them.
    expect(screen.getByText('No events found')).toBeInTheDocument();
  });
});

describe('ConversationsPage idle state', () => {
  it('shows the workers-running panel and idle header when nothing is open or closed', () => {
    mockProposals({});
    mockOpenCount(0);

    renderPage('/');

    expect(screen.getByTestId('alertZeroWorkersRunningPanel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'Your Watches are running. No actions need you'
    );
    expect(screen.getByTestId('alertZeroPageHeaderSubtitle')).toHaveTextContent(
      '4 Watches are running right now · 6 of 6 Workers are enabled'
    );
  });

  it('does not render the queue sections when idle', () => {
    mockProposals({});
    mockOpenCount(0);

    renderPage('/');

    expect(screen.getByTestId('alertZeroWorkersRunningPanel')).toBeInTheDocument();
    ['Investigate', 'Respond', 'Closed Actions'].forEach((name) =>
      expect(screen.queryByRole('button', { name: new RegExp(`^${name}`) })).not.toBeInTheDocument()
    );
  });

  it('renders the queue sections when not idle', () => {
    mockProposals({ respond: [{ ...proposal, category: 'respond' }] });
    mockOpenCount(1);

    renderPage('/');

    expect(screen.getByRole('button', { name: /^Respond/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Closed Actions/ })).toBeInTheDocument();
  });

  it('does not claim Workers are running when none is enabled', () => {
    mockProposals({});
    mockOpenCount(0);
    mockUseRunningSummary.mockReturnValue({ watchCount: 0, enabledWorkerCount: 0, workerCount: 5 });

    renderPage('/');

    expect(screen.queryByTestId('alertZeroWorkersRunningPanel')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toContain(
      'Your Watches are running'
    );
    expect(screen.getByRole('button', { name: /^Respond/ })).toBeInTheDocument();
  });

  it('keeps the queue sections and their retry control when a section failed to load', () => {
    mockProposals({});
    mockOpenCount(0);
    mockUseProposalsByCategoryCount.mockImplementation((category: string) => ({
      data: category === 'investigate' ? undefined : { proposals: [], total: 0 },
      isLoading: false,
      error: category === 'investigate' ? new Error('boom') : undefined,
    }));
    mockUseProposalsByCategory.mockImplementation((category: string) => ({
      data:
        category === 'investigate'
          ? undefined
          : { pages: [{ proposals: [], total: 0 }], pageParams: [undefined] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isInitialLoading: false,
      error: category === 'investigate' ? new Error('boom') : undefined,
    }));

    renderPage('/');

    expect(screen.queryByTestId('alertZeroWorkersRunningPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('conversationQueueError-investigate')).toBeInTheDocument();
  });

  it('hides the panel while proposals are open', () => {
    mockProposals({ investigate: [proposal] });
    mockOpenCount(1);

    renderPage('/');

    expect(screen.queryByTestId('alertZeroWorkersRunningPanel')).not.toBeInTheDocument();
  });

  it('hides the panel when the window holds only closed proposals', () => {
    mockProposals({
      closed: [{ ...proposal, decidedAt: '2024-01-02T00:00:00Z', status: 'succeeded' as const }],
    });
    mockOpenCount(0);

    renderPage('/');

    expect(screen.queryByTestId('alertZeroWorkersRunningPanel')).not.toBeInTheDocument();
  });
});

describe('ConversationsPage queue sections', () => {
  const closedProposal = {
    ...proposal,
    id: 'prop-c',
    decidedAt: '2024-01-02T00:00:00Z',
    status: 'succeeded' as const,
  };
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

    expect(screen.getByRole('button', { name: /^Closed Actions/ })).toHaveTextContent('2');
  });

  it('fetches rows once Closed is expanded', async () => {
    mockProposals({ closed: [closedProposal] });

    renderPage('/');
    await expandClosed();

    expect(mockUseClosedProposals).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true, firstPageSize: CLOSED_PAGE_SIZE })
    );
    expect(screen.getByText(closedProposal.conversationTitle!)).toBeInTheDocument();
  });

  it('stops the rows query again when Closed is collapsed', async () => {
    mockProposals({ closed: [closedProposal] });

    renderPage('/');
    await expandClosed();
    await expandClosed();

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

    expect(mockUseProposalsByCategoryCount).toHaveBeenCalledWith('respond', false, null);
    // Collapsed, so nothing else can report it.
    expect(mockUseClosedProposalsCount).toHaveBeenLastCalledWith(true, null);
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

    it('is offered on Closed too, once expanded', async () => {
      mockProposals({
        closed: bucketOf(CLOSED_PAGE_SIZE + 7).map((p) => ({
          ...p,
          decidedAt: '2024-01-02T00:00:00Z',
          status: 'succeeded' as const,
        })),
      });

      renderPage('/');
      await expandClosed();

      expect(screen.getByTestId('conversationQueueShowMore-closed')).toHaveTextContent(
        'Show more (7)'
      );
    });
  });

  it('reports a failed section without letting its neighbours vouch for it', () => {
    // The review this fixes: an aggregate across all four queries let a healthy
    // `respond` suppress a broken `investigate`, which then read as simply empty.
    mockProposals({ respond: [proposal] });
    mockUseProposalsByCategoryCount.mockImplementation((category: string) => ({
      data: category === 'investigate' ? undefined : { proposals: [], total: 1 },
      isLoading: false,
      error: category === 'investigate' ? new Error('boom') : undefined,
    }));
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

  it('scaffolds only as many rows as the bucket holds, not a whole page', async () => {
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
    await expandClosed();

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
  const pills = [
    { entityId: 'host-1', count: 1 },
    { entityId: 'user-1', count: 1 },
  ];

  beforeEach(() => {
    mockProposals({ investigate: [hostProposal, userProposal] });
    mockUseProposalImpactPills.mockReturnValue({ data: pills });
  });

  // Toggling a pill changes the section badges' text; awaiting flushes the resulting
  // MutationObserver update, which would otherwise land outside `act`.
  const togglePill = async (name: string) => {
    fireEvent.click(screen.getByRole('button', { name }));
    await act(async () => {});
  };

  afterEach(() => jest.clearAllMocks());

  it('reads the pills for the whole queue, not from the loaded rows', () => {
    renderPage('/');

    expect(mockUseProposalImpactPills).toHaveBeenCalledWith({
      origin: 'alertzero',
      categories: ['respond', 'investigate', 'configure'],
      decidedWithinHours: 72,
    });
  });

  it('keeps the pills when a section holding their entities is collapsed', async () => {
    mockProposals({
      respond: [{ ...proposal, id: 'prop-respond', category: 'respond', entityIds: ['host-9'] }],
      investigate: [hostProposal],
    });
    mockUseProposalImpactPills.mockReturnValue({
      data: [
        { entityId: 'host-1', count: 1 },
        { entityId: 'host-9', count: 1 },
      ],
    });
    mockOpenCount(2);
    renderPage('/');

    fireEvent.click(screen.getByRole('button', { name: /^Respond/ }));
    await act(async () => {});

    expect(screen.getByRole('button', { name: 'host-9' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'host-1' })).toBeInTheDocument();
  });

  it('asks every section for the selected entity, so the server filters them all', async () => {
    renderPage('/');

    await togglePill('host-1');

    for (const category of ['respond', 'investigate', 'configure']) {
      expect(mockUseProposalsByCategory).toHaveBeenCalledWith(
        category,
        expect.objectContaining({ entity: 'host-1' })
      );
      expect(mockUseProposalsByCategoryCount).toHaveBeenCalledWith(
        category,
        expect.any(Boolean),
        'host-1'
      );
    }
    expect(mockUseClosedProposals).toHaveBeenLastCalledWith(
      expect.objectContaining({ entity: 'host-1' })
    );
    expect(screen.getByText('Host investigation')).toBeInTheDocument();
    expect(screen.queryByText('User investigation')).not.toBeInTheDocument();
  });

  it('clears the filter when the selected pill is clicked again', async () => {
    renderPage('/');

    await togglePill('host-1');
    await togglePill('host-1');

    expect(mockUseProposalsByCategory.mock.calls.at(-1)?.[1]).toMatchObject({ entity: null });
    expect(screen.getByText('Host investigation')).toBeInTheDocument();
    expect(screen.getByText('User investigation')).toBeInTheDocument();
  });

  it('hides the pill row when the queue has no entities and leaves it unfiltered', () => {
    mockUseProposalImpactPills.mockReturnValue({ data: [] });
    mockProposals({ investigate: [{ ...proposal, conversationTitle: 'No impact' }] });
    renderPage('/');

    expect(screen.queryByRole('heading', { name: 'Impact' })).not.toBeInTheDocument();
    expect(screen.getByText('No impact')).toBeInTheDocument();
  });

  it('clears the filter when the selected entity disappears from the pills', async () => {
    const { rerender } = renderPage('/');

    await togglePill('host-1');
    expect(screen.queryByText('User investigation')).not.toBeInTheDocument();

    mockUseProposalImpactPills.mockReturnValue({ data: [{ entityId: 'user-1', count: 1 }] });
    rerender();

    expect(screen.queryByRole('button', { name: 'host-1' })).not.toBeInTheDocument();
    expect(screen.getByText('User investigation')).toBeInTheDocument();
    expect(screen.queryByText('No events match the current filter.')).not.toBeInTheDocument();
  });

  it('shows the filtered empty state in a section the selected entity does not reach', async () => {
    mockProposals({
      investigate: [hostProposal],
      respond: [
        {
          ...proposal,
          id: 'prop-respond',
          category: 'respond',
          conversationTitle: 'Respond investigation',
          entityIds: ['user-9'],
        },
      ],
    });
    renderPage('/');

    await togglePill('host-1');

    expect(screen.getByText('Host investigation')).toBeInTheDocument();
    expect(screen.queryByText('Respond investigation')).not.toBeInTheDocument();
    expect(screen.getAllByText('No events match the current filter.').length).toBeGreaterThan(0);
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

describe('ConversationsPage telemetry', () => {
  const secondProposal: ProposalItem = {
    ...proposal,
    id: 'prop-2',
    conversationId: 'inv-2',
    conversationTitle: 'Second investigation',
    title: 'Second action',
    status: 'executing',
    entityIds: ['host-1'],
  };

  beforeEach(() => {
    mockProposals({ investigate: [{ ...proposal, entityIds: ['user-1'] }, secondProposal] });
    // The server builds the Impact pills for the whole queue.
    mockUseProposalImpactPills.mockReturnValue({
      data: [
        { entityId: 'host-1', count: 1 },
        { entityId: 'user-1', count: 1 },
      ],
    });
  });

  afterEach(() => jest.clearAllMocks());

  const reportedEvents = (core: ReturnType<typeof renderPage>['core'], eventType: string) =>
    (core.analytics.reportEvent as jest.Mock).mock.calls.filter(([type]) => type === eventType);

  describe('alertzero_ui_home_opened', () => {
    it('reports once, with the open count as a range, when the queue data arrives', () => {
      mockOpenCount(12);

      const { core, rerender } = renderPage('/');
      // A poll that returns a new count is the same visit.
      mockOpenCount(60);
      rerender();

      expect(reportedEvents(core, 'alertzero_ui_home_opened')).toEqual([
        [
          'alertzero_ui_home_opened',
          { default_filters_changed: false, queue_size_bucket: '11_50' },
        ],
      ]);
    });

    it('waits for the queue data', () => {
      mockUseProposalChartsSummary.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined,
      });

      const { core, rerender } = renderPage('/');
      expect(reportedEvents(core, 'alertzero_ui_home_opened')).toEqual([]);

      mockOpenCount(0);
      rerender();
      expect(reportedEvents(core, 'alertzero_ui_home_opened')).toEqual([
        ['alertzero_ui_home_opened', { default_filters_changed: false, queue_size_bucket: '0' }],
      ]);
    });

    it('reports an unknown queue size, alongside the error, when the open count fails to load', () => {
      mockUseProposalChartsSummary.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
      });

      const { core } = renderPage('/');

      expect(reportedEvents(core, 'alertzero_ui_home_opened')).toEqual([
        [
          'alertzero_ui_home_opened',
          { default_filters_changed: false, queue_size_bucket: 'unknown' },
        ],
      ]);
      expect(reportedEvents(core, 'alertzero_ui_error_shown')).toEqual([
        ['alertzero_ui_error_shown', { error_class: 'unknown', surface: 'queue' }],
      ]);
    });

    it('reports once under StrictMode, which runs effects twice', () => {
      mockOpenCount(3);
      const core = coreMock.createStart();
      core.application.capabilities = {
        ...core.application.capabilities,
        proposals: { showProposals: true, decideProposals: true },
      };

      render(
        <React.StrictMode>
          <I18nProvider>
            <EuiProvider>
              <KibanaContextProvider
                services={{ ...core, agentBuilder: agentBuilderMocks.createStart() }}
              >
                <QueryClientProvider client={new QueryClient()}>
                  <Router history={createMemoryHistory({ initialEntries: ['/'] })}>
                    <ConversationsPage />
                  </Router>
                </QueryClientProvider>
              </KibanaContextProvider>
            </EuiProvider>
          </I18nProvider>
        </React.StrictMode>
      );

      expect(reportedEvents(core, 'alertzero_ui_home_opened')).toHaveLength(1);
    });
  });

  describe('alertzero_ui_queue_filtered', () => {
    it('reports picking an Impact filter, without the entity, and not clearing it', () => {
      const { core } = renderPage('/');

      fireEvent.click(screen.getByRole('button', { name: 'host-1' }));
      fireEvent.click(screen.getByRole('button', { name: 'host-1' }));

      expect(reportedEvents(core, 'alertzero_ui_queue_filtered')).toEqual([
        ['alertzero_ui_queue_filtered', { filter_type: 'impact' }],
      ]);
    });

    it('reports switching from one Impact filter to another', () => {
      const { core } = renderPage('/');

      fireEvent.click(screen.getByRole('button', { name: 'host-1' }));
      fireEvent.click(screen.getByRole('button', { name: 'user-1' }));

      expect(reportedEvents(core, 'alertzero_ui_queue_filtered')).toHaveLength(2);
    });
  });

  describe('alertzero_ui_brief_card_clicked', () => {
    it('reports the card section and position, and whether its proposal is pending', () => {
      const { core } = renderPage('/');

      fireEvent.click(screen.getByRole('button', { name: 'Second action' }));

      expect(reportedEvents(core, 'alertzero_ui_brief_card_clicked')).toEqual([
        [
          'alertzero_ui_brief_card_clicked',
          {
            conversation_type: 'investigation',
            has_pending_proposal: false,
            position_in_list: 1,
            section: 'investigate',
          },
        ],
      ]);
    });

    it('counts the position in the filtered list the analyst sees', () => {
      const { core } = renderPage('/');

      fireEvent.click(screen.getByRole('button', { name: 'host-1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Second action' }));

      expect(reportedEvents(core, 'alertzero_ui_brief_card_clicked')).toEqual([
        [
          'alertzero_ui_brief_card_clicked',
          {
            conversation_type: 'investigation',
            has_pending_proposal: false,
            position_in_list: 0,
            section: 'investigate',
          },
        ],
      ]);
    });

    it('does not report a flyout opened from the URL, such as a copied link', async () => {
      const { agentBuilder, core } = renderPage('/?selectedConversationId=inv-1');

      await waitFor(() => expect(agentBuilder.openConversationDetails).toHaveBeenCalled());
      expect(reportedEvents(core, 'alertzero_ui_brief_card_clicked')).toEqual([]);
    });
  });

  describe('alertzero_ui_error_shown', () => {
    it('reports a failed queue header once, however often it re-renders', () => {
      mockUseProposalChartsSummary.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
      });

      const { core, rerender } = renderPage('/');
      rerender();
      rerender();

      expect(reportedEvents(core, 'alertzero_ui_error_shown')).toEqual([
        ['alertzero_ui_error_shown', { error_class: 'unknown', surface: 'queue' }],
      ]);
    });

    it('reports a failed queue section once', () => {
      mockUseProposalsByCategory.mockImplementation((category: string) => ({
        data: undefined,
        fetchNextPage: jest.fn(),
        hasNextPage: undefined,
        isFetchingNextPage: false,
        isInitialLoading: false,
        error: category === 'investigate' ? new Error('boom') : undefined,
      }));

      const { core, rerender } = renderPage('/');
      rerender();

      expect(reportedEvents(core, 'alertzero_ui_error_shown')).toEqual([
        ['alertzero_ui_error_shown', { error_class: 'unknown', surface: 'queue' }],
      ]);
    });

    it('reports a failing queue header once while polls retry it', () => {
      const failed = {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: new Error('boom'),
      };
      mockUseProposalChartsSummary.mockReturnValue(failed);
      const { core, rerender } = renderPage('/');
      // A query without data drops its error while it refetches, so the header loads again.
      mockUseProposalChartsSummary.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        error: null,
      });
      rerender();
      mockUseProposalChartsSummary.mockReturnValue(failed);
      rerender();

      expect(reportedEvents(core, 'alertzero_ui_error_shown')).toHaveLength(1);
    });

    it('reports a failing queue section once while polls retry it', () => {
      const failedPage = (isRetrying: boolean) => (category: string) => ({
        data: undefined,
        fetchNextPage: jest.fn(),
        hasNextPage: undefined,
        isFetchingNextPage: false,
        isFetching: category === 'investigate' && isRetrying,
        isInitialLoading: category === 'investigate' && isRetrying,
        error: category === 'investigate' && !isRetrying ? new Error('boom') : undefined,
      });
      // A non-empty queue, so the page never swaps the sections for the idle panel.
      mockOpenCount(3);
      mockUseProposalsByCategory.mockImplementation(failedPage(false));
      const { core, rerender } = renderPage('/');
      mockUseProposalsByCategory.mockImplementation(failedPage(true));
      rerender();
      mockUseProposalsByCategory.mockImplementation(failedPage(false));
      rerender();

      expect(reportedEvents(core, 'alertzero_ui_error_shown')).toHaveLength(1);
    });

    it('reports a filtered queue that fails after the unfiltered one failed', () => {
      const failedPage =
        (loadingEntity?: string) =>
        (category: string, { entity }: { entity?: string | null }) => {
          const isLoading = category === 'investigate' && entity === loadingEntity;
          return {
            data: undefined,
            fetchNextPage: jest.fn(),
            hasNextPage: undefined,
            isFetchingNextPage: false,
            isFetching: isLoading,
            isInitialLoading: isLoading,
            error: category === 'investigate' && !isLoading ? new Error('boom') : undefined,
          };
        };
      mockOpenCount(3);
      mockUseProposalsByCategory.mockImplementation(failedPage());
      const { core, rerender } = renderPage('/');
      // The filtered query is on its first load when the pill is picked, then fails too.
      mockUseProposalsByCategory.mockImplementation(failedPage('host-1'));
      fireEvent.click(screen.getByRole('button', { name: 'host-1' }));
      mockUseProposalsByCategory.mockImplementation(failedPage());
      rerender();

      expect(reportedEvents(core, 'alertzero_ui_error_shown')).toHaveLength(2);
    });

    // More rows than the first page, so the respond section offers Show more.
    const respondPageAndMore = () =>
      Array.from({ length: CATEGORY_PAGE_SIZE + 5 }, (_, i) => ({
        ...proposal,
        id: `prop-${i}`,
        category: 'respond' as const,
      }));

    it('reports a failed Show more, below rows already on screen', async () => {
      mockProposals({ respond: respondPageAndMore() });
      const { core } = renderPage('/');
      fetchNextPage.respond.mockRejectedValueOnce(new Error('boom'));

      fireEvent.click(screen.getByTestId('conversationQueueShowMore-respond'));

      await waitFor(() =>
        expect(reportedEvents(core, 'alertzero_ui_error_shown')).toEqual([
          ['alertzero_ui_error_shown', { error_class: 'unknown', surface: 'queue' }],
        ])
      );
    });

    it('reports each Show more the analyst retries that fails again', async () => {
      mockProposals({ respond: respondPageAndMore() });
      const { core } = renderPage('/');
      fetchNextPage.respond
        .mockRejectedValueOnce(new Error('boom'))
        .mockRejectedValueOnce(new Error('boom'));
      fireEvent.click(screen.getByTestId('conversationQueueShowMore-respond'));
      await waitFor(() => expect(reportedEvents(core, 'alertzero_ui_error_shown')).toHaveLength(1));

      fireEvent.click(screen.getByTestId('conversationQueueShowMore-respond'));

      await waitFor(() => expect(reportedEvents(core, 'alertzero_ui_error_shown')).toHaveLength(2));
    });

    it('never sends the error message', () => {
      mockUseProposalChartsSummary.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('index [secret-index] not found'),
      });

      const { core } = renderPage('/');

      expect(JSON.stringify(reportedEvents(core, 'alertzero_ui_error_shown'))).not.toContain(
        'secret-index'
      );
    });
  });
});
