/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { EventInvestigation, type EventInvestigationProps } from './event_investigation';

const mockOpenConversationDetails = jest.fn();
let mockAgentBuilder: { openConversationDetails: jest.Mock } | undefined;

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { agentBuilder: mockAgentBuilder } }),
}));

const details: Investigation = {
  id: 'conv-1',
  title: 'Latency spike on web-frontend',
  title_pending: false,
  created_at: '2026-07-10T12:00:00Z',
  updated_at: '2026-07-10T12:05:00Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', summary: 'Checkout deploy introduced a regression.' },
  in_progress: false,
  subjects: [],
  proposals: [],
};

const recorded = {
  workflow_execution_id: 'conv-1',
  started_at: '2026-07-10T12:00:00Z',
  completed_at: '2026-07-10T12:05:00Z',
};

const renderInvestigation = (props: Partial<EventInvestigationProps> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <EventInvestigation
          investigation={recorded}
          status="complete"
          details={details}
          {...props}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('EventInvestigation', () => {
  beforeEach(() => {
    mockOpenConversationDetails.mockClear();
    mockAgentBuilder = { openConversationDetails: mockOpenConversationDetails };
  });

  it('shows an empty state without an investigation', () => {
    renderInvestigation({ investigation: undefined, details: undefined });

    expect(screen.getByTestId('nightshiftInvestigationEmptyState')).toHaveTextContent(
      'No investigation yet.'
    );
    expect(
      screen.queryByTestId('nightshiftInvestigationShowDetailsButton')
    ).not.toBeInTheDocument();
  });

  it('renders the investigation output from the shared API', () => {
    renderInvestigation();

    expect(screen.getByText('Investigation complete')).toBeInTheDocument();
    expect(screen.getByText('Checkout deploy introduced a regression.')).toBeInTheDocument();
  });

  it("opens the investigation's conversation details flyout", () => {
    renderInvestigation();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationShowDetailsButton'));

    expect(mockOpenConversationDetails).toHaveBeenCalledWith({ conversationId: 'conv-1' });
  });

  it('offers no details without Agent Builder or before the investigation is read', () => {
    mockAgentBuilder = undefined;
    const { unmount } = renderInvestigation();
    expect(
      screen.queryByTestId('nightshiftInvestigationShowDetailsButton')
    ).not.toBeInTheDocument();
    unmount();

    mockAgentBuilder = { openConversationDetails: mockOpenConversationDetails };
    renderInvestigation({ status: 'loading', details: undefined });
    expect(
      screen.queryByTestId('nightshiftInvestigationShowDetailsButton')
    ).not.toBeInTheDocument();
  });
});
