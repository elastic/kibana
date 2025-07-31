/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Props } from './chart_context_menu';
import { MetricsExplorerChartContextMenu } from './chart_context_menu';
import { options, timeRange, chartOptions } from '../../../../utils/fixtures/metrics_explorer';
import type { Capabilities } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { MetricsDataViewProvider, SourceProvider } from '../../../../containers/metrics_source';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

const coreStartMock = coreMock.createStart();

const series = { id: 'example-01', rows: [], columns: [] };
const uiCapabilities: Capabilities = {
  navLinks: { show: false },
  management: { fake: { show: false } },
  catalogue: { show: false },
  visualize_v2: { show: true },
  infrastructure: { save: true },
};

const renderComponent = (props: Props) => {
  const history = createMemoryHistory();

  return render(
    <Router history={history}>
      <KibanaContextProvider services={{ ...coreStartMock }}>
        <SourceProvider sourceId="default">
          <MetricsDataViewProvider>
            <MetricsExplorerChartContextMenu {...props} />
          </MetricsDataViewProvider>
        </SourceProvider>
      </KibanaContextProvider>
    </Router>
  );
};

describe('MetricsExplorerChartContextMenu', () => {
  it('should render all options when all conditions are met', async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();

    renderComponent({
      timeRange,
      series,
      options,
      onFilter,
      uiCapabilities,
      chartOptions,
    });

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.getByTestId('metricsExplorerAction-AddFilter')).toBeInTheDocument();
      expect(screen.getByTestId('metricsExplorerAction-OpenInTSVB')).toBeInTheDocument();
      expect(screen.getByTestId('metricsExplorerAction-ViewNodeMetrics')).toBeInTheDocument();
    });
  });

  it('should not display View metrics for incompatible groupBy', async () => {
    const user = userEvent.setup();
    const customOptions = { ...options, groupBy: 'system.network.name' };
    const onFilter = jest.fn();

    renderComponent({
      timeRange,
      series,
      options: customOptions,
      onFilter,
      uiCapabilities,
      chartOptions,
    });

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.queryByTestId('metricsExplorerAction-ViewNodeMetrics')).not.toBeInTheDocument();
    });
  });

  it('should not display "Add Filter" without onFilter', async () => {
    const user = userEvent.setup();

    renderComponent({
      timeRange,
      series,
      options,
      uiCapabilities,
      chartOptions,
    });

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.queryByTestId('metricsExplorerAction-AddFilter')).not.toBeInTheDocument();
    });
  });

  it('should disable "Open in Visualize" when options.metrics is empty', async () => {
    const user = userEvent.setup();
    const customOptions = { ...options, metrics: [] };

    renderComponent({
      timeRange,
      series,
      options: customOptions,
      uiCapabilities,
      chartOptions,
    });

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    await waitFor(() => {
      const visualizeButton = screen.getByTestId('metricsExplorerAction-OpenInTSVB');
      expect(visualizeButton).toBeDisabled();
    });
  });

  it('should not display "Open in Visualize" when unavailable in uiCapabilities', async () => {
    const user = userEvent.setup();
    const customUICapabilities = { ...uiCapabilities, visualize_v2: { show: false } };

    renderComponent({
      timeRange,
      series,
      options,
      uiCapabilities: customUICapabilities,
      chartOptions,
    });

    const menuButton = screen.getByRole('button');
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.queryByTestId('metricsExplorerAction-OpenInTSVB')).not.toBeInTheDocument();
    });
  });

  it('should render only the button when Visualize is disabled and there are no group bys', async () => {
    const customUICapabilities = { ...uiCapabilities, visualize_v2: { show: false } };
    const customOptions = { ...options, groupBy: undefined };

    renderComponent({
      timeRange,
      series,
      options: customOptions,
      uiCapabilities: customUICapabilities,
      chartOptions,
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
    });
  });
});
