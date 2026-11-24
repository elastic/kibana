/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { skip } from 'rxjs';
import { useReloadRequestTimeContext } from '../../../hooks/use_reload_request_time';
import { useUnifiedSearchContext } from '../../../pages/metrics/hosts/hooks/use_unified_search';
import { useWaffleOptionsContext } from '../../../pages/metrics/inventory_view/hooks/use_waffle_options';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';
import { useDatePicker, type UseDateRangeProviderProps } from './use_date_picker';

jest.mock('../../../hooks/use_reload_request_time');
jest.mock('../../../pages/metrics/hosts/hooks/use_unified_search');
jest.mock('../../../pages/metrics/inventory_view/hooks/use_waffle_options');
jest.mock('./use_asset_details_url_state');

const useReloadRequestTimeContextMock = useReloadRequestTimeContext as jest.MockedFunction<
  typeof useReloadRequestTimeContext
>;
const useUnifiedSearchContextMock = useUnifiedSearchContext as jest.MockedFunction<
  typeof useUnifiedSearchContext
>;
const useWaffleOptionsContextMock = useWaffleOptionsContext as jest.MockedFunction<
  typeof useWaffleOptionsContext
>;
const useAssetDetailsUrlStateMock = useAssetDetailsUrlState as jest.MockedFunction<
  typeof useAssetDetailsUrlState
>;

describe('useDatePicker', () => {
  const dateRange = { from: 'now-15m', to: 'now' };
  const updateReloadRequestTimeMock = jest.fn();

  const renderUseDatePicker = ({
    inventoryAutoRefresh,
    flyoutAutoRefresh,
  }: {
    inventoryAutoRefresh: UseDateRangeProviderProps['autoRefresh'];
    flyoutAutoRefresh: UseDateRangeProviderProps['autoRefresh'];
  }) => {
    useAssetDetailsUrlStateMock.mockReturnValue([
      { dateRange, autoRefresh: flyoutAutoRefresh } as ReturnType<
        typeof useAssetDetailsUrlState
      >[0],
      jest.fn(),
    ]);

    const { result } = renderHook(() =>
      useDatePicker({ dateRange, autoRefresh: inventoryAutoRefresh })
    );
    const onTick = jest.fn();
    result.current.autoRefreshTick$.pipe(skip(1)).subscribe(onTick);

    return { result, onTick };
  };

  beforeEach(() => {
    useReloadRequestTimeContextMock.mockReturnValue({
      updateReloadRequestTime: updateReloadRequestTimeMock,
      reloadRequestTime: 0,
    });
    useUnifiedSearchContextMock.mockReturnValue({
      searchCriteria: {},
    } as unknown as ReturnType<typeof useUnifiedSearchContext>);
    useWaffleOptionsContextMock.mockReturnValue({} as ReturnType<typeof useWaffleOptionsContext>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should emit an auto-refresh tick when auto-refresh is turned on in the flyout', () => {
    const { result, onTick } = renderUseDatePicker({
      inventoryAutoRefresh: { isPaused: true, interval: 5000 },
      flyoutAutoRefresh: { isPaused: false, interval: 5000 },
    });

    act(() => result.current.onRefresh(dateRange));

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(updateReloadRequestTimeMock).not.toHaveBeenCalled();
  });

  it('should update the date range when auto-refresh is paused in the flyout', () => {
    const { result, onTick } = renderUseDatePicker({
      inventoryAutoRefresh: { isPaused: false, interval: 5000 },
      flyoutAutoRefresh: { isPaused: true, interval: 5000 },
    });

    act(() => result.current.onRefresh(dateRange));

    expect(onTick).not.toHaveBeenCalled();
    expect(updateReloadRequestTimeMock).toHaveBeenCalledTimes(1);
  });
});
