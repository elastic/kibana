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
import type { LifecycleDetection } from '@kbn/significant-events-schema';
import { DetectionFlyout } from './detection_flyout';

const mockGetRedirectUrl = jest.fn(() => '/app/discover#redirect');

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => `/base${path}` } },
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
    },
  }),
}));

const mockDetection: LifecycleDetection = {
  detection_id: 'det-1',
  rule_name: 'latency-p95-spike',
  rule_uuid: 'rule-uuid-001',
  stream_name: 'logs.web-frontend',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00Z',
};

const mockEvidence = {
  rule_name: 'latency-p95-spike',
  rule_uuid: 'rule-uuid-001',
  description: 'P95 latency on web-frontend rose from 120ms to 890ms.',
  esql_query: 'FROM logs.web-frontend\n| SORT @timestamp DESC',
  stream_name: 'logs.web-frontend',
};

describe('DetectionFlyout', () => {
  const renderFlyout = (props: Partial<React.ComponentProps<typeof DetectionFlyout>> = {}) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <DetectionFlyout
            detection={mockDetection}
            evidence={mockEvidence}
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

  it('falls back to the detection id when the rule name is missing', () => {
    renderFlyout({ detection: { ...mockDetection, rule_name: undefined } });

    expect(screen.getByRole('heading', { name: 'det-1' })).toBeInTheDocument();
  });

  it('formats the detection timestamp with the @ separator', () => {
    renderFlyout();

    expect(screen.getByText(/Jul 10, 2026 @ \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('renders the summary section from the evidence description', () => {
    renderFlyout();

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(mockEvidence.description)).toBeInTheDocument();
  });

  it('hides the summary section without an evidence description', () => {
    renderFlyout({ evidence: undefined });

    expect(screen.queryByText('Summary')).not.toBeInTheDocument();
  });

  it('links the associated entity chip to the stream page', () => {
    renderFlyout();

    const chip = screen.getByTestId('nightshiftDetectionFlyoutEntityChip');
    expect(chip).toHaveTextContent('logs.web-frontend');
    expect(chip).toHaveAttribute('href', '/base/app/streams/logs.web-frontend');
  });

  it('hides the associated entities section without a stream name', () => {
    renderFlyout({ detection: { ...mockDetection, stream_name: undefined } });

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
      query: { esql: mockEvidence.esql_query },
    });
  });

  it('hides the ES|QL section without an evidence query', () => {
    renderFlyout({ evidence: { ...mockEvidence, esql_query: undefined } });

    expect(screen.queryByText('ES|QL query')).not.toBeInTheDocument();
  });

  it('does not render a footer chat button', () => {
    renderFlyout();

    expect(screen.queryByTestId('nightshiftDetectionFlyoutChatButton')).not.toBeInTheDocument();
  });

  it('calls onClose when the flyout is closed', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });
});
