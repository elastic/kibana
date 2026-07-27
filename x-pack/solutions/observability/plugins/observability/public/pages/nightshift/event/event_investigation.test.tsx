/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationState, SignificantEvent } from '@kbn/significant-events-schema';
import type { InvestigationStatus } from '@kbn/investigation-output';
import { EventInvestigation } from './event_investigation';

const mockOpenChat = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      http: { get: jest.fn() },
      agentBuilder: { openChat: mockOpenChat },
    },
  }),
}));

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  event_uuid: 'evt-uuid-001',
  status: 'open',
  stream_names: ['logs.web-frontend'],
  title: 'Latency spike on web-frontend',
  summary: 'Summary',
  severity: '60-high',
  confidence: 0.9,
  causal_features: [],
  ...overrides,
});

const completeState: InvestigationState = {
  summary: 'Investigate latency spike on web-frontend.',
  hypotheses: [
    {
      candidate: 'Deployment regression in checkout service',
      confidence: 0.92,
      status: 'confirmed',
    },
  ],
  conclusion: `# Conclusion
Checkout deploy introduced a regression.

## Next Steps
- Roll back checkout deployment · Revert commit abc123 and monitor error rate.`,
  gaps_found: ['Missing trace coverage · No spans for payment gateway calls.'],
};

