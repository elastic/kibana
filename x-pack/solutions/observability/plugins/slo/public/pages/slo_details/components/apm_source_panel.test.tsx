/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { render } from '../../../utils/test_helper';
import { buildSlo } from '../../../data/slo/slo';
import {
  buildApmAvailabilityIndicator,
  buildApmLatencyIndicator,
} from '../../../data/slo/indicator';
import { ApmSourcePanel } from './apm_source_panel';

jest.mock('../../../hooks/use_kibana');

const useKibanaMock = useKibana as jest.Mock;

const mockGetRedirectUrl = jest.fn(() => 'https://mock-apm-link');

const withApmCapabilities = () => {
  useKibanaMock.mockReturnValue({
    services: {
      share: { url: { locators: { get: () => ({ getRedirectUrl: mockGetRedirectUrl }) } } },
      application: { capabilities: { apm: { show: true } } },
    },
  });
};

const withoutApmCapabilities = () => {
  useKibanaMock.mockReturnValue({
    services: {
      share: { url: { locators: { get: () => ({ getRedirectUrl: mockGetRedirectUrl }) } } },
      application: { capabilities: { apm: { show: false } } },
    },
  });
};

describe('ApmSourcePanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the source panel with all fields for an APM availability SLO', () => {
    withApmCapabilities();
    const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
    render(<ApmSourcePanel slo={slo} />);

    expect(screen.queryByTestId('sloDetailsApmSourcePanel')).toBeTruthy();
    expect(screen.getByText('o11y-app')).toBeTruthy();
    expect(screen.getByText('development')).toBeTruthy();
    expect(screen.getByText('request')).toBeTruthy();
    expect(screen.getByText('GET /flaky')).toBeTruthy();
  });

  it('renders the source panel for an APM latency SLO', () => {
    withApmCapabilities();
    const slo = buildSlo({ indicator: buildApmLatencyIndicator() });
    render(<ApmSourcePanel slo={slo} />);

    expect(screen.queryByTestId('sloDetailsApmSourcePanel')).toBeTruthy();
    expect(screen.getByText('o11y-app')).toBeTruthy();
    expect(screen.getByText('GET /slow')).toBeTruthy();
  });

  it('renders fields as links when user has APM capabilities', () => {
    withApmCapabilities();
    const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
    render(<ApmSourcePanel slo={slo} />);

    expect(screen.queryByTestId('sloDetailsApmSourceLink-service.name')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsApmSourceLink-service.environment')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsApmSourceLink-transaction.type')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsApmSourceLink-transaction.name')).toBeTruthy();
  });

  it('renders fields as plain text when user lacks APM capabilities', () => {
    withoutApmCapabilities();
    const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
    render(<ApmSourcePanel slo={slo} />);

    expect(screen.queryByTestId('sloDetailsApmSourcePanel')).toBeTruthy();
    expect(screen.getByText('o11y-app')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsApmSourceLink-service.name')).toBeFalsy();
    expect(screen.queryByTestId('sloDetailsApmSourceLink-service.environment')).toBeFalsy();
  });

  it('renders fields as plain text for remote SLOs', () => {
    withApmCapabilities();
    const slo = buildSlo({
      indicator: buildApmAvailabilityIndicator(),
      remote: { remoteName: 'remote-cluster', kibanaUrl: 'https://remote-kibana' },
    });
    render(<ApmSourcePanel slo={slo} />);

    expect(screen.queryByTestId('sloDetailsApmSourcePanel')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsApmSourceLink-service.name')).toBeFalsy();
  });

  it('filters out fields with ALL_VALUE', () => {
    withApmCapabilities();
    const slo = buildSlo({
      indicator: buildApmAvailabilityIndicator({
        environment: ALL_VALUE,
        transactionName: ALL_VALUE,
      }),
    });
    render(<ApmSourcePanel slo={slo} />);

    expect(screen.queryByTestId('sloDetailsApmSourcePanel')).toBeTruthy();
    expect(screen.getByText('o11y-app')).toBeTruthy();
    expect(screen.getByText('request')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsApmSourceLink-service.environment')).toBeFalsy();
    expect(screen.queryByTestId('sloDetailsApmSourceLink-transaction.name')).toBeFalsy();
  });

  it('returns null when all fields are ALL_VALUE', () => {
    withApmCapabilities();
    const slo = buildSlo({
      indicator: buildApmAvailabilityIndicator({
        service: ALL_VALUE,
        environment: ALL_VALUE,
        transactionType: ALL_VALUE,
        transactionName: ALL_VALUE,
      }),
    });
    render(<ApmSourcePanel slo={slo} />);

    expect(screen.queryByTestId('sloDetailsApmSourcePanel')).toBeFalsy();
  });

  it('prefers groupings values over indicator params', () => {
    withApmCapabilities();
    const slo = buildSlo({
      indicator: buildApmAvailabilityIndicator(),
      groupings: { 'service.name': 'grouped-service' },
    });
    render(<ApmSourcePanel slo={slo} />);

    expect(screen.getByText('grouped-service')).toBeTruthy();
    expect(screen.queryByText('o11y-app')).toBeFalsy();
  });

  it('uses SLO time window as default time range', () => {
    withApmCapabilities();
    const slo = buildSlo({
      indicator: buildApmAvailabilityIndicator(),
      timeWindow: { duration: '7d', type: 'rolling' },
    });
    render(<ApmSourcePanel slo={slo} />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ rangeFrom: 'now-7d', rangeTo: 'now' }),
      })
    );
  });

  it('uses provided timeRange prop over SLO time window', () => {
    withApmCapabilities();
    const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
    const customRange = { from: '2024-01-01', to: '2024-01-31' };
    render(<ApmSourcePanel slo={slo} timeRange={customRange} />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ rangeFrom: '2024-01-01', rangeTo: '2024-01-31' }),
      })
    );
  });

  it('includes telemetry data attributes on links', () => {
    withApmCapabilities();
    const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
    render(<ApmSourcePanel slo={slo} />);

    const link = screen.getByTestId('sloDetailsApmSourceLink-service.name');
    expect(link).toHaveAttribute('data-action', 'navigateToApmSource');
    expect(link).toHaveAttribute('data-source', 'sli.apm.transactionErrorRate');
  });
});
