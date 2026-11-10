/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '../../../../../common/lib/kibana';
import type { EntityGridLoadState } from './use_entity_grid_data';
import {
  GRID_LOADED_EVENT_NAME,
  getSortType,
  useGridLoadTelemetry,
} from './use_grid_load_telemetry';

jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));

const reportEvent = jest.fn();

const loading: EntityGridLoadState = {
  isRowsPending: true,
  isCountPending: true,
  isEnrichPending: false,
  hasError: false,
};
const settled: EntityGridLoadState = {
  isRowsPending: false,
  isCountPending: false,
  isEnrichPending: false,
  hasError: false,
};

type Props = Parameters<typeof useGridLoadTelemetry>[0];
const props = (loadState: EntityGridLoadState, overrides: Partial<Props> = {}): Props => ({
  skip: false,
  runKey: 'resolved:risk:7d',
  isFilterPending: false,
  loadState,
  isFetching: Object.values(loadState).some(Boolean),
  meta: {
    rowsMode: 'resolved',
    sortField: 'entity.risk.calculated_score_norm',
    timeRange: '7d',
    hasTileFilter: false,
    hasEntityFilters: false,
    isAtLoadLimit: false,
  },
  ...overrides,
});

describe('useGridLoadTelemetry', () => {
  let now = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    (useKibana as jest.Mock).mockReturnValue({ services: { analytics: { reportEvent } } });
  });

  it('reports once, when the rows, the count and the first rows in view have settled', () => {
    const { rerender } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props(loading),
    });
    now = 1000;
    // The rows are in; the computed columns of the rows in view start loading.
    rerender(props({ ...loading, isRowsPending: false, isEnrichPending: true }));
    now = 1500;
    rerender(props({ ...settled, isEnrichPending: true }));
    expect(reportEvent).not.toHaveBeenCalled();
    now = 3000;
    rerender(props(settled));
    rerender(props(settled));

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith('performance_metric', {
      eventName: GRID_LOADED_EVENT_NAME,
      duration: 3000,
      key1: 'time_to_rows',
      value1: 1000,
      key2: 'time_to_count',
      value2: 1500,
      meta: {
        outcome: 'ok',
        rows_mode: 'resolved',
        sort_column: 'entity.risk.calculated_score_norm',
        sort_type: 'fast',
        has_tile_filter: false,
        has_entity_filters: false,
        is_at_load_limit: false,
        time_range: '7d',
      },
    });
  });

  it('does not take the computed columns as settled before the rows', () => {
    // While the rows load there is nothing to enrich, so enrichment reports as not pending.
    const { rerender } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props({ ...settled, isRowsPending: true }),
    });
    now = 2000;
    rerender(props(settled));
    expect(reportEvent.mock.calls[0][1]).toMatchObject({ duration: 2000, value1: 2000, value2: 0 });
  });

  it('reports a failed load once nothing is fetching, even if the rows never settle', () => {
    const { rerender } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props({ ...loading, hasError: true }, { isFetching: true }),
    });
    expect(reportEvent).not.toHaveBeenCalled();
    now = 800;
    rerender(props({ ...loading, isCountPending: false, hasError: true }, { isFetching: false }));

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent.mock.calls[0][1]).toMatchObject({
      duration: 800,
      value1: 800,
      value2: 800,
      meta: { outcome: 'failed' },
    });
  });

  it('reports a settled load whose computed columns failed as failed', () => {
    renderHook(() => useGridLoadTelemetry(props({ ...settled, hasError: true })));
    expect(reportEvent.mock.calls[0][1].meta.outcome).toBe('failed');
  });

  it('reports again for a new run key, and not on re-renders or while skipped', () => {
    const { rerender } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props(settled, { skip: true }),
    });
    expect(reportEvent).not.toHaveBeenCalled();
    rerender(props(settled));
    rerender(props(settled));
    expect(reportEvent).toHaveBeenCalledTimes(1);

    const sorted = (loadState: EntityGridLoadState) =>
      props(loadState, {
        runKey: 'resolved:alerts:7d',
        meta: { ...props(settled).meta, sortField: 'alert_count', isAtLoadLimit: true },
      });
    rerender(sorted({ ...settled, isRowsPending: true }));
    expect(reportEvent).toHaveBeenCalledTimes(1);
    rerender(sorted(settled));
    expect(reportEvent).toHaveBeenCalledTimes(2);
    expect(reportEvent.mock.calls[1][1].meta).toMatchObject({
      sort_column: 'alert_count',
      sort_type: 'computed',
      is_at_load_limit: true,
    });
  });

  it('sends no entity ids, names, counts or totals', () => {
    renderHook(() => useGridLoadTelemetry(props(settled)));
    const [[, payload]] = reportEvent.mock.calls;
    expect(Object.keys(payload).sort()).toEqual(
      ['duration', 'eventName', 'key1', 'key2', 'meta', 'value1', 'value2'].sort()
    );
    expect(Object.keys(payload.meta).sort()).toEqual(
      [
        'has_entity_filters',
        'has_tile_filter',
        'is_at_load_limit',
        'outcome',
        'rows_mode',
        'sort_column',
        'sort_type',
        'time_range',
      ].sort()
    );
  });

  it.each([
    ['entity.name', 'fast'],
    ['entity.EngineMetadata.Type', 'fast'],
    ['entity.risk.calculated_score_norm', 'fast'],
    ['asset.criticality', 'fast'],
    ['entity.lifecycle.first_seen', 'fast'],
    ['@timestamp', 'fast'],
    ['group_size', 'computed'],
    ['risk_score_change', 'computed'],
    ['alert_count', 'computed'],
    ['last_seen_alert', 'computed'],
    ['anomaly_count', 'computed'],
    ['case_count', 'computed'],
  ])('maps the %s sort to %s', (sortField, sortType) => {
    expect(getSortType(sortField)).toBe(sortType);
  });
});

