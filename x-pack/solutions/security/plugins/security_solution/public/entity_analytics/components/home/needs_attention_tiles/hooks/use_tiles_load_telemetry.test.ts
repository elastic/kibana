/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '../../../../../common/lib/kibana';
import type { TileLoadState } from './use_tiles_load_telemetry';
import { TILES_LOADED_EVENT_NAME, useTilesLoadTelemetry } from './use_tiles_load_telemetry';

jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));

const reportEvent = jest.fn();

const loading: TileLoadState = {
  isCountPending: true,
  isDeltaLoading: false,
  isTrendLoading: true,
  isTimedOut: false,
  hasError: false,
};
const settled: TileLoadState = {
  isCountPending: false,
  isDeltaLoading: false,
  isTrendLoading: false,
  isTimedOut: false,
  hasError: false,
};

type Props = Parameters<typeof useTilesLoadTelemetry>[0];
const props = (tiles: Record<string, TileLoadState>, overrides: Partial<Props> = {}): Props => ({
  skip: false,
  runKey: '24h:{}',
  timeRange: '24h',
  hasEntityFilters: false,
  tiles,
  ...overrides,
});

describe('useTilesLoadTelemetry', () => {
  let now = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    (useKibana as jest.Mock).mockReturnValue({ services: { analytics: { reportEvent } } });
  });

  it("reports once, when every count, delta and sparkline has settled, with each tile's times", () => {
    const { rerender } = renderHook((p: Props) => useTilesLoadTelemetry(p), {
      initialProps: props({ alerts: loading, risk: loading }),
    });
    now = 1000;
    rerender(
      props({ alerts: { ...loading, isCountPending: false, isDeltaLoading: true }, risk: loading })
    );
    now = 2500;
    rerender(props({ alerts: settled, risk: { ...loading, isCountPending: false } }));
    expect(reportEvent).not.toHaveBeenCalled();
    now = 4000;
    rerender(props({ alerts: settled, risk: settled }));
    rerender(props({ alerts: settled, risk: settled }));

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith('performance_metric', {
      eventName: TILES_LOADED_EVENT_NAME,
      duration: 4000,
      key1: 'time_to_counts',
      value1: 2500,
      key2: 'count_timeouts',
      value2: 0,
      key3: 'count_errors',
      value3: 0,
      meta: {
        time_range: '24h',
        has_entity_filters: false,
        tiles: {
          alerts: { count: 1000, delta: 2500, sparkline: 2500 },
          risk: { count: 2500, delta: 2500, sparkline: 4000 },
        },
      },
    });
  });

  it('does not take a delta as settled before its count', () => {
    // While the count loads the delta has not started, so it reports as not loading.
    const { rerender } = renderHook((p: Props) => useTilesLoadTelemetry(p), {
      initialProps: props({ alerts: { ...loading, isTrendLoading: false } }),
    });
    now = 3000;
    rerender(props({ alerts: settled }));
    expect(reportEvent.mock.calls[0][1].meta.tiles.alerts).toEqual({
      count: 3000,
      delta: 3000,
      sparkline: 3000,
    });
  });

  it('counts the timeouts and the other errors of the counts', () => {
    renderHook(() =>
      useTilesLoadTelemetry(
        props({
          alerts: { ...settled, isTimedOut: true, hasError: true },
          anomalies: { ...settled, hasError: true },
          risk: settled,
        })
      )
    );
    expect(reportEvent.mock.calls[0][1]).toMatchObject({ value2: 1, value3: 1 });
  });

  it('reports again for a new range or filter, and not while the tiles are skipped', () => {
    const { rerender } = renderHook((p: Props) => useTilesLoadTelemetry(p), {
      initialProps: props({ alerts: settled }, { skip: true }),
    });
    expect(reportEvent).not.toHaveBeenCalled();
    rerender(props({ alerts: settled }));
    rerender(props({ alerts: settled }, { runKey: '7d:{}', timeRange: '7d' }));
    expect(reportEvent).toHaveBeenCalledTimes(2);
    expect(reportEvent.mock.calls[1][1].meta.time_range).toBe('7d');
  });
});
