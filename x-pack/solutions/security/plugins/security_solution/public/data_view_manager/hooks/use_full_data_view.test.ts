/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewManagerScopeName } from '../constants';

import { useFullDataView } from './use_full_data_view';
import { useDataView } from './use_data_view';
import { type FieldSpec, DataView } from '@kbn/data-views-plugin/common';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

jest.mock('../../common/hooks/use_experimental_features');

jest.mock('./use_data_view', () => ({
  useDataView: jest.fn(),
}));

describe('useFullDataView', () => {
  beforeEach(() => {
    jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);
  });

  describe('when data view is available', () => {
    beforeAll(() => {
      jest.mocked(useDataView).mockReturnValue({
        dataView: {
          id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
          fields: {
            '@timestamp': {
              type: 'date',
              name: '@timestamp',
            } as FieldSpec,
          },
        },
        status: 'ready',
      });
    });

    it('should return DataView instance', () => {
      const wrapper = renderHook(() => useFullDataView(DataViewManagerScopeName.default), {
        wrapper: TestProviders,
      });

      expect(wrapper.result.current).toBeInstanceOf(DataView);
    });
  });

  describe('when data view fields are not available', () => {
    beforeEach(() => {
      jest.mocked(useDataView).mockReturnValue({
        dataView: {
          id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
          title: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        },
        status: 'pristine',
      });
    });

    it('should return undefined', () => {
      const wrapper = renderHook(() => useFullDataView(DataViewManagerScopeName.default), {
        wrapper: TestProviders,
      });

      expect(wrapper.result.current).toBeUndefined();
    });
  });
});
