/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import {
  useAssignEscalation,
  useEscalationImpactPills,
  useListEscalations,
  useUserProfiles,
  useSuggestUserProfiles,
  useOpenInChat,
} from '@kbn/agentic-investigations-plugin/public';
import { useAlertZeroInvestigationsCapabilities } from '../../hooks/use_alertzero_investigations_capabilities';
import { useConversationsUrlParams } from '../conversations/conversations_url_params';
import { useInvestigationDetails } from '../conversations/use_investigation_details';
import { EscalationsPage } from './escalations_page';

jest.mock('../../hooks/use_alertzero_investigations_capabilities');
const mockUseCapabilities = useAlertZeroInvestigationsCapabilities as jest.Mock;

// These hooks open the Agent Builder flyout and manage the URL; stub them out here.
jest.mock('../conversations/use_investigation_details', () => ({
  useInvestigationDetails: jest.fn(),
}));
jest.mock('../conversations/conversations_url_params', () => ({
  useConversationsUrlParams: jest.fn(),
}));

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-plugin/public'),
  useAssignEscalation: jest.fn(),
  useEscalationImpactPills: jest.fn(),
  useListEscalations: jest.fn(),
  useUserProfiles: jest.fn(),
  useSuggestUserProfiles: jest.fn(),
  useOpenInChat: jest.fn(),
}));