const renderInvestigation = (
  event: SignificantEvent,
  {
    investigation,
    status = 'complete',
    state = completeState,
    error,
    conversationId = 'conv-123',
  }: {
    investigation?: NonNullable<SignificantEvent['investigations']>[number];
    status?: InvestigationStatus;
    state?: InvestigationState;
    error?: string;
    conversationId?: string;
  } = {}
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <EventInvestigation
          event={event}
          investigation={investigation}
          status={status}
          state={state}
          error={error}
          conversationId={conversationId}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('EventInvestigation', () => {
  beforeEach(() => {
    mockOpenChat.mockClear();
  });

  it('renders the empty state when there is no investigation', () => {
    renderInvestigation(mockEvent());

    expect(screen.getByText('Investigation')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationEmptyState')).toHaveTextContent(
      'No investigation yet.'
    );
    expect(
      screen.queryByTestId('nightshiftInvestigationShowDetailsButton')
    ).not.toBeInTheDocument();
  });

  it('renders the latest investigation summary and opens the flyout', () => {
    renderInvestigation(mockEvent(), {
      investigation: {
        workflow_execution_id: 'exec-latest',
        started_at: '2026-07-10T12:00:00Z',
        completed_at: '2026-07-10T12:05:00Z',
      },
    });

    expect(screen.getByTestId('nightshiftInvestigationSummaryCard')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationStatusIcon')).toHaveTextContent('Completed');
    expect(screen.getByTestId('nightshiftInvestigationHeadline')).toHaveTextContent(
      'Deployment regression in checkout service'
    );
    expect(screen.getByTestId('nightshiftInvestigationTimeLabel')).toHaveTextContent(
      `${moment('2026-07-10T12:00:00Z').format('HH:mm')} (5 min)`
    );

    const showDetailsButton = screen.getByTestId('nightshiftInvestigationShowDetailsButton');
    expect(showDetailsButton).toHaveAttribute('data-ebt-action', 'viewInvestigation');
    expect(showDetailsButton).toHaveAttribute(
      'data-ebt-element',
      'nightshiftEventFlyoutInvestigation'
    );
    expect(showDetailsButton).toHaveAttribute('data-ebt-detail', 'complete');
    fireEvent.click(showDetailsButton);
    expect(screen.getByTestId('nightshiftInvestigationFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationFlyoutCompleteBadge')).toHaveTextContent(
      'Complete'
    );
    expect(screen.getByTestId('nightshiftInvestigationFlyoutConclusion')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationFlyoutTab-recommendations')).toHaveAttribute(
      'aria-selected',
      'true'
    );

    const chatButton = screen.getByTestId('nightshiftInvestigationFlyoutChatButton');
    expect(chatButton).toHaveAttribute('data-ebt-action', 'openInChat');
    expect(chatButton).toHaveAttribute('data-ebt-detail', 'existingConversation');
    fireEvent.click(chatButton);
    expect(mockOpenChat).toHaveBeenCalledWith({ conversationId: 'conv-123' });
  });

  it('opens the flyout when More recommendations is clicked', () => {
    renderInvestigation(mockEvent(), {
      investigation: {
        workflow_execution_id: 'exec-latest',
        started_at: '2026-07-10T12:00:00Z',
        completed_at: '2026-07-10T12:05:00Z',
      },
    });

    const moreRecommendationsLink = screen.getByTestId(
      'nightshiftInvestigationMoreRecommendationsLink'
    );
    expect(moreRecommendationsLink).toHaveAttribute('data-ebt-action', 'viewInvestigation');
    expect(moreRecommendationsLink).toHaveAttribute(
      'data-ebt-element',
      'nightshiftInvestigationSummary'
    );
    fireEvent.click(moreRecommendationsLink);
    expect(screen.getByTestId('nightshiftInvestigationFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationFlyoutTab-recommendations')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('switches to the recommendations tab when More recommendations is clicked while open', () => {
    renderInvestigation(mockEvent(), {
      investigation: {
        workflow_execution_id: 'exec-latest',
        started_at: '2026-07-10T12:00:00Z',
        completed_at: '2026-07-10T12:05:00Z',
      },
    });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationShowDetailsButton'));
    fireEvent.click(screen.getByTestId('nightshiftInvestigationFlyoutTab-hypotheses'));
    expect(screen.getByTestId('nightshiftInvestigationFlyoutTab-hypotheses')).toHaveAttribute(
      'aria-selected',
      'true'
    );

    fireEvent.click(screen.getByTestId('nightshiftInvestigationMoreRecommendationsLink'));
    expect(screen.getByTestId('nightshiftInvestigationFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationFlyoutTab-recommendations')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows ongoing investigation content when the hook reports running status', () => {
    renderInvestigation(mockEvent(), {
      investigation: {
        workflow_execution_id: 'exec-running',
        started_at: '2026-07-10T12:00:00Z',
      },
      status: 'running',
      state: {
        summary: 'Determine whether the deploy caused the spike.',
        hypotheses: [
          {
            candidate: 'Checkout deploy regression',
            confidence: 0.55,
            status: 'investigating',
          },
        ],
      },
      conversationId: undefined,
    });

    expect(screen.getByText('Investigating')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationGoalPreview')).toHaveTextContent(
      'Determine whether the deploy caused the spike.'
    );
    expect(
      screen.queryByTestId('nightshiftInvestigationGoalPreviewToggle')
    ).not.toBeInTheDocument();
  });

  it('truncates long in-progress goal text with Show more', () => {
    const longGoal = `${'Determine whether the deploy caused the spike. '.repeat(12)}End.`;

    renderInvestigation(mockEvent(), {
      investigation: {
        workflow_execution_id: 'exec-running',
        started_at: '2026-07-10T12:00:00Z',
      },
      status: 'running',
      state: {
        summary: longGoal,
        hypotheses: [
          {
            candidate: 'Checkout deploy regression',
            confidence: 0.55,
            status: 'investigating',
          },
        ],
      },
    });

    expect(screen.getByTestId('nightshiftInvestigationGoalPreviewToggle')).toHaveTextContent(
      'Show more'
    );
    fireEvent.click(screen.getByTestId('nightshiftInvestigationGoalPreviewToggle'));
    expect(screen.getByTestId('nightshiftInvestigationGoalPreviewToggle')).toHaveTextContent(
      'Show less'
    );
    expect(screen.getByTestId('nightshiftInvestigationGoalPreview')).toHaveTextContent('End.');
  });

  it('truncates long completed conclusion text with Show more', () => {
    const longConclusionBody = `${'Checkout deploy introduced a regression. '.repeat(12)}End.`;

    renderInvestigation(mockEvent(), {
      investigation: {
        workflow_execution_id: 'exec-latest',
        started_at: '2026-07-10T12:00:00Z',
        completed_at: '2026-07-10T12:05:00Z',
      },
      state: {
        ...completeState,
        conclusion: `# Conclusion\n${longConclusionBody}`,
      },
    });

    expect(screen.getByTestId('nightshiftInvestigationConclusionPreviewToggle')).toHaveTextContent(
      'Show more'
    );
    fireEvent.click(screen.getByTestId('nightshiftInvestigationConclusionPreviewToggle'));
    expect(screen.getByTestId('nightshiftInvestigationConclusionPreviewToggle')).toHaveTextContent(
      'Show less'
    );
    expect(screen.getByTestId('nightshiftInvestigationConclusionPreview')).toHaveTextContent(
      'End.'
    );
  });

  it('truncates long try next recommendation description with Show more', () => {
    const longRecommendationDescription = `${'Monitor error rate after rollback. '.repeat(15)}End.`;

    renderInvestigation(mockEvent(), {
      investigation: {
        workflow_execution_id: 'exec-latest',
        started_at: '2026-07-10T12:00:00Z',
        completed_at: '2026-07-10T12:05:00Z',
      },
      state: {
        ...completeState,
        conclusion: `# Conclusion
Checkout deploy introduced a regression.

## Next Steps
- Roll back checkout deployment · ${longRecommendationDescription}`,
      },
    });

    expect(screen.getByTestId('nightshiftInvestigationTryNextPreviewToggle')).toHaveTextContent(
      'Show more'
    );
    fireEvent.click(screen.getByTestId('nightshiftInvestigationTryNextPreviewToggle'));
    expect(screen.getByTestId('nightshiftInvestigationTryNextPreviewToggle')).toHaveTextContent(
      'Show less'
    );
    expect(screen.getByTestId('nightshiftInvestigationTryNextPreview')).toHaveTextContent('End.');
  });

  it('shows a warning when the investigation lacks workflow details', () => {
    renderInvestigation(mockEvent(), {
      investigation: {
        workflow_execution_id: '',
        started_at: '2026-07-10T12:00:00Z',
      },
    });

    expect(screen.getByTestId('nightshiftInvestigationMissingWorkflowCallout')).toBeInTheDocument();
  });
});
