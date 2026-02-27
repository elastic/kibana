/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ALERTS_BY_HOST_NO_DATA,
  ALERTS_BY_HOST_PANEL,
  ALERTS_BY_HOST_PROGRESS_BAR,
  ALERTS_BY_HOST_ROW,
  AlertsProgressBarByHostNamePanel,
} from './alerts_progress_bar_by_host_name_panel';
import { TestProviders } from '../../../../common/mock';
import { useSummaryChartData } from '../../alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data';
import { parsedAlerts } from '../../alerts_kpis/alerts_progress_bar_panel/mock_data';

jest.mock('../../alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data');

describe('<AlertsProgressBarByHostNamePanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all components', () => {
    (useSummaryChartData as jest.Mock).mockReturnValue({
      items: parsedAlerts,
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <AlertsProgressBarByHostNamePanel signalIndexName={''} />
      </TestProviders>
    );

    expect(getByTestId('header-section')).toHaveTextContent('Alert distribution by host');
    expect(getByTestId(ALERTS_BY_HOST_PANEL)).toHaveTextContent('Host name');

    expect(queryByTestId(ALERTS_BY_HOST_PROGRESS_BAR)).not.toBeInTheDocument();
    expect(queryByTestId(ALERTS_BY_HOST_NO_DATA)).not.toBeInTheDocument();

    parsedAlerts
      .filter((value) => value.key !== '-')
      .forEach((alert, i) => {
        expect(getByTestId(`${ALERTS_BY_HOST_ROW}${alert.key}`)).toBeInTheDocument();
        expect(getByTestId(`${ALERTS_BY_HOST_ROW}${alert.key}`).textContent).toContain(
          parsedAlerts[i].label
        );
        expect(getByTestId(`${ALERTS_BY_HOST_ROW}${alert.key}`).textContent).toContain(
          parsedAlerts[i].percentageLabel
        );
      });
  });

  it('should render loading', () => {
    (useSummaryChartData as jest.Mock).mockReturnValue({
      items: [],
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <AlertsProgressBarByHostNamePanel signalIndexName={''} />
      </TestProviders>
    );

    expect(getByTestId(ALERTS_BY_HOST_PROGRESS_BAR)).toBeInTheDocument();
  });

  it('should render no data', () => {
    (useSummaryChartData as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <AlertsProgressBarByHostNamePanel signalIndexName={''} />
      </TestProviders>
    );

    expect(getByTestId(ALERTS_BY_HOST_NO_DATA)).toBeInTheDocument();
    expect(queryByTestId(ALERTS_BY_HOST_PROGRESS_BAR)).not.toBeInTheDocument();
  });
});
