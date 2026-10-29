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
import { DetectionFlyout } from './detection_flyout';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));

const mockGetRedirectUrl = jest.fn(() => '/app/discover#redirect');
const mockOpenChat = jest.fn();

const mockStreamFeatures = jest.fn();

jest.mock('../../../hooks/use_fetch_source_features', () => ({
  useFetchSourceFeatures: () => mockStreamFeatures(),
}));

jest.mock('./change_point_lens_chart', () => ({
  ChangePointLensChart: ({ detection }: { detection: LifecycleDetection }) => (
    <div data-test-subj="nightshiftDetectionLensChart" data-rule-uuid={detection.rule_uuid}>
      [Logs] Spike
    </div>
  ),
}));

jest.mock('../../../hooks/use_kibana', () => ({
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

const webFrontendFeature = {
  uuid: 'feat-web-frontend',
  id: 'web-frontend',
  source_id: 'logs.web-frontend',
  type: 'entity',
  subtype: 'service',
  title: 'web-frontend',
  description: 'Frontend service entity',
  properties: {},
  confidence: 90,
  evidence: ['source_id = logs.web-frontend'],
};

const mockEvent: SignificantEvent = {
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  status: 'active',
  source_ids: ['logs.web-frontend'],
  title: 'Web latency spike',
  summary: 'Latency increased on web-frontend.',
  severity: 'critical',
  confidence: 0.92,
  blast_radius: [
    {
      type: 'entity',
      subtype: 'service',
      feature_id: 'feat-web-frontend',
      name: 'web-frontend',
      source_id: 'logs.web-frontend',
    },
  ],
};

const mockDetection: LifecycleDetection = {
  detection_id: 'det-1',
  rule_name: 'latency-p95-spike',
  rule_uuid: 'rule-uuid-001',
  source_id: 'logs.web-frontend',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00Z',
};

const mockSignal: SignalEntry = {
  type: 'detection',
  source_id: 'logs.web-frontend',
  description: 'P95 latency on web-frontend rose from 120ms to 890ms.',
  verdict: 'confirms',
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
    mockStreamFeatures.mockReturnValue({
      features: [webFrontendFeature],
      failedSourceIds: [],
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
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

  it.each([
    ['confirms', 'Confirmed'],
    ['refutes', 'Refuted'],
    ['off_topic', 'Off topic'],
    ['inconclusive', 'Inconclusive'],
    ['not_checked', 'Not checked'],
  ] as const)('shows the %s verdict badge', (verdict, label) => {
    renderFlyout({ signal: { ...mockSignal, verdict } });

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('opens the entity flyout when an associated entity chip is clicked', () => {
    renderFlyout();

    expect(screen.queryByTestId('nightshiftEntityFlyout')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftDetectionFlyoutEntityChip'));
    const entityFlyout = screen.getByTestId('nightshiftEntityFlyout');
    expect(entityFlyout).toBeInTheDocument();
    expect(within(entityFlyout).getByText('Summary')).toBeInTheDocument();
    expect(within(entityFlyout).getByText(webFrontendFeature.description)).toBeInTheDocument();
    expect(within(entityFlyout).getByText('source_id = logs.web-frontend')).toBeInTheDocument();
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

  it('includes resolved services and says when some sources failed to load', () => {
    const paymentsFeature = {
      ...webFrontendFeature,
      uuid: 'feat-payments',
      id: 'payments-api',
      source_id: 'logs.payments',
      title: 'payments-api',
    };
    mockStreamFeatures.mockReturnValue({
      features: [webFrontendFeature, paymentsFeature],
      failedSourceIds: ['logs.payments', 'logs.checkout'],
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      refetch: jest.fn(),
    });
    renderFlyout({
      event: {
        ...mockEvent,
        causal_features: [
          {
            feature_id: 'feat-payments',
            type: 'entity',
            subtype: 'service',
            name: 'payments-api',
            source_id: 'logs.payments',
          },
        ],
      },
    });

    expect(
      screen
        .getAllByTestId('nightshiftDetectionFlyoutEntityChip')
        .map(({ textContent }) => textContent)
    ).toEqual(['web-frontend', 'payments-api']);
    expect(
      screen.getByText('Some sources could not be loaded, so this list may be incomplete.')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('nightshiftDetectionFlyoutImpactedServicesRetry')
    ).toBeInTheDocument();
  });

  it('does not title an empty list when some sources failed to load', () => {
    const refetch = jest.fn();
    mockStreamFeatures.mockReturnValue({
      features: [],
      failedSourceIds: ['logs.payments'],
      isInitialLoading: false,
      isFetching: false,
      isError: false,
      refetch,
    });
    renderFlyout();

    expect(screen.queryByText('Impacted services')).not.toBeInTheDocument();
    expect(
      screen.getByText('Some sources could not be loaded, so this list may be incomplete.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftDetectionFlyoutImpactedServicesRetry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says when every source failed and offers a retry', () => {
    const refetch = jest.fn();
    mockStreamFeatures.mockReturnValue({
      features: [],
      failedSourceIds: [],
      isInitialLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    });
    renderFlyout();

    expect(screen.queryByText('Impacted services')).not.toBeInTheDocument();
    expect(screen.getByText('Impacted services could not be loaded.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftDetectionFlyoutImpactedServicesRetry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders the ES|QL query with an Open in Discover button', () => {
    renderFlyout();

    expect(screen.getByText('ES|QL query')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionFlyoutEsql')).toHaveTextContent(
      'FROM logs.web-frontend'
    );
    const discoverLink = screen.getByTestId('nightshiftDetectionFlyoutDiscoverLink');
    expect(discoverLink).toHaveAttribute('href', '/app/discover#redirect');
    expect(discoverLink).toHaveAttribute('data-ebt-action', 'openInDiscover');
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: { esql: mockSignal.evidence?.esql_query },
      timeRange: {
        from: '2026-07-10T11:00:00.000Z',
        to: '2026-07-10T12:15:00.000Z',
      },
    });
  });
});
