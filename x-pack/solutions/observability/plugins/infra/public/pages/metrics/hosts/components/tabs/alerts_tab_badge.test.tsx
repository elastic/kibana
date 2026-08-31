/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useAlertsCount } from '../../../../../hooks/use_alerts_count';
import { useAlertsQuery } from '../../hooks/use_alerts_query';
import { AlertsTabBadge } from './alerts_tab_badge';

jest.mock('../../../../../hooks/use_alerts_count');
jest.mock('../../hooks/use_alerts_query');

const mockUseAlertsCount = useAlertsCount as jest.MockedFunction<typeof useAlertsCount>;
const mockUseAlertsQuery = useAlertsQuery as jest.MockedFunction<typeof useAlertsQuery>;

const mockAlertsCount = (
  overrides: Partial<ReturnType<typeof useAlertsCount>> = {}
): ReturnType<typeof useAlertsCount> =>
  ({
    alertsCount: { activeAlertCount: 0, recoveredAlertCount: 0 },
    loading: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useAlertsCount>);

const renderBadge = () =>
  render(
    <I18nProvider>
      <AlertsTabBadge />
    </I18nProvider>
  );

describe('AlertsTabBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const emptyAlertsQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };
    mockUseAlertsQuery.mockReturnValue({
      alertStatus: 'all',
      setAlertStatus: jest.fn(),
      alertsEsQuery: emptyAlertsQuery,
      alertsEsQueryByStatus: emptyAlertsQuery,
    });
  });

  it('renders the active alert count', () => {
    mockUseAlertsCount.mockReturnValue(
      mockAlertsCount({ alertsCount: { activeAlertCount: 3, recoveredAlertCount: 1 } })
    );

    renderBadge();

    expect(screen.getByTestId('hostsView-tabs-alerts-count')).toHaveTextContent('3');
  });

  it('hides the badge when there are no active alerts', () => {
    mockUseAlertsCount.mockReturnValue(
      mockAlertsCount({ alertsCount: { activeAlertCount: 0, recoveredAlertCount: 4 } })
    );

    renderBadge();

    expect(screen.queryByTestId('hostsView-tabs-alerts-count')).not.toBeInTheDocument();
  });

  it('renders a spinner while the alert count is loading', () => {
    mockUseAlertsCount.mockReturnValue(mockAlertsCount({ loading: true }));

    renderBadge();

    expect(screen.getByTestId('hostsView-tabs-alerts-count-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('hostsView-tabs-alerts-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hostsView-tabs-alerts-count-error')).not.toBeInTheDocument();
  });

  it('renders a warning icon when the alert count fails to load', () => {
    mockUseAlertsCount.mockReturnValue(mockAlertsCount({ error: new Error('failed to load') }));

    renderBadge();

    expect(screen.getByTestId('hostsView-tabs-alerts-count-error')).toBeInTheDocument();
    expect(screen.queryByTestId('hostsView-tabs-alerts-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hostsView-tabs-alerts-count-loading')).not.toBeInTheDocument();
  });
});
