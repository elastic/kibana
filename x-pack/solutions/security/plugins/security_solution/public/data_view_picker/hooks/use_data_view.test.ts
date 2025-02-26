/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewPickerScopeName } from '../constants';
import { useDataView } from './use_data_view';

describe('useDataView', () => {
  describe('when data view is available in the store', () => {
    it('should return dataView from the store', () => {
      const wrapper = renderHook(() => useDataView(DataViewPickerScopeName.default), {
        wrapper: TestProviders,
      });

      expect(wrapper.result.current.status).toEqual('ready');
      expect(wrapper.result.current.dataView).toMatchObject({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      });
    });
  });

  describe('when data view is not available in the store', () => {
    it.todo('should return null');
  });
});
