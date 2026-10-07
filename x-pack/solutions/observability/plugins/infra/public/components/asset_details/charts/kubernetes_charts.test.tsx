/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import { KubernetesNodeCharts } from './kubernetes_charts';
import { useKubernetesCharts } from '../hooks/use_host_metrics_charts';
import { useIntegrationCheck } from '../hooks/use_integration_check';

jest.mock('../hooks/use_host_metrics_charts');
jest.mock('../hooks/use_integration_check');
jest.mock('./chart', () => ({
  Chart: ({ id }: { id: string }) => <div data-test-subj={`chart-${id}`} />,
}));

const useKubernetesChartsMock = useKubernetesCharts as jest.MockedFunction<
  typeof useKubernetesCharts
>;
const useIntegrationCheckMock = useIntegrationCheck as jest.MockedFunction<
  typeof useIntegrationCheck
>;

const dateRange: TimeRange = {
  from: '2023-03-28T18:20:00.000Z',
  to: '2023-03-28T18:21:00.000Z',
};

const SECTION_TEST_SUBJ = 'infraAssetDetailsKubernetesChartsSection';
const SHOW_ALL_TEST_SUBJ = 'infraAssetDetailsKubernetesChartsShowAllButton';

const renderKubernetesNodeCharts = ({ onShowAll }: { onShowAll?: (metric: string) => void } = {}) =>
  render(
    <I18nProvider>
      <KubernetesNodeCharts entityId="host-1" dateRange={dateRange} onShowAll={onShowAll} />
    </I18nProvider>
  );

describe('KubernetesNodeCharts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useKubernetesChartsMock.mockReturnValue({
      charts: [{ id: 'nodeCpuCapacity' }],
    } as unknown as ReturnType<typeof useKubernetesCharts>);
  });

  it('renders the Kubernetes section when the host reports the integration', () => {
    useIntegrationCheckMock.mockReturnValue(true);
    renderKubernetesNodeCharts();

    expect(screen.getByTestId(SECTION_TEST_SUBJ)).toBeInTheDocument();
    expect(screen.getByTestId(`${SECTION_TEST_SUBJ}Title`)).toBeInTheDocument();
    expect(screen.getByTestId('chart-nodeCpuCapacity')).toBeInTheDocument();
  });

  it('renders nothing when the host does not report the integration', () => {
    useIntegrationCheckMock.mockReturnValue(false);
    const { container } = renderKubernetesNodeCharts();

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onShowAll with the kubernetes metric group when Show all is clicked', async () => {
    useIntegrationCheckMock.mockReturnValue(true);
    const onShowAll = jest.fn();
    renderKubernetesNodeCharts({ onShowAll });

    await userEvent.click(screen.getByTestId(SHOW_ALL_TEST_SUBJ));

    expect(onShowAll).toHaveBeenCalledWith('kubernetes');
  });

  it('omits the Show all action when no handler is provided', () => {
    useIntegrationCheckMock.mockReturnValue(true);
    renderKubernetesNodeCharts();

    expect(screen.queryByTestId(SHOW_ALL_TEST_SUBJ)).not.toBeInTheDocument();
  });
});
