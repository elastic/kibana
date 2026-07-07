/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useAnomalyOverviewForAttachment } from '../use_anomaly_overview_for_attachment';
import { useEntityAnalyticsAgentNavigation } from '../../entity_analytics_agent_navigation_context';
import { AnomaliesMini } from './anomalies_mini';

jest.mock('../use_anomaly_overview_for_attachment', () => ({
  useAnomalyOverviewForAttachment: jest.fn(),
}));

jest.mock('../../entity_analytics_agent_navigation_context', () => ({
  useEntityAnalyticsAgentNavigation: jest.fn(),
}));

jest.mock('../../../../entity_analytics/components/anomalies/anomalies_overview', () => ({
  AnomaliesOverview: (props: Record<string, unknown>) => (
    <div
      data-test-subj="anomaliesOverviewMock"
      data-total={String((props.data as { totalAnomaliesCount: number }).totalAnomaliesCount)}
    />
  ),
}));

const mockedUseAnomalyOverviewForAttachment = useAnomalyOverviewForAttachment as jest.Mock;
const mockedUseEntityAnalyticsAgentNavigation = useEntityAnalyticsAgentNavigation as jest.Mock;

const renderMini = (props: Partial<React.ComponentProps<typeof AnomaliesMini>> = {}) =>
  render(
    <I18nProvider>
      <AnomaliesMini
        identifier={{ identifierType: 'host', identifier: 'server1', entityStoreId: 'entity-1' }}
        entityStoreEntityId="entity-1"
        anomalyDetailsEnabled
        {...props}
      />
    </I18nProvider>
  );

describe('AnomaliesMini', () => {
  beforeEach(() => {
    mockedUseAnomalyOverviewForAttachment.mockReset();
    mockedUseEntityAnalyticsAgentNavigation.mockReturnValue({
      canNavigate: true,
      navigateWithFlyout: jest.fn(),
      navigateToHome: jest.fn(),
    });
  });

  it('returns null when the feature flag is disabled', () => {
    mockedUseAnomalyOverviewForAttachment.mockReturnValue({
      data: { totalAnomaliesCount: 2 },
      isLoading: false,
    });
    const { container } = renderMini({ anomalyDetailsEnabled: false });
    expect(container.firstChild).toBeNull();
  });

  it('returns null for identifier types the anomaly overview API does not support', () => {
    mockedUseAnomalyOverviewForAttachment.mockReturnValue({
      data: { totalAnomaliesCount: 2 },
      isLoading: false,
    });
    const { container } = renderMini({
      identifier: { identifierType: 'service', identifier: 'payments', entityStoreId: 'entity-1' },
    });
    expect(container.firstChild).toBeNull();
  });

  it('returns null while loading', () => {
    mockedUseAnomalyOverviewForAttachment.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderMini();
    expect(container.firstChild).toBeNull();
  });

  it('returns null when there are no anomalies', () => {
    mockedUseAnomalyOverviewForAttachment.mockReturnValue({
      data: { totalAnomaliesCount: 0 },
      isLoading: false,
    });
    const { container } = renderMini();
    expect(container.firstChild).toBeNull();
  });

  it('renders the anomaly overview when anomalies are present', () => {
    mockedUseAnomalyOverviewForAttachment.mockReturnValue({
      data: { totalAnomaliesCount: 5 },
      isLoading: false,
    });
    renderMini();
    const overview = screen.getByTestId('anomaliesOverviewMock');
    expect(overview.getAttribute('data-total')).toBe('5');
  });
});
