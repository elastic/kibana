/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  useSyncSourcererUrlState,
  useRestoreDataViewManagerStateFromURL,
} from './use_sync_url_state';
import * as reactRedux from 'react-redux';
import * as experimentalFeatures from '../../common/hooks/use_experimental_features';
import * as globalQueryString from '../../common/utils/global_query_string';
import * as useSelectDataViewModule from './use_select_data_view';
import { SourcererScopeName } from '../../sourcerer/store/model';

jest.mock('react-redux');
jest.mock('../../common/hooks/use_experimental_features');
jest.mock('../../common/utils/global_query_string');
jest.mock('../../common/store/selectors');
jest.mock('./use_select_data_view');

describe('useSyncSourcererUrlState', () => {
  const mockDispatch = jest.fn();
  const mockUpdateUrlParam = jest.fn();
  const mockUseSelector = reactRedux.useSelector as jest.Mock;
  const mockUseDispatch = reactRedux.useDispatch as jest.Mock;
  const mockUseIsExperimentalFeatureEnabled =
    experimentalFeatures.useIsExperimentalFeatureEnabled as jest.Mock;
  const mockUseUpdateUrlParam = globalQueryString.useUpdateUrlParam as jest.Mock;
  const mockUseInitializeUrlParam = globalQueryString.useInitializeUrlParam as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseUpdateUrlParam.mockReturnValue(mockUpdateUrlParam);
    mockUseInitializeUrlParam.mockImplementation((_key, cb) => cb);
    mockUseSelector.mockImplementation((fn) => fn({}));
  });

  it('should not dispatch or update url param if newDataViewPickerEnabled is true', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    renderHook(() => useSyncSourcererUrlState(SourcererScopeName.default));
    // Simulate onInitializeUrlParam call
    const onInitializeUrlParam = mockUseInitializeUrlParam.mock.calls[0][1];
    onInitializeUrlParam({ default: { id: 'test-id', selectedPatterns: ['a'] } });
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockUpdateUrlParam).not.toHaveBeenCalled();
  });

  it('should dispatch setSelectedDataView if newDataViewPickerEnabled is false and initialState is provided', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    renderHook(() => useSyncSourcererUrlState(SourcererScopeName.default));
    const onInitializeUrlParam = mockUseInitializeUrlParam.mock.calls[0][1];
    onInitializeUrlParam({ default: { id: 'test-id', selectedPatterns: ['a'] } });
    expect(mockDispatch).toHaveBeenCalledWith({
      payload: {
        id: 'default',
        selectedDataViewId: 'test-id',
        selectedPatterns: ['a'],
      },
      type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
    });
  });

  it('should update url param if newDataViewPickerEnabled is false and initialState is null', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    mockUseSelector
      .mockReturnValueOnce('test-id') // scopeDataViewId
      .mockReturnValueOnce(['a']); // selectedPatterns
    renderHook(() => useSyncSourcererUrlState(SourcererScopeName.default));
    const onInitializeUrlParam = mockUseInitializeUrlParam.mock.calls[0][1];
    onInitializeUrlParam(null);
    expect(mockUpdateUrlParam).toHaveBeenCalledWith({
      default: { id: 'test-id', selectedPatterns: ['a'] },
    });
  });
});

describe('useRestoreDataViewManagerStateFromURL', () => {
  const mockUseIsExperimentalFeatureEnabled =
    experimentalFeatures.useIsExperimentalFeatureEnabled as jest.Mock;
  const mockUseInitializeUrlParam = globalQueryString.useInitializeUrlParam as jest.Mock;
  const mockUseSelectDataView = useSelectDataViewModule.useSelectDataView as jest.Mock;
  const selectDataView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectDataView.mockReturnValue(selectDataView);
    mockUseInitializeUrlParam.mockImplementation((_key, cb) => cb);
  });

  it('should not call selectDataView if newDataViewPickerEnabled is false', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    renderHook(() => useRestoreDataViewManagerStateFromURL(SourcererScopeName.default));
    const onInitializeUrlParam = mockUseInitializeUrlParam.mock.calls[0][1];
    onInitializeUrlParam({ default: { id: 'test-id', selectedPatterns: ['a'] } });
    expect(selectDataView).not.toHaveBeenCalled();
  });

  it('should call selectDataView for each scope if newDataViewPickerEnabled is true', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    renderHook(() => useRestoreDataViewManagerStateFromURL(SourcererScopeName.default));
    const onInitializeUrlParam = mockUseInitializeUrlParam.mock.calls[0][1];
    onInitializeUrlParam({
      default: { id: 'test-id', selectedPatterns: ['a'] },
      detections: { id: 'det-id', selectedPatterns: ['b'] },
    });
    expect(selectDataView).toHaveBeenCalledWith({
      id: 'test-id',
      scope: ['default'],
      fallbackPatterns: ['a'],
    });
    expect(selectDataView).toHaveBeenCalledWith({
      id: 'det-id',
      scope: ['detections'],
      fallbackPatterns: ['b'],
    });
  });

  it('should not call selectDataView if initialState is null', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    renderHook(() => useRestoreDataViewManagerStateFromURL(SourcererScopeName.default));
    const onInitializeUrlParam = mockUseInitializeUrlParam.mock.calls[0][1];
    onInitializeUrlParam(null);
    expect(selectDataView).not.toHaveBeenCalled();
  });
});
