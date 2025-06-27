/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useSelectDataView } from './use_select_data_view';
import { useDispatch } from 'react-redux';
import { DataViewManagerScopeName } from '../constants';

jest.mock('react-redux', () => {
  const dispatch = jest.fn();

  return {
    ...jest.requireActual('react-redux'),
    useDispatch: () => dispatch,
  };
});

describe('useSelectDataView', () => {
  beforeEach(jest.clearAllMocks);

  it('should render and dispatch data view selection actions', () => {
    const { result } = renderHook(
      () => {
        return useSelectDataView();
      },
      { wrapper: TestProviders }
    );

    result.current({ id: 'test', scope: DataViewManagerScopeName.default });

    expect(useDispatch()).toHaveBeenCalledWith({
      payload: { id: 'test', scope: 'default' },
      type: 'x-pack/security_solution/dataViewManager/selectDataView',
    });
  });

  describe('when trying to call the hook with empty params', () => {
    it('should render but not dispatch data view selection', () => {
      const { result } = renderHook(
        () => {
          return useSelectDataView();
        },
        { wrapper: TestProviders }
      );

      result.current({
        id: undefined,
        fallbackPatterns: [],
        scope: DataViewManagerScopeName.default,
      });

      expect(useDispatch()).not.toHaveBeenCalledWith({
        payload: { id: 'test', scope: 'default' },
        type: 'x-pack/security_solution/dataViewManager/selectDataView',
      });
    });
  });
});
