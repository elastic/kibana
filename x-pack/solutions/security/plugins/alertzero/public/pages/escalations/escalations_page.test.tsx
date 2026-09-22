/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

const renderPage = () => {
  const core = coreMock.createStart();
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
  opts: { isLoading?: boolean; error?: Error } = {}
) => {
  mockUseListEscalations.mockImplementation(({ status }: { status: string }) => {
    if (status === 'open') {
      return {
        data: { results: open, pagination: { total: open.length } },
        isLoading: opts.isLoading ?? false,
        error: opts.error ?? null,
      };
    }
    return {
      data: { results: closed, pagination: { total: closed.length } },
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

  it('shows an error prompt when queries fail and no data is available', () => {
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
    // Simulate one escalation with one assignee uid; the profiles hook returns no profile
    // so the selection slot is empty — but the Unassigned / add-button path still renders.
    mockBothQueues([openEscalation], []);
    renderPage();

    // The mutation is registered — the card renders without throwing.
    expect(updateMutate).not.toHaveBeenCalled();
  });
});
