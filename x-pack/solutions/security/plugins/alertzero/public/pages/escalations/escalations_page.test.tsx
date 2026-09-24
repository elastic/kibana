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
  useListEscalations,
  useUserProfiles,
  useSuggestUserProfiles,
} from '@kbn/agentic-investigations-plugin/public';
import { useInvestigationDetails } from '../conversations/use_investigation_details';
import { useConversationsUrlParams } from '../conversations/conversations_url_params';
import { EscalationsPage } from './escalations_page';

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
  useListEscalations: jest.fn(),
  useUserProfiles: jest.fn(),
  useSuggestUserProfiles: jest.fn(),
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
const mockUseUserProfiles = useUserProfiles as jest.Mock;
const mockUseSuggestUserProfiles = useSuggestUserProfiles as jest.Mock;
const mockUseInvestigationDetails = useInvestigationDetails as jest.Mock;
const mockUseConversationsUrlParams = useConversationsUrlParams as jest.Mock;

// Stable URL-param spies — recreated in beforeEach so jest.clearAllMocks() can track calls.
let selectConversation: jest.Mock;
let clearSelectedConversation: jest.Mock;

const openEscalation = {
  id: 'esc-open-1',
  title: 'Suspicious login',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  metadata: {},
};

const closedEscalation = {
  id: 'esc-closed-1',
  title: 'Resolved threat',
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-04T00:00:00Z',
  metadata: { status: 'closed' },
};

const assignMutate = jest.fn().mockResolvedValue({});

const renderPage = (overrides: { capabilities?: object } = {}) => {
  const core = coreMock.createStart();
  // Grant both show and manage by default.
  (core.application.capabilities as Record<string, unknown>).agenticInvestigations = {
    showEscalations: true,
    manageEscalations: true,
    ...((overrides.capabilities as object | undefined) ?? {}),
  };
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

beforeEach(() => {
  selectConversation = jest.fn();
  clearSelectedConversation = jest.fn();
  mockUseConversationsUrlParams.mockReturnValue({
    selectedConversationId: undefined,
    selectConversation,
    clearSelectedConversation,
  });
  mockUseInvestigationDetails.mockImplementation(() => undefined);
  mockUseAssignEscalation.mockReturnValue({ mutateAsync: assignMutate });
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

  it('shows "No escalations" when both queues are empty', () => {
    mockBothQueues([], []);
    renderPage();

    // Both groups render their own empty state, so there are two "No escalations" labels.
    expect(screen.getAllByText('No escalations')).toHaveLength(2);
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

  it('opens the flyout when a row card is clicked', () => {
    mockBothQueues([openEscalation], []);
    renderPage();

    fireEvent.click(screen.getByTestId('escalationCard-esc-open-1'));

    expect(selectConversation).toHaveBeenCalledWith('esc-open-1');
  });

  it('clears the URL when the flyout closes', () => {
    // Capture the onClose passed to the details hook so we can invoke it.
    let capturedOnClose: (() => void) | undefined;
    mockUseInvestigationDetails.mockImplementation(({ onClose }: { onClose: () => void }) => {
      capturedOnClose = onClose;
    });

    mockBothQueues([openEscalation], []);
    renderPage();

    act(() => {
      capturedOnClose?.();
    });

    expect(clearSelectedConversation).toHaveBeenCalled();
  });

  it('does not duplicate rows when the same page 2 data is re-delivered (refetch regression)', async () => {
    // The old append-only implementation pushed new items on every `useEffect` fire.
    // A refetch of page 2 (same page, new object reference) would append a second copy.
    // The new page-keyed state replaces the entry instead, preventing duplication.
    const page2Item = {
      id: 'esc-p2',
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
});
