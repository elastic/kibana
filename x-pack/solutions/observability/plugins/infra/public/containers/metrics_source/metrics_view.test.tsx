/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { useProjectRouting } from '../../hooks/use_project_routing';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useMetricsDataView } from './metrics_view';

vi.mock('../../hooks/use_project_routing', () => {
      const mocked = {
      useProjectRouting: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_kibana', () => {
      const mocked = {
      useKibanaContextForPlugin: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./source', () => {
      const mocked = {
      useSourceContext: vi.fn(() => ({
        source: { configuration: { metricAlias: 'metrics-*' } },
      })),
    };
      return { ...mocked, default: mocked };
    });

const useProjectRoutingMock = useProjectRouting as Mock;
const useKibanaContextForPluginMock = useKibanaContextForPlugin as Mock;

interface MockDataView {
  getIndexPattern: () => string;
  timeFieldName: string;
  fields: Array<{ name: string }>;
}

const makeDataView = (fieldNames: string[]): MockDataView => ({
  getIndexPattern: () => 'metrics-*',
  timeFieldName: '@timestamp',
  fields: fieldNames.map((name) => ({ name })),
});

describe('useMetricsDataView', () => {
  let dataView: MockDataView;
  let create: Mock;
  let refreshFields: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    dataView = makeDataView(['system.cpu.total.norm.pct', 'state']);
    create = vi.fn().mockResolvedValue(dataView);
    refreshFields = vi.fn().mockImplementation(async (dv: MockDataView) => {
      dv.fields = [{ name: 'system.cpu.total.norm.pct' }];
    });
    useKibanaContextForPluginMock.mockReturnValue({
      services: { dataViews: { create, refreshFields } },
    });
    useProjectRoutingMock.mockReturnValue('_alias:*');
  });

  it('resolves the data view without refreshing fields on first load', async () => {
    const { result } = renderHook(() => useMetricsDataView());

    await waitFor(() => {
      expect(result.current.metricsView).toBeDefined();
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(refreshFields).not.toHaveBeenCalled();
    expect(result.current.metricsView?.fields.map((f) => f.name)).toEqual([
      'system.cpu.total.norm.pct',
      'state',
    ]);
  });

  it('force-refreshes fields and publishes a fresh field list when project routing changes', async () => {
    const { result, rerender } = renderHook(() => useMetricsDataView());

    await waitFor(() => {
      expect(result.current.metricsView).toBeDefined();
    });
    const initialFields = result.current.metricsView?.fields;

    useProjectRoutingMock.mockReturnValue('_alias:_origin');
    rerender();

    await waitFor(() => {
      expect(refreshFields).toHaveBeenCalledWith(dataView, false, true);
    });
    await waitFor(() => {
      expect(result.current.metricsView?.fields.map((f) => f.name)).toEqual([
        'system.cpu.total.norm.pct',
      ]);
    });
    expect(result.current.metricsView?.fields).not.toBe(initialFields);
  }, 10000);

  it('does not refresh fields when re-resolving under the same routing', async () => {
    const { result, rerender } = renderHook(() => useMetricsDataView());

    await waitFor(() => {
      expect(result.current.metricsView).toBeDefined();
    });

    rerender();

    expect(refreshFields).not.toHaveBeenCalled();
  });
});
