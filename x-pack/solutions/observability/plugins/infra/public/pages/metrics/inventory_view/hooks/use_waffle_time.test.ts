/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import type { InventoryView } from '../../../../../common/inventory_views';
import type { WaffleTimeState } from './use_waffle_time';
import { useWaffleTime } from './use_waffle_time';

jest.mock('@kbn/observability-shared-plugin/public');

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    location: '',
    replace: () => {},
  }),
}));

let mockCurrentView: InventoryView | null = null;
jest.mock('./use_inventory_views', () => ({
  useInventoryViewsContext: () => ({
    currentView: mockCurrentView,
  }),
}));

jest.mock('../../../../hooks/use_kibana_timefilter_time', () => ({
  useKibanaTimefilterTime: () => [() => ({ from: 'now', to: 'now' })],
}));

const mockUseUrlState = useUrlState as jest.MockedFunction<typeof useUrlState>;

const PAST_TIME = new Date('2018-10-17T19:58:03.000Z').getTime();
const STORED_VIEW_TIME = new Date('2020-01-02T03:04:05.000Z').getTime();

const buildView = (attributes: Partial<InventoryView['attributes']> = {}): InventoryView =>
  ({
    id: '0',
    attributes: { autoReload: false, ...attributes },
  } as InventoryView);

describe('useWaffleTime', () => {
  // Stands in for the URL-backed store: the real setUrlState re-reads the current URL,
  // so a functional patch always sees the latest committed time.
  let urlState: WaffleTimeState;
  const setUrlState = jest.fn((patch) => {
    urlState = patch instanceof Function ? patch(urlState) : patch;
  });

  beforeEach(() => {
    setUrlState.mockClear();
    mockCurrentView = null;
    urlState = { currentTime: Date.now(), isAutoReloading: false };
    mockUseUrlState.mockImplementation(
      () => [urlState, setUrlState] as unknown as ReturnType<typeof useUrlState>
    );
  });

  it('keeps the selected time when a view without a stored time resolves after load', () => {
    const { result, rerender } = renderHook(() => useWaffleTime());

    // The user picks a past time while the inventory-views query is still in flight.
    act(() => {
      result.current.jumpToTime(PAST_TIME);
    });
    expect(urlState.currentTime).toBe(PAST_TIME);

    // The query resolves: the default view carries no `time`, so it must not reset the clock.
    mockCurrentView = buildView();
    rerender();

    expect(urlState.currentTime).toBe(PAST_TIME);
  });

  it('applies the stored time of a view that has one', () => {
    const { result, rerender } = renderHook(() => useWaffleTime());

    act(() => {
      result.current.jumpToTime(PAST_TIME);
    });

    mockCurrentView = buildView({ time: STORED_VIEW_TIME });
    rerender();

    expect(urlState.currentTime).toBe(STORED_VIEW_TIME);
  });
});
