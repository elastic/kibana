/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TimeRange } from '@kbn/es-query';
import { ContainerMetrics } from './container_metrics';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { useIntegrationCheck } from '../../../hooks/use_integration_check';
import { INTEGRATIONS } from '../../../constants';
import { ContentTabIds } from '../../../types';

jest.mock('../../../hooks/use_tab_switcher');
jest.mock('../../../hooks/use_integration_check');
jest.mock('../../../charts/docker_charts', () => ({
  DockerCharts: ({
    metric,
    onShowAll,
  }: {
    metric: string;
    onShowAll: (metric: string) => void;
  }) => (
    <button
      data-test-subj={`dockerShowAll-${metric}`}
      onClick={() => onShowAll(metric)}
      type="button"
    />
  ),
}));
jest.mock('../../../charts/kubernetes_charts', () => ({
  KubernetesContainerCharts: ({
    metric,
    onShowAll,
  }: {
    metric: string;
    onShowAll: (metric: string) => void;
  }) => (
    <button
      data-test-subj={`kubernetesShowAll-${metric}`}
      onClick={() => onShowAll(metric)}
      type="button"
    />
  ),
}));

const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;
const useIntegrationCheckMock = useIntegrationCheck as jest.MockedFunction<
  typeof useIntegrationCheck
>;

const dateRange: TimeRange = {
  from: '2023-03-28T18:20:00.000Z',
  to: '2023-03-28T18:21:00.000Z',
};

const mockShowTab = jest.fn();

const mockIntegrations = (integrations: string[]) => {
  useIntegrationCheckMock.mockImplementation(({ dependsOn }) => integrations.includes(dependsOn));
};

const renderContainerMetrics = () =>
  render(<ContainerMetrics entityId="container-1" dateRange={dateRange} />);

describe('ContainerMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useTabSwitcherContextMock.mockReturnValue({
      showTab: mockShowTab,
      activeTabId: ContentTabIds.OVERVIEW,
    } as unknown as ReturnType<typeof useTabSwitcherContext>);
  });

  it.each(['cpu', 'memory', 'network', 'disk'] as const)(
    'opens the metrics tab scrolled to the %s section for a Docker container',
    async (metric) => {
      mockIntegrations([INTEGRATIONS.docker]);
      renderContainerMetrics();

      await userEvent.click(screen.getByTestId(`dockerShowAll-${metric}`));

      expect(mockShowTab).toHaveBeenCalledWith(ContentTabIds.METRICS, { scrollTo: metric });
    }
  );

  it.each(['cpu', 'memory'] as const)(
    'opens the metrics tab scrolled to the %s section for a Kubernetes container',
    async (metric) => {
      mockIntegrations([INTEGRATIONS.kubernetesContainer]);
      renderContainerMetrics();

      await userEvent.click(screen.getByTestId(`kubernetesShowAll-${metric}`));

      expect(mockShowTab).toHaveBeenCalledWith(ContentTabIds.METRICS, { scrollTo: metric });
    }
  );

  it('prefers the Docker charts when the container reports both integrations', () => {
    mockIntegrations([INTEGRATIONS.docker, INTEGRATIONS.kubernetesContainer]);
    renderContainerMetrics();

    expect(screen.getByTestId('dockerShowAll-cpu')).toBeInTheDocument();
    expect(screen.queryByTestId('kubernetesShowAll-cpu')).not.toBeInTheDocument();
  });

  it('renders nothing when the container has neither integration', () => {
    mockIntegrations([]);
    const { container } = renderContainerMetrics();

    expect(container).toBeEmptyDOMElement();
  });
});