// Replace AssignToUsers with a minimal stub: clicking the "assign" button calls
// onChange with a known profile. This isolates the page-level mutation wiring from the
// internals of the EUI UserProfilesPopover (which renders in a portal difficult to drive
// in JSDOM tests).
jest.mock('@kbn/agentic-investigations-common', () => {
  const actual = jest.requireActual('@kbn/agentic-investigations-common');
  return {
    ...actual,
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

// Doc-title hook has a DOM side-effect irrelevant to these tests.
jest.mock('../../hooks/use_alertzero_doc_title', () => ({
  useAlertZeroDocTitle: jest.fn(),
}));

const mockUseAssignEscalation = useAssignEscalation as jest.Mock;
const mockUseListEscalations = useListEscalations as jest.Mock;
const mockUseEscalationImpactPills = useEscalationImpactPills as jest.Mock;

/** What the pills hook returns once the server has sent every pill. */
const pagedPills = (pills: Array<{ entityId: string; count: number }>) => ({
  pills,
  total: pills.length,
  remaining: 0,
  canShowMore: true,
  reachLimit: 10_000,
  loadFailed: false,
  isLoadingMore: false,
  showMore: jest.fn(),
});
const mockUseUserProfiles = useUserProfiles as jest.Mock;
const mockUseSuggestUserProfiles = useSuggestUserProfiles as jest.Mock;
const mockUseOpenInChat = useOpenInChat as jest.Mock;
const mockUseConversationsUrlParams = useConversationsUrlParams as jest.Mock;
const mockUseInvestigationDetails = useInvestigationDetails as jest.Mock;
let selectConversation: jest.Mock;
let clearSelectedConversation: jest.Mock;

let openChat: jest.Mock;

const openEscalation = {
  id: 'esc-open-1',
  agent_id: 'agent-1',
  title: 'Suspicious login',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  metadata: {},
};

const closedEscalation = {
  id: 'esc-closed-1',
  agent_id: 'agent-1',
  title: 'Resolved threat',
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-04T00:00:00Z',
  metadata: { status: 'closed' },
};

const assignMutate = jest.fn().mockResolvedValue({});

const renderPage = (
  overrides: {
    capabilities?: {
      showEscalations?: boolean;
      manageEscalations?: boolean;
      canAccessAgentBuilder?: boolean;
    };
  } = {}
) => {
  mockUseCapabilities.mockReturnValue({
    showEscalations: true,
    manageEscalations: true,
    manageInvestigations: true,
    canAccessAgentBuilder: true,
    ...overrides.capabilities,
  });
  const core = coreMock.createStart();
  const history = createMemoryHistory();
  // A fresh client per test so cache from one test never bleeds into the next.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const ui = (
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <QueryClientProvider client={queryClient}>
            <Router history={history}>
              <EscalationsPage />
            </Router>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  const { rerender: rtlRerender } = render(ui);
  const rerender = () => rtlRerender(ui);

  return { core, rerender };
};

let getChatHref: jest.Mock;

beforeEach(() => {
  openChat = jest.fn();
  getChatHref = jest.fn((id?: string, agentId?: string) =>
    id ? `/mock-chat/${agentId}/${id}` : undefined
  );
  mockUseOpenInChat.mockReturnValue({ getChatHref, openChat });
  selectConversation = jest.fn();
  clearSelectedConversation = jest.fn();
  mockUseCapabilities.mockReturnValue({
    showEscalations: true,
    manageEscalations: true,
    manageInvestigations: true,
  });
  mockUseConversationsUrlParams.mockReturnValue({
    selectedConversationId: undefined,
    selectConversation,
    clearSelectedConversation,
  });
  mockUseInvestigationDetails.mockImplementation(() => undefined);
  mockUseAssignEscalation.mockReturnValue({ mutateAsync: assignMutate });
  mockUseEscalationImpactPills.mockReturnValue(pagedPills([]));
  mockUseUserProfiles.mockReturnValue({ data: [], isLoading: false });
  mockUseSuggestUserProfiles.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => jest.clearAllMocks());

/**
 * Sets up both list queries — open and closed — with the given results.
 *
 * The result objects are created once outside `mockImplementation` so that
 * every call during a render cycle returns the same reference. If the mock
 * returned a new object on each call, the `useEffect([openQuery.data])` in
 * EscalationsPage would fire on every render and cause an infinite loop.
 */
const mockBothQueues = (
  open: object[] = [],
  closed: object[] = [],
  opts: { isLoading?: boolean; error?: Error; openTotal?: number; closedTotal?: number } = {}
) => {
  const openResult = {
    data: opts.isLoading
      ? undefined
      : {
          results: open,
          pagination: { total: opts.openTotal ?? open.length, page: 1, per_page: 50 },
        },
    isLoading: opts.isLoading ?? false,
    error: opts.error ?? null,
  };
  const closedResult = {
    data: opts.isLoading
      ? undefined
      : {
          results: closed,
          pagination: { total: opts.closedTotal ?? closed.length, page: 1, per_page: 50 },
        },
    isLoading: opts.isLoading ?? false,
    error: opts.error ?? null,
  };
  mockUseListEscalations.mockImplementation(({ status }: { status: string }) =>
    status === 'open' ? openResult : closedResult
  );
};

describe('EscalationsPage', () => {
  it('renders the "Open" and "Closed" queue sections', () => {
    mockBothQueues([openEscalation], [closedEscalation]);
    renderPage();

    expect(screen.getByTestId('escalationQueue-open')).toBeInTheDocument();
    expect(screen.getByTestId('escalationQueue-closed')).toBeInTheDocument();
  });

  it('does not show the Alert Zero note in the Open section when there are open escalations', () => {
    mockBothQueues([openEscalation], [closedEscalation]);
    renderPage();

    expect(screen.queryByTestId('alertZeroEscalationsOpenNote')).not.toBeInTheDocument();
  });

  it('says there are no open escalations when the Open list is empty', () => {
    mockBothQueues([], [closedEscalation]);
    renderPage();

    expect(screen.getByTestId('alertZeroEscalationsOpenNote')).toHaveTextContent(
      'No open escalations'
    );
  });

  it('links to the Alert Zero page from the Open section note', () => {
    mockBothQueues([], [closedEscalation]);
    renderPage();

    expect(screen.getByTestId('alertZeroEscalationsOpenNoteLink')).toHaveTextContent(
      'Alert Zero page'
    );
  });

  it('shows the open escalation title', () => {
    mockBothQueues([openEscalation], []);
    renderPage();

    expect(screen.getByText('Suspicious login')).toBeInTheDocument();
  });

  it('shows the closed escalation title', () => {
    mockBothQueues([], [closedEscalation]);
    renderPage();

    expect(screen.getByText('Resolved threat')).toBeInTheDocument();
  });

  it('shows only the explainer banner when there are no escalations at all', () => {
    mockBothQueues([], []);
    renderPage();

    expect(screen.getByTestId('alertZeroEscalationsEmptyBanner')).toBeInTheDocument();
    expect(screen.queryByTestId('escalationsPageHeader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('escalationQueue-open')).not.toBeInTheDocument();
    expect(screen.queryByTestId('escalationQueue-closed')).not.toBeInTheDocument();
  });

  it('hides the explainer banner when any escalation exists', () => {
    mockBothQueues([openEscalation], []);
    renderPage();

    expect(screen.queryByTestId('alertZeroEscalationsEmptyBanner')).not.toBeInTheDocument();
  });

  it('renders the hero header with the open-escalation count', () => {
    mockBothQueues([openEscalation], [closedEscalation]);
    renderPage();

    expect(screen.getByTestId('escalationsPageHeader')).toBeInTheDocument();
    // "1 open escalation" from the header count
    expect(screen.getByText(/1 open escalation/)).toBeInTheDocument();
  });

  it('shows a loading spinner while queries are in flight', () => {
    mockBothQueues([], [], { isLoading: true });
    renderPage();

    // Both queues loading → spinner visible, queue panels not
    expect(screen.queryByTestId('escalationQueue-open')).not.toBeInTheDocument();
  });

  it('shows an error prompt when both queries fail and no data is available', () => {
    mockUseListEscalations.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });
    renderPage();

    expect(screen.queryByTestId('escalationQueue-open')).not.toBeInTheDocument();
  });

  it('shows "Nothing attached" for an escalation with no linked investigations', () => {
    mockBothQueues([{ ...openEscalation, metadata: {} }], []);
    renderPage();

    expect(screen.getByText('Nothing attached')).toBeInTheDocument();
  });

  it('calls the assign mutation when assignees change', () => {
    mockBothQueues([openEscalation], []);
    renderPage();

    // Simulate the stub AssignToUsers calling onChange with a new profile selection.
    const assignButton = screen.getByTestId('mock-assign-esc-open-1');
    fireEvent.click(assignButton);

    expect(assignMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        escalationId: 'esc-open-1',
        assignees: ['user-uid-1'],
      })
    );
  });

  it('shows a success toast when the assignee update succeeds', async () => {
    mockBothQueues([openEscalation], []);
    const { core } = renderPage();

    fireEvent.click(screen.getByTestId('mock-assign-esc-open-1'));

    // mutateAsync resolves in the next microtask tick; wait for the toast.
    await waitFor(() =>
      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Assignees updated')
    );
  });

  it('renders the assignee widget as read-only for closed escalations regardless of canManage', () => {
    mockBothQueues([], [closedEscalation]);
    renderPage();

    // Closed bucket accordion is collapsed by default; open it by clicking the heading.
    // getByRole avoids ambiguity with the per-card "Closed" status badge.
    fireEvent.click(screen.getByRole('heading', { name: 'Closed' }));

    expect(screen.getByTestId('mock-assignees-readonly-esc-closed-1')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-assign-esc-closed-1')).not.toBeInTheDocument();
  });

  it('renders the assignee widget as read-only when manageEscalations is false', () => {
    mockBothQueues([openEscalation], []);
    renderPage({ capabilities: { showEscalations: true, manageEscalations: false } });

    // Read-only stub is rendered; interactive stub is not.
    expect(screen.getByTestId('mock-assignees-readonly-esc-open-1')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-assign-esc-open-1')).not.toBeInTheDocument();
  });

  describe('without the Agent Builder privilege', () => {
    it('explains which features are unavailable in a callout', () => {
      mockBothQueues([openEscalation], []);
      renderPage({ capabilities: { canAccessAgentBuilder: false } });

      expect(screen.getByTestId('alertZeroAgentBuilderPrivilegeCallout')).toHaveTextContent(
        'You need the Agent Builder Kibana privilege to open investigations and chats'
      );
    });

    it('leaves the cards inert and hides the assignees', () => {
      mockBothQueues([openEscalation], []);
      renderPage({ capabilities: { canAccessAgentBuilder: false } });

      fireEvent.click(screen.getByTestId('escalationCard-esc-open-1'));

      expect(openChat).not.toHaveBeenCalled();
      expect(screen.queryByTestId('escalationCardLink-esc-open-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-assign-esc-open-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-assignees-readonly-esc-open-1')).not.toBeInTheDocument();
    });
  });

  it('shows no privilege callout when Agent Builder is accessible', () => {
    mockBothQueues([openEscalation], []);
    renderPage();

    expect(screen.queryByTestId('alertZeroAgentBuilderPrivilegeCallout')).not.toBeInTheDocument();
  });

  it('shows the server total in the bucket badge even when the page holds fewer items', () => {
    // Server says there are 75 open escalations but only 50 are returned per page.
    mockBothQueues([openEscalation], [], { openTotal: 75 });
    renderPage();

    // The badge in the Open accordion header should show 75, not 1.
    expect(screen.getByTestId('escalationQueue-open')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders a "Show more" button when there are more items than loaded', () => {
    mockBothQueues([openEscalation], [], { openTotal: 75 });
    renderPage();

    // 1 loaded, 75 total → "Show more (74)"
    expect(screen.getByTestId('escalationQueueLoadMore-open')).toBeInTheDocument();
    expect(screen.getByText('Show more (74)')).toBeInTheDocument();
  });

  it('shows an inline error for a failing bucket without hiding the other bucket', () => {
    // Build stable result objects outside mockImplementation to prevent reference
    // churn from triggering the useEffect([query.data]) on every render.
    const openResult = {
      data: { results: [openEscalation], pagination: { total: 1, page: 1, per_page: 50 } },
      isLoading: false,
      error: null,
    };
    const closedResult = {
      data: undefined,
      isLoading: false,
      error: new Error('Closed query failed'),
    };
    mockUseListEscalations.mockImplementation(({ status }: { status: string }) =>
      status === 'open' ? openResult : closedResult
    );
    renderPage();

    // Open bucket is still visible.
    expect(screen.getByTestId('escalationQueue-open')).toBeInTheDocument();
    // Closed bucket renders an inline error, not a page-level empty prompt that hides open.
    expect(screen.getByTestId('escalationQueue-closed')).toBeInTheDocument();
    expect(screen.getByText('Failed to load escalations')).toBeInTheDocument();
  });

  it('navigates to Agent Builder when a row card is clicked', () => {
    mockBothQueues([openEscalation], []);
    renderPage();

    fireEvent.click(screen.getByTestId('escalationCard-esc-open-1'));

    expect(openChat).toHaveBeenCalledWith('esc-open-1', 'agent-1');
  });

  it('renders card titles as links with hrefs from getChatHref', () => {
    mockBothQueues([openEscalation], []);
    renderPage();

    expect(getChatHref).toHaveBeenCalledWith('esc-open-1', 'agent-1');
    const link = screen.getByTestId('escalationCardLink-esc-open-1');
    expect(link).toHaveAttribute('href', '/mock-chat/agent-1/esc-open-1');
  });

  it('does not duplicate rows when the same page 2 data is re-delivered (refetch regression)', async () => {
    // The old append-only implementation pushed new items on every `useEffect` fire.
    // A refetch of page 2 (same page, new object reference) would append a second copy.
    // The new page-keyed state replaces the entry instead, preventing duplication.
    const page2Item = {
      id: 'esc-p2',
      agent_id: 'agent-1',
      title: 'Page 2 escalation',
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-02-02T00:00:00Z',
      metadata: {},
    };
    const stableClosedResult = {
      data: { results: [], pagination: { total: 0, page: 1, per_page: 1 } },
      isLoading: false,
      error: null,
    };
    // Stable page-1 and page-2 result objects. The page-2 object is reassigned below
    // to a new reference to simulate a refetch; page-1 stays stable throughout.
    const page1Result = {
      data: { results: [openEscalation], pagination: { total: 2, page: 1, per_page: 1 } },
      isLoading: false,
      error: null,
    };
    let page2Result = {
      data: { results: [page2Item], pagination: { total: 2, page: 2, per_page: 1 } },
      isLoading: false,
      error: null,
    };
    // Route by page so "Show more" (page=2 query) gets page-2 data.
    mockUseListEscalations.mockImplementation(
      ({ status, page }: { status: string; page: number }) => {
        if (status !== 'open') return stableClosedResult;
        return page === 1 ? page1Result : page2Result;
      }
    );

    const { rerender } = renderPage();

    // Page 1: only openEscalation visible; "Show more" button available (total=2, loaded=1).
    expect(screen.getByText('Suspicious login')).toBeInTheDocument();
    expect(screen.getByTestId('escalationQueueLoadMore-open')).toBeInTheDocument();

    // Click "Show more" → component increments openPage to 2 → useListEscalations called
    // with page=2 → page2Result returned → useEffect fires → openPages[2] set.
    fireEvent.click(screen.getByTestId('escalationQueueLoadMore-open'));
    await waitFor(() => {
      expect(screen.getByText('Page 2 escalation')).toBeInTheDocument();
    });
    expect(screen.getByText('Suspicious login')).toBeInTheDocument();

    // Simulate a refetch: replace page2Result with a new object (same content, new ref).
    // The useEffect dependency [openQuery.data] changes → effect fires again.
    page2Result = {
      data: { results: [page2Item], pagination: { total: 2, page: 2, per_page: 1 } },
      isLoading: false,
      error: null,
    };
    await act(async () => {
      rerender();
    });

    // Both items still present exactly once — page-keyed state replaces, not appends.
    expect(screen.getByText('Suspicious login')).toBeInTheDocument();
    expect(screen.getAllByText('Page 2 escalation')).toHaveLength(1);
  });

  describe('Impact filter', () => {
    const impactOpen = { ...openEscalation, entity_ids: ['FIN-DC-01', 'Sales-NAS'] };
    const impactClosed = { ...closedEscalation, entity_ids: ['FIN-DC-01'] };
    const pills = [
      { entityId: 'FIN-DC-01', count: 2 },
      { entityId: 'Sales-NAS', count: 1 },
    ];

    /** The server applies the entity filter, so the fake narrows the rows the same way. */
    const mockServerFiltering = (open: object[], closed: object[], openTotal?: number) => {
      const results = new Map<string, object>();
      mockUseListEscalations.mockImplementation(
        ({ status, entity }: { status: string; entity?: string | null }) => {
          const rows = (status === 'open' ? open : closed).filter(
            (row) => !entity || (row as { entity_ids?: string[] }).entity_ids?.includes(entity)
          );
          const key = `${status}-${entity ?? ''}`;
          if (!results.has(key)) {
            results.set(key, {
              data: {
                results: rows,
                pagination: {
                  total: !entity && status === 'open' ? openTotal ?? rows.length : rows.length,
                  page: 1,
                  per_page: 50,
                },
              },
              isLoading: false,
              error: null,
            });
          }
          return results.get(key);
        }
      );
    };

    beforeEach(() => {
      mockUseEscalationImpactPills.mockReturnValue(pagedPills(pills));
    });

    it('renders one pill per entity the pills query returns', () => {
      mockBothQueues([impactOpen], [impactClosed]);
      renderPage();

      expect(screen.getByRole('button', { name: 'FIN-DC-01' })).toHaveTextContent('2');
      expect(screen.getByRole('button', { name: 'Sales-NAS' })).toHaveTextContent('1');
    });

    it('renders no pills when no escalation has an impact', () => {
      mockUseEscalationImpactPills.mockReturnValue(pagedPills([]));
      mockBothQueues([openEscalation], [closedEscalation]);
      renderPage();

      expect(screen.queryByText('Impact')).not.toBeInTheDocument();
    });

    it('asks both queues for the selected entity and restores them on a second click', () => {
      mockServerFiltering([impactOpen], [impactClosed]);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Sales-NAS' }));

      expect(mockUseListEscalations).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open', entity: 'Sales-NAS' })
      );
      expect(mockUseListEscalations).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'closed', entity: 'Sales-NAS' })
      );
      expect(screen.getByText('Suspicious login')).toBeInTheDocument();
      expect(screen.queryByText('Resolved threat')).not.toBeInTheDocument();
      expect(screen.getByText('No escalations match the current filter.')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Sales-NAS' }));
      expect(screen.getByText('Suspicious login')).toBeInTheDocument();
      expect(screen.getByText('Resolved threat')).toBeInTheDocument();
    });

    it('keeps the unfiltered open count in the header while filtered', () => {
      mockServerFiltering([impactOpen], [impactClosed], 7);
      renderPage();
      expect(screen.getByText(/7 open escalations/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Sales-NAS' }));

      expect(screen.getByText(/7 open escalations/)).toBeInTheDocument();
    });

    it('loads the next page of pills from the +n pill', () => {
      const showMore = jest.fn();
      mockUseEscalationImpactPills.mockReturnValue({
        ...pagedPills(pills),
        remaining: 40,
        showMore,
      });
      mockBothQueues([impactOpen], [impactClosed]);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Show 40 more' }));

      expect(showMore).toHaveBeenCalledTimes(1);
    });

    it('starts both queues over at page 1 when the filter changes', () => {
      mockServerFiltering([impactOpen], [impactClosed]);
      renderPage();
      mockUseListEscalations.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'Sales-NAS' }));

      const filteredCalls = mockUseListEscalations.mock.calls
        .map(([options]) => options)
        .filter(({ entity }) => entity === 'Sales-NAS');
      expect(filteredCalls.length).toBeGreaterThan(0);
      expect(filteredCalls.every(({ page }) => page === 1)).toBe(true);
    });
  });
});