describe('useGridLoadTelemetry, loads left before they settle', () => {
  let now = 0;
  const outcomes = () => reportEvent.mock.calls.map(([, event]) => event.meta.outcome);

  beforeEach(() => {
    jest.clearAllMocks();
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    (useKibana as jest.Mock).mockReturnValue({ services: { analytics: { reportEvent } } });
  });

  it('reports a load as abandoned, with its time so far, when a new sort or filter replaces it', () => {
    const { rerender } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props(loading),
    });
    now = 1000;
    rerender(props({ ...loading, isRowsPending: false }));
    now = 4000;
    rerender(props(loading, { runKey: 'resolved:name:7d' }));

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent.mock.calls[0][1]).toMatchObject({
      duration: 4000,
      value1: 1000,
      value2: 4000,
      meta: { outcome: 'abandoned', sort_column: 'entity.risk.calculated_score_norm' },
    });

    // The new load still reports on its own.
    now = 5000;
    rerender(props(settled, { runKey: 'resolved:name:7d' }));
    expect(outcomes()).toEqual(['abandoned', 'ok']);
  });

  it('reports a load as abandoned when the grid goes away before it settles', () => {
    const { unmount } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props(loading),
    });
    now = 2500;
    unmount();
    expect(outcomes()).toEqual(['abandoned']);
    expect(reportEvent.mock.calls[0][1].duration).toBe(2500);
  });

  it('sends nothing more when a load that settled is left', () => {
    const { rerender, unmount } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props(settled),
    });
    rerender(props(loading, { runKey: 'resolved:name:7d' }));
    rerender(props(settled, { runKey: 'resolved:name:7d' }));
    unmount();
    expect(outcomes()).toEqual(['ok', 'ok']);
  });

  it('reports nothing for a grid that does not report its loads', () => {
    const { unmount } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props(loading, { skip: true }),
    });
    unmount();
    expect(reportEvent).not.toHaveBeenCalled();
  });
});

describe('useGridLoadTelemetry, while the filters of a load resolve', () => {
  let now = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    (useKibana as jest.Mock).mockReturnValue({ services: { analytics: { reportEvent } } });
  });

  it('times the wait for the search overrides or tile ids, and reports the load once', () => {
    const { rerender } = renderHook((p: Props) => useGridLoadTelemetry(p), {
      initialProps: props(settled, { isFilterPending: true }),
    });
    now = 1200;
    // The grid shows the rows of the filter before it resolved: not this load's result yet.
    rerender(props(settled, { isFilterPending: true }));
    expect(reportEvent).not.toHaveBeenCalled();

    now = 2000;
    rerender(props(settled));
    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent.mock.calls[0][1]).toMatchObject({
      duration: 2000,
      meta: { outcome: 'ok' },
    });
  });
});
