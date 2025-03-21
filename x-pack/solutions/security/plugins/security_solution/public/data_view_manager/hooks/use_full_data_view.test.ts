/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { DataViewManagerScopeName } from '../constants';

import { useFullDataView } from './use_full_data_view';
import { DataView } from '@kbn/data-views-plugin/common';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

jest.mock('../../common/hooks/use_experimental_features');

describe('useFullDataView', () => {
  beforeEach(() => {
    jest.mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);
  });

  describe('when data view is available', () => {
    beforeAll(() => {});

    it('should return DataView instance', () => {
      const wrapper = renderHook(() => useFullDataView(DataViewManagerScopeName.default), {
        wrapper: TestProviders,
      });

      expect(wrapper.result.current).toBeInstanceOf(DataView);
    });
  });

  describe('when data view fields are not available', () => {
    beforeEach(() => {});

    it('should return undefined', () => {
      const wrapper = renderHook(() => useFullDataView(DataViewManagerScopeName.default), {
        wrapper: TestProviders,
      });

      expect(wrapper.result.current).toBeUndefined();
    });
  });
});
