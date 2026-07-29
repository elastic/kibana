/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  LifecycleDetection,
  SignalEntry,
  SignificantEvent,
} from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE } from '@kbn/significant-events-plugin/common';
import { DetectionFlyout } from './detection_flyout';

const mockGetRedirectUrl = jest.fn(() => '/app/discover#redirect');
const mockOpenChat = jest.fn();

jest.mock('../hooks/use_fetch_stream_features', () => ({
  useFetchStreamFeatures: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => `/base${path}` } },
      application: {
        getUrlForApp: (_app: string, { path }: { path: string }) => `/app/apm${path}`,
      },
      charts: {
        theme: {
          useChartsBaseTheme: () => ({}),
          useSparklineOverrides: () => ({}),
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
          },
        },
      },
      agentBuilder: {
        openChat: mockOpenChat,
      },
    },
  }),
}));

const mockEvent: SignificantEvent = {
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  event_uuid: 'evt-uuid-001',
  status: 'open',
  stream_names: ['logs.web-frontend'],
  title: 'Web latency spike',
  summary: 'Latency increased on web-frontend.',
  severity: '80-critical',
  confidence: 0.92,
};

const mockDetection: LifecycleDetection = {
  detection_id: 'det-1',
  rule_name: 'latency-p95-spike',
  rule_uuid: 'rule-uuid-001',
  stream_name: 'logs.web-frontend',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00Z',
};

const mockSignal: SignalEntry = {
  type: 'detection',
  stream_name: 'logs.web-frontend',
  description: 'P95 latency on web-frontend rose from 120ms to 890ms.',
  evidence: {
    esql_query: 'FROM logs.web-frontend\n| SORT @timestamp DESC',
    result: 'found',
  },
  metadata: {
    detection_id: 'det-1',
    rule_uuid: 'rule-uuid-001',
    rule_name: 'latency-p95-spike',
    change_point_type: 'spike',
    p_value: 0.01,
  },
};

describe('DetectionFlyout', () => {
  beforeEach(() => {
    mockOpenChat.mockClear();
  });

  const renderFlyout = (props: Partial<React.ComponentProps<typeof DetectionFlyout>> = {}) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <DetectionFlyout
            detection={mockDetection}
            event={mockEvent}
            signal={mockSignal}
            onClose={jest.fn()}
            {...props}
          />
        </EuiProvider>
      </I18nProvider>
    );

  it('renders the rule name as the title with the detection badges', () => {
    renderFlyout();

    expect(screen.getByRole('heading', { name: 'latency-p95-spike' })).toBeInTheDocument();
    expect(screen.getByText('Detection')).toBeInTheDocument();
    expect(screen.getByText('Spike')).toBeInTheDocument();
  });

  it('formats the detection timestamp with the @ separator', () => {
    renderFlyout();

    expect(screen.getByText(/Jul 10, 2026 @ \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('renders the summary section from the signal description', () => {
    renderFlyout();

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(mockSignal.description)).toBeInTheDocument();
  });

  it('hides the summary section without a signal description', () => {
    renderFlyout({ signal: undefined });

    expect(screen.queryByText('Summary')).not.toBeInTheDocument();
  });

  it('truncates long summaries and shows "Show more"', () => {
    const longDescription = 'P95 latency on web-frontend rose from 120ms to 890ms. '
      .repeat(10)
      .trimEnd();
    renderFlyout({
      signal: {
        ...mockSignal,
        description: longDescription,
      },
    });

    expect(screen.getByText('Show more')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Show more'));
    expect(screen.getByText('Show less')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionFlyoutSummary')).toHaveTextContent(
      longDescription
    );
  });

  it('renders the associated entity chip as a button', () => {
    renderFlyout();

    const chip = screen.getByTestId('nightshiftDetectionFlyoutEntityChip');
    expect(chip).toHaveTextContent('logs.web-frontend');
    expect(chip.tagName).toBe('BUTTON');
  });

  it('opens the entity flyout when an associated entity chip is clicked', () => {
    renderFlyout();

    expect(screen.queryByTestId('nightshiftEntityFlyout')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftDetectionFlyoutEntityChip'));
    const entityFlyout = screen.getByTestId('nightshiftEntityFlyout');
    expect(entityFlyout).toBeInTheDocument();
    expect(within(entityFlyout).getByText('Summary')).toBeInTheDocument();
    expect(within(entityFlyout).getByText(mockSignal.description)).toBeInTheDocument();
    expect(within(entityFlyout).getByText('stream_name = logs.web-frontend')).toBeInTheDocument();
  });

  it('closes the entity flyout without closing the detection flyout', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('nightshiftDetectionFlyoutEntityChip'));
    const entityFlyout = screen.getByTestId('nightshiftEntityFlyout');
    fireEvent.click(within(entityFlyout).getByTestId('euiFlyoutCloseButton'));

    expect(screen.queryByTestId('nightshiftEntityFlyout')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionFlyout')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('hides the associated entities section without a stream name', () => {
    renderFlyout({ detection: { ...mockDetection, stream_name: '' } });

    expect(screen.queryByText('Associated entities')).not.toBeInTheDocument();
  });

  it('renders the trend section', () => {
    renderFlyout();

    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('[Logs] Spike')).toBeInTheDocument();
  });

  it('renders the ES|QL query with an Open in Discover button', () => {
    renderFlyout();

    expect(screen.getByText('ES|QL query')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionFlyoutEsql')).toHaveTextContent(
      'FROM logs.web-frontend'
    );
    expect(screen.getByTestId('nightshiftDetectionFlyoutDiscoverLink')).toHaveAttribute(
      'href',
      '/app/discover#redirect'
    );
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: { esql: mockSignal.evidence?.esql_query },
    });
  });

  it('hides the ES|QL section without a signal query', () => {
    renderFlyout({
      signal: {
        ...mockSignal,
        evidence: undefined,
      },
    });

    expect(screen.queryByText('ES|QL query')).not.toBeInTheDocument();
  });

  it('opens a new chat with the detection attached when Open in chat is clicked', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('nightshiftDetectionFlyoutChatButton'));

    expect(mockOpenChat).toHaveBeenCalledWith({
      newConversation: true,
      autoSendInitialMessage: true,
      initialMessage: 'Tell me about the latency-p95-spike detection',
      attachments: [
        {
          id: mockDetection.detection_id,
          type: SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
          origin: mockDetection.detection_id,
          description: '[Detection] latency-p95-spike',
          data: mockDetection,
        },
      ],
    });
  });

  it('calls onClose when the flyout is closed', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });
});
