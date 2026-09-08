/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useProjectRouting } from '../../hooks/use_project_routing';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useMetricsDataView } from './metrics_view';

jest.mock('../../hooks/use_project_routing', () => ({
  useProjectRouting: jest.fn(),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: jest.fn(),
}));

jest.mock('./source', () => ({
  useSourceContext: jest.fn(() => ({
    source: { configuration: { metricAlias: 'metrics-*' } },
  })),
}));

const useProjectRoutingMock = useProjectRouting as jest.Mock;
const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.Mock;

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
  let create: jest.Mock;
  let refreshFields: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    dataView = makeDataView(['system.cpu.total.norm.pct', 'state']);
    create = jest.fn().mockResolvedValue(dataView);
    refreshFields = jest.fn().mockImplementation(async (dv: MockDataView) => {
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
  });

  it('does not refresh fields when re-resolving under the same routing', async () => {
    const { result, rerender } = renderHook(() => useMetricsDataView());

    await waitFor(() => {
      expect(result.current.metricsView).toBeDefined();
    });

    rerender();

    expect(refreshFields).not.toHaveBeenCalled();
  });
});
