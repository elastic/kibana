/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { SignificantEvent, SignalEntry } from '@kbn/significant-events-schema';
import { SignificantEventDetails } from './significant_event_details';

const DISCOVER_HREF = '/app/discover#sig-event-query';
const mockGetRedirectUrl = jest.fn(
  (_params: DiscoverAppLocatorParams): string | undefined => DISCOVER_HREF
);

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => ({
    core: { http: {} },
    services: {},
    dependencies: {
      start: {
        share: {
          url: {
            locators: {
              get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
            },
          },
        },
      },
    },
  })),
}));

const ESQL_QUERY =
  'FROM logs.checkout | WHERE @timestamp >= "2026-06-11T15:03:00Z" AND @timestamp <= "2026-06-11T15:10:00.000Z"';
const LEGACY_ESQL_QUERY = `${ESQL_QUERY} | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1`;
const TIME_RANGE = {
  from: '2026-06-11T15:03:00.000Z',
  to: '2026-06-11T15:10:00.000Z',
};

const baseEvent: SignificantEvent = {
  '@timestamp': '2026-06-11T15:03:00.000Z',
  event_uuid: 'evt-1',
  event_id: 'checkout-outage',
  status: 'open',
  stream_names: ['logs.checkout'],
  title: 'Checkout outage',
  summary: 'Payment processing is failing.',
  severity: '60-high',
  confidence: 0.9,
  signals: [],
  causal_features: [],
  blast_radius: [],
};

const detectionSignal: SignalEntry = {
  type: 'detection',
  stream_name: 'logs.checkout',
  description: 'Found: connection refused. Impact: checkout blocked.',
  verdict: 'confirms',
  collected_at: '2026-06-11T15:10:00.000Z',
  evidence: {
    esql_query: ESQL_QUERY,
    result: 'found',
    time_range: TIME_RANGE,
  },
  metadata: {
    rule_name: 'Connection refused in checkout',
    rule_uuid: 'rule-1',
    detection_id: 'det-1',
    change_point_type: 'spike',
    p_value: 0.001,
  },
};

const renderDetails = (event: SignificantEvent) =>
  render(
    <I18nProvider>
      <SignificantEventDetails event={event} />
    </I18nProvider>
  );

describe('SignificantEventDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRedirectUrl.mockReturnValue(DISCOVER_HREF);
  });

  it('renders the ES|QL code block and Open in Discover link when evidence has a query and absolute time range', () => {
    renderDetails({ ...baseEvent, signals: [detectionSignal] });

    expect(screen.getByText(/FROM logs.checkout/)).toBeInTheDocument();
    expect(screen.getByTestId('significantEventDetailsOpenInDiscoverLink')).toHaveAttribute(
      'href',
      DISCOVER_HREF
    );
    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: TIME_RANGE,
        interval: 'auto',
      })
    );
  });

  it('does not render the code block or Discover link when evidence is null', () => {
    const signalNoEvidence = { ...detectionSignal, evidence: null };
    renderDetails({ ...baseEvent, signals: [signalNoEvidence] });

    expect(screen.queryByText(/FROM logs.checkout/)).not.toBeInTheDocument();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('significantEventDetailsOpenInDiscoverLink')
    ).not.toBeInTheDocument();
  });

  it('does not render the code block when there are no signals', () => {
    renderDetails(baseEvent);
    expect(screen.queryByText(/FROM logs.checkout/)).not.toBeInTheDocument();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });

  it('opens Discover with a last-hour fallback when evidence has no time_range', () => {
    renderDetails({
      ...baseEvent,
      signals: [
        {
          ...detectionSignal,
          evidence: { esql_query: ESQL_QUERY, result: 'found' },
        },
      ],
    });

    expect(screen.getByText(/FROM logs.checkout/)).toBeInTheDocument();
    expect(screen.getByTestId('significantEventDetailsOpenInDiscoverLink')).toBeInTheDocument();
    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: { from: 'now-1h', to: 'now' },
        interval: 'auto',
      })
    );
  });

  it('replaces a legacy query LIMIT and KEEP while retaining its SORT', () => {
    renderDetails({
      ...baseEvent,
      signals: [
        {
          ...detectionSignal,
          evidence: {
            esql_query: LEGACY_ESQL_QUERY,
            result: 'found',
            time_range: TIME_RANGE,
          },
        },
      ],
    });

    const query = mockGetRedirectUrl.mock.calls[0]?.[0].query;
    if (!query || !('esql' in query)) {
      throw new Error('expected ES|QL Discover params');
    }
    expect(query.esql).toContain('SORT');
    expect(query.esql).not.toMatch(/\bLIMIT\b/i);
    expect(query.esql).not.toMatch(/\bKEEP\b/i);
  });

  it('omits Discover when getRedirectUrl returns undefined', () => {
    mockGetRedirectUrl.mockReturnValueOnce(undefined);
    renderDetails({ ...baseEvent, signals: [detectionSignal] });

    expect(screen.getByText(/FROM logs.checkout/)).toBeInTheDocument();
    expect(
      screen.queryByTestId('significantEventDetailsOpenInDiscoverLink')
    ).not.toBeInTheDocument();
  });
});
