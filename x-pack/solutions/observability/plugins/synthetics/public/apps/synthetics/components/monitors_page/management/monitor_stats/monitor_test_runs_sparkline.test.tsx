/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { MonitorTestRunsSparkline } from './monitor_test_runs_sparkline';

const mockEmbeddable = vi.fn((_props: Record<string, unknown>) => null);
vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        exploratoryView: { ExploratoryViewEmbeddable: mockEmbeddable },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@elastic/eui', () => {
  const mocked = {
    useEuiTheme: () => ({ euiTheme: { colors: { vis: { euiColorVis0: '#000' } } } }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../hooks', () => {
  const mocked = {
    useRefreshedRange: () => ({ from: 'now-30d/d', to: 'now' }),
  };
  return { ...mocked, default: mocked };
});

const mockUseMonitorFilters = vi.fn();
vi.mock('../../hooks/use_monitor_filters', () => {
  const mocked = {
    useMonitorFilters: () => mockUseMonitorFilters(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_monitor_query_filters', () => {
  const mocked = {
    useMonitorQueryFilters: () => ({ queryFilter: [] }),
  };
  return { ...mocked, default: mocked };
});

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
