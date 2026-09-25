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
import { HostMetrics } from './host_metrics';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { useAssetDetailsRenderPropsContext } from '../../../hooks/use_asset_details_render_props';
import { ContentTabIds } from '../../../types';

jest.mock('../../../hooks/use_tab_switcher');
jest.mock('../../../hooks/use_asset_details_render_props');
jest.mock('../../../charts', () => ({
  HostCharts: ({ metric, onShowAll }: { metric: string; onShowAll: (metric: string) => void }) => (
    <button data-test-subj={`showAll-${metric}`} onClick={() => onShowAll(metric)} type="button" />
  ),
  KubernetesNodeCharts: ({ onShowAll }: { onShowAll: (metric: string) => void }) => (
    <button
      data-test-subj="showAll-kubernetes"
      onClick={() => onShowAll('kubernetes')}
      type="button"
    />
  ),
}));

const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;
const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;

const dateRange: TimeRange = {
  from: '2023-03-28T18:20:00.000Z',
  to: '2023-03-28T18:21:00.000Z',
};

const mockShowTab = jest.fn();

describe('HostMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useTabSwitcherContextMock.mockReturnValue({
      showTab: mockShowTab,
      activeTabId: ContentTabIds.OVERVIEW,
    } as unknown as ReturnType<typeof useTabSwitcherContext>);

    useAssetDetailsRenderPropsContextMock.mockReturnValue({
      schema: 'ecs',
    } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);
  });

  it.each(['cpu', 'memory', 'network', 'disk', 'kubernetes'] as const)(
    'opens the metrics tab scrolled to the %s section when its Show all is clicked',
    async (metric) => {
      render(<HostMetrics entityId="host-1" dateRange={dateRange} />);

      await userEvent.click(screen.getByTestId(`showAll-${metric}`));

      expect(mockShowTab).toHaveBeenCalledWith(ContentTabIds.METRICS, { scrollTo: metric });
    }
  );
});
