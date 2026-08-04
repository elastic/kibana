/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  useInitDataViewManager as useInitDataViewManagerEngine,
  useSetSignalIndex,
} from '@kbn/data-view-manager';
import { useInitDataViewManager } from './use_init_data_view_manager';
import { useUserInfo } from '../../detections/components/user_info';

jest.mock('@kbn/data-view-manager', () => ({
  ...jest.requireActual('@kbn/data-view-manager'),
  useInitDataViewManager: jest.fn(),
  useSetSignalIndex: jest.fn(),
}));
jest.mock('../../detections/components/user_info');

describe('useInitDataViewManager (plugin orchestrator)', () => {
  const initEngine = jest.fn();
  const setSignalIndex = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useInitDataViewManagerEngine as jest.Mock).mockReturnValue(initEngine);
    (useSetSignalIndex as jest.Mock).mockReturnValue(setSignalIndex);
    (useUserInfo as jest.Mock).mockReturnValue({
      loading: false,
      signalIndexName: 'signal-index',
      signalIndexMappingOutdated: false,
    });
  });

  it('returns the engine init dispatcher', () => {
    const { result } = renderHook(() => useInitDataViewManager());

    expect(result.current).toBe(initEngine);
  });

  it('pushes the current signal index metadata into the store', () => {
    renderHook(() => useInitDataViewManager());

    expect(setSignalIndex).toHaveBeenCalledWith({ name: 'signal-index', isOutdated: false });
  });

  it('does not push signal index metadata while the signal index is still loading', () => {
    (useUserInfo as jest.Mock).mockReturnValue({
      loading: true,
      signalIndexName: null,
      signalIndexMappingOutdated: false,
    });

    renderHook(() => useInitDataViewManager());

    expect(setSignalIndex).not.toHaveBeenCalled();
  });
});
