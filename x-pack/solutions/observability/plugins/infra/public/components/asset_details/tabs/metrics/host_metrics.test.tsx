/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { HostMetrics } from './host_metrics';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useIntersectingState } from '../../hooks/use_intersecting_state';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { HOST_METRIC_GROUP_TITLES } from '../../translations';

jest.mock('../../hooks/use_asset_details_render_props');
jest.mock('../../hooks/use_data_views');
jest.mock('../../hooks/use_date_picker');
jest.mock('../../hooks/use_intersecting_state');
jest.mock('../../hooks/use_tab_switcher');

// `KubernetesNodeCharts` renders nothing for hosts that do not report the Kubernetes node
// integration, which is what removes it from the quick-access list.
let mockHasKubernetesSection = true;

// `MetricsTemplate` collects quick-access items from the `data-section-id` of every child it
// receives a ref for, so the chart sections are stubbed with the same markers the real ones set.
jest.mock('../../charts', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const { HOST_METRIC_GROUP_TITLES: titles } =
    jest.requireActual<typeof import('../../translations')>('../../translations');

  const chartsSection = (sectionId: keyof typeof titles, ref: React.Ref<HTMLDivElement>) =>
    react.createElement('div', { ref, 'data-section-id': sectionId }, titles[sectionId]);

  return {
    HostCharts: react.forwardRef<HTMLDivElement, { metric: keyof typeof titles }>(
      ({ metric }, ref) => chartsSection(metric, ref)
    ),
    KubernetesNodeCharts: react.forwardRef<HTMLDivElement>((_props, ref) =>
      mockHasKubernetesSection ? chartsSection('kubernetes', ref) : null
    ),
  };
});

const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;
const useDataViewsContextMock = useDataViewsContext as jest.MockedFunction<
  typeof useDataViewsContext
>;
const useDatePickerContextMock = useDatePickerContext as jest.MockedFunction<
  typeof useDatePickerContext
>;
const useIntersectingStateMock = useIntersectingState as jest.MockedFunction<
  typeof useIntersectingState
>;
const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;

const HOST_SECTION_IDS = ['cpu', 'memory', 'network', 'disk', 'log'] as const;

const buildHostMetrics = () => (
  <I18nProvider>
    <HostMetrics />
  </I18nProvider>
);

const renderHostMetrics = () => {
  const { rerender } = render(buildHostMetrics());

  // Quick-access items are collected from the section refs during commit and read on the next
  // render, which the browser triggers through the quick-access container's ResizeObserver.
  rerender(buildHostMetrics());
};

describe('HostMetrics', () => {
  beforeAll(() => {
    // Quick-access labels come from each section's `innerText`, which jsdom does not implement.
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent;
      },
    });
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'innerText');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasKubernetesSection = true;

    useAssetDetailsRenderPropsContextMock.mockReturnValue({
      entity: { id: 'host-1', name: 'host-1', type: 'host' },
      schema: 'ecs',
      renderMode: { mode: 'page' },
    } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);

    useDataViewsContextMock.mockReturnValue({
      metrics: { dataView: undefined },
      logs: { dataView: undefined },
    } as unknown as ReturnType<typeof useDataViewsContext>);

    useDatePickerContextMock.mockReturnValue({
      dateRange: { from: '2023-03-28T18:20:00.000Z', to: '2023-03-28T18:21:00.000Z' },
    } as unknown as ReturnType<typeof useDatePickerContext>);

    useIntersectingStateMock.mockImplementation((_ref, state) => state);

    useTabSwitcherContextMock.mockReturnValue({
      setScrollTo: jest.fn(),
    } as unknown as ReturnType<typeof useTabSwitcherContext>);
  });

  it('lists the Kubernetes section in quick access alongside the host metric groups', () => {
    renderHostMetrics();

    for (const sectionId of [...HOST_SECTION_IDS, 'kubernetes'] as const) {
      expect(screen.getByTestId(`infraMetricsQuickAccessItem${sectionId}`)).toHaveTextContent(
        HOST_METRIC_GROUP_TITLES[sectionId]
      );
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(HOST_SECTION_IDS.length + 1);
  });

  it('omits the Kubernetes section from quick access when the host does not report the integration', () => {
    mockHasKubernetesSection = false;

    renderHostMetrics();

    expect(screen.queryByTestId('infraMetricsQuickAccessItemkubernetes')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(HOST_SECTION_IDS.length);
  });
});
