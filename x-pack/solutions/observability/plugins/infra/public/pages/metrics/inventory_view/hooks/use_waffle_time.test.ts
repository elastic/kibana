/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import type { InventoryView } from '../../../../../common/inventory_views';
import {
  staticInventoryViewAttributes,
  staticInventoryViewId,
} from '../../../../../common/inventory_views';
import type { WaffleTimeState } from './use_waffle_time';
import { useWaffleTime } from './use_waffle_time';

jest.mock('@kbn/observability-shared-plugin/public');

jest.mock('../../../../hooks/use_kibana_timefilter_time', () => ({
  useKibanaTimefilterTime: () => [() => ({ from: 'now', to: 'now' })],
}));

let mockCurrentView: InventoryView | null = null;
jest.mock('./use_inventory_views', () => ({
  useInventoryViewsContext: () => ({ currentView: mockCurrentView }),
}));

const mockUseUrlState = useUrlState as jest.MockedFunction<typeof useUrlState>;

const SELECTED_TIME = new Date('2023-03-28T18:20:59.000Z').getTime();
const SAVED_VIEW_TIME = new Date('2021-01-01T00:00:00.000Z').getTime();

const createView = (id: string, time?: number): InventoryView => ({
  id,
  attributes: { ...staticInventoryViewAttributes, isStatic: id === staticInventoryViewId, time },
});

describe('useWaffleTime', () => {
  let setUrlState: jest.Mock;

  beforeEach(() => {
    mockCurrentView = null;
    setUrlState = jest.fn();
    mockUseUrlState.mockReturnValue([
      { currentTime: SELECTED_TIME, isAutoReloading: false },
      setUrlState,
    ]);
  });

  const applyUpdater = (): WaffleTimeState => {
    const [updater] = setUrlState.mock.calls[0];
    return updater({ currentTime: SELECTED_TIME, isAutoReloading: false });
  };

  it('does not overwrite the selected time when the default view resolves after mount', () => {
    const { rerender } = renderHook(() => useWaffleTime());

    // The inventory views request resolves with the static default view.
    mockCurrentView = createView(staticInventoryViewId);
    rerender();

    expect(setUrlState).not.toHaveBeenCalled();
  });

  it('keeps the selected time when switching to a saved view that has no time', () => {
    mockCurrentView = createView(staticInventoryViewId);
    const { rerender } = renderHook(() => useWaffleTime());

    mockCurrentView = createView('saved-view-without-time');
    rerender();

    expect(applyUpdater()).toEqual({ currentTime: SELECTED_TIME, isAutoReloading: false });
  });

  it('applies the time of a saved view that has one', () => {
    mockCurrentView = createView(staticInventoryViewId);
    const { rerender } = renderHook(() => useWaffleTime());

    mockCurrentView = createView('saved-view-with-time', SAVED_VIEW_TIME);
    rerender();

    expect(applyUpdater()).toEqual({ currentTime: SAVED_VIEW_TIME, isAutoReloading: false });
  });
});
