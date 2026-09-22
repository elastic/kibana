/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import {
  useListEscalations,
  useUpdateEscalation,
  useEscalationUserProfiles,
  useSuggestEscalationAssignees,
} from '@kbn/agentic-investigations-plugin/public';
import { EscalationsPage } from './escalations_page';

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-plugin/public'),
  useListEscalations: jest.fn(),
  useUpdateEscalation: jest.fn(),
  useEscalationUserProfiles: jest.fn(),
  useSuggestEscalationAssignees: jest.fn(),
}));

// Replace EscalationAssignees with a minimal stub: clicking the "assign" button calls
// onChange with a known profile. This isolates the page-level mutation wiring from the
// internals of the EUI UserProfilesPopover (which renders in a portal difficult to drive
// in JSDOM tests).
jest.mock('@kbn/agentic-investigations-common', () => {
  const actual = jest.requireActual('@kbn/agentic-investigations-common');
  return {
    ...actual,
    // eslint-disable-next-line react/display-name
    EscalationAssignees: ({
      escalationId,
      onChange,
      canManage,
    }: {
      escalationId: string;
      onChange: (s: unknown[]) => void;
      canManage: boolean;
    }) =>
      canManage ? (
        <button
          data-test-subj={`mock-assign-${escalationId}`}
          onClick={() =>
            onChange([{ uid: 'user-uid-1', enabled: true, user: { username: 'alice' }, data: {} }])
          }
        >
          Assign
        </button>
      ) : (
        <span data-test-subj={`mock-assignees-readonly-${escalationId}`}>Read-only</span>
      ),
  };
});

// Doc-title hook has a DOM side-effect irrelevant to these tests.
jest.mock('../../hooks/use_alertzero_doc_title', () => ({
  useAlertZeroDocTitle: jest.fn(),
}));

const mockUseListEscalations = useListEscalations as jest.Mock;
const mockUseUpdateEscalation = useUpdateEscalation as jest.Mock;
const mockUseEscalationUserProfiles = useEscalationUserProfiles as jest.Mock;
const mockUseSuggestEscalationAssignees = useSuggestEscalationAssignees as jest.Mock;

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

const updateMutate = jest.fn();

const renderPage = (overrides: { capabilities?: object } = {}) => {
  const core = coreMock.createStart();
  // Grant both show and manage by default.
  (core.application.capabilities as Record<string, unknown>).agenticInvestigations = {
    showEscalations: true,
    manageEscalations: true,
    ...((overrides.capabilities as object | undefined) ?? {}),
  };
  const history = createMemoryHistory();

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <Router history={history}>
            <EscalationsPage />
          </Router>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { core };
};

beforeEach(() => {
  mockUseUpdateEscalation.mockReturnValue({ mutate: updateMutate });
  mockUseEscalationUserProfiles.mockReturnValue({ data: [], isLoading: false });
  mockUseSuggestEscalationAssignees.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => jest.clearAllMocks());

/** Sets up both list queries — open and closed — with the given results. */
const mockBothQueues = (
  open: object[] = [],
  closed: object[] = [],
  opts: { isLoading?: boolean; error?: Error; openTotal?: number; closedTotal?: number } = {}
) => {
  mockUseListEscalations.mockImplementation(({ status }: { status: string }) => {
    if (status === 'open') {
      return {
        data: {
          results: open,
          pagination: { total: opts.openTotal ?? open.length, page: 1, per_page: 50 },
        },
        isLoading: opts.isLoading ?? false,
        error: opts.error ?? null,
      };
    }
    return {
      data: {
        results: closed,
        pagination: { total: opts.closedTotal ?? closed.length, page: 1, per_page: 50 },
      },
      isLoading: opts.isLoading ?? false,
      error: opts.error ?? null,
    };
  });
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

  it('calls the update mutation when assignees change', () => {
    mockBothQueues([openEscalation], []);
    renderPage();

    // Simulate the stub EscalationAssignees calling onChange with a new profile selection.
    const assignButton = screen.getByTestId('mock-assign-esc-open-1');
    fireEvent.click(assignButton);

    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        escalationId: 'esc-open-1',
        body: expect.objectContaining({ assignees: ['user-uid-1'] }),
      }),
      expect.anything()
    );
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

  it('shows an inline error for a failing bucket without hiding the other bucket', () => {
    mockUseListEscalations.mockImplementation(({ status }: { status: string }) => {
      if (status === 'open') {
        return {
          data: {
            results: [openEscalation],
            pagination: { total: 1, page: 1, per_page: 50 },
          },
          isLoading: false,
          error: null,
        };
      }
      // Closed query fails.
      return {
        data: undefined,
        isLoading: false,
        error: new Error('Closed query failed'),
      };
    });
    renderPage();

    // Open bucket is still visible.
    expect(screen.getByTestId('escalationQueue-open')).toBeInTheDocument();
    // Closed bucket renders an inline error, not a page-level empty prompt that hides open.
    expect(screen.getByTestId('escalationQueue-closed')).toBeInTheDocument();
    expect(screen.getByText('Failed to load escalations')).toBeInTheDocument();
  });
});
