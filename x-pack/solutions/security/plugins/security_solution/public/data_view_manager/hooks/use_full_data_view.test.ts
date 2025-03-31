/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewManagerScopeName } from '../constants';

import { useFullDataView } from './use_full_data_view';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useSelector } from 'react-redux';

jest.mock('../../common/hooks/use_experimental_features');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('useFullDataView', () => {
  beforeEach(() => {
    jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);
    jest
      .mocked(useSelector)
      .mockReturnValue({ dataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, status: 'ready' });
  });

  describe('when data view is available', () => {
    it('should return DataView instance', async () => {
      const wrapper = renderHook(() => useFullDataView(DataViewManagerScopeName.default), {
        wrapper: TestProviders,
      });

      await act(async () => wrapper.rerender(DataViewManagerScopeName.default));
      expect(wrapper.result.current.dataView).toBeTruthy();
    });
  });

  describe('when data view fields are not available', () => {
    it('should return undefined', () => {
      const wrapper = renderHook(() => useFullDataView(DataViewManagerScopeName.default), {
        wrapper: TestProviders,
      });

      expect(wrapper.result.current.dataView).toBeUndefined();
    });
  });
});
