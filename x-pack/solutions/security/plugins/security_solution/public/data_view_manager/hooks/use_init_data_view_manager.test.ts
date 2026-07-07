/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useInitDataViewManager } from './use_init_data_view_manager';
import { useDispatch } from 'react-redux';
import { sharedDataViewManagerSlice } from '../redux/slices';

jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => true,
}));

jest.mock('react-redux', () => {
  const dispatch = jest.fn();

  return {
    ...jest.requireActual('react-redux'),
    useDispatch: () => dispatch,
  };
});

describe('useInitDataViewPicker', () => {
  it('should render and dispatch an init action', () => {
    renderHook(
      () => {
        return useInitDataViewManager()([]);
      },
      { wrapper: TestProviders }
    );

    expect(useDispatch()).toHaveBeenCalledWith(sharedDataViewManagerSlice.actions.init([]));
  });
});
