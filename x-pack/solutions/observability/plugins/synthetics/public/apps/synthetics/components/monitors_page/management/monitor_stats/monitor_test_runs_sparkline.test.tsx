/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MonitorTestRunsSparkline } from './monitor_test_runs_sparkline';

const mockEmbeddable = jest.fn((_props: Record<string, unknown>) => null);
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      exploratoryView: { ExploratoryViewEmbeddable: mockEmbeddable },
    },
  }),
}));

jest.mock('@elastic/eui', () => ({
  useEuiTheme: () => ({ euiTheme: { colors: { vis: { euiColorVis0: '#000' } } } }),
}));

jest.mock('../../../../hooks', () => ({
  useRefreshedRange: () => ({ from: 'now-30d/d', to: 'now' }),
}));

const mockUseMonitorFilters = jest.fn();
jest.mock('../../hooks/use_monitor_filters', () => ({
  useMonitorFilters: () => mockUseMonitorFilters(),
}));

jest.mock('../../hooks/use_monitor_query_filters', () => ({
  useMonitorQueryFilters: () => ({ queryFilter: [] }),
}));

describe('MonitorTestRunsSparkline', () => {
  const spaceFilter = { field: 'meta.space_id', values: ['default'] };

  const lastForwardedFilters = () => {
    const { attributes } = mockEmbeddable.mock.calls.at(-1)![0] as {
      attributes: Array<{ filters: unknown }>;
    };
    return attributes[0].filters;
  };

  beforeEach(() => {
    mockEmbeddable.mockClear();
    mockUseMonitorFilters.mockReset();
  });

  it('forwards the current monitor filters (including meta.space_id) to the embeddable', () => {
    mockUseMonitorFilters.mockReturnValue([spaceFilter]);

    render(<MonitorTestRunsSparkline />);

    expect(mockEmbeddable).toHaveBeenCalled();
    expect(lastForwardedFilters()).toEqual([spaceFilter]);
  });

  // Regression for #271692: `useKibanaSpace` resolves a tick after mount, so
  // `useMonitorFilters` emits the space filter on a later render. A stale
  // `useMemo` used to pin the space-less filters; assert re-renders pick up the update.
  it('picks up filters that resolve after the initial render', () => {
    mockUseMonitorFilters.mockReturnValueOnce([]);
    const { rerender } = render(<MonitorTestRunsSparkline />);

    expect(lastForwardedFilters()).toEqual([]);

    mockUseMonitorFilters.mockReturnValue([spaceFilter]);
    rerender(<MonitorTestRunsSparkline />);

    expect(lastForwardedFilters()).toEqual([spaceFilter]);
  });
});
