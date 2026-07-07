/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import {
  generateMockIndicator,
  generateMockUrlIndicator,
} from '../../../../../common/threat_intelligence/types/indicator';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import type { UseFilterInValue } from './use_filter_in_out';
import { useFilterInOut } from './use_filter_in_out';
import { FilterIn, updateFiltersArray } from '../utils/filter';

jest.mock('../utils/filter', () => ({ updateFiltersArray: jest.fn() }));
jest.mock('../../indicators/hooks/use_ti_data_view', () => ({
  useTIDataView: jest
    .fn()
    .mockReturnValue({ sourcererDataView: { id: 'security-solution-default' } }),
}));

describe('useFilterInOut()', () => {
  let hookResult: RenderHookResult<UseFilterInValue, unknown>;

  it('should return empty object if Indicator is incorrect', () => {
    const indicator: Indicator = generateMockIndicator();
    indicator.fields['threat.indicator.name'] = ['wrong'];
    const field: string = 'field';
    const filterType = FilterIn;

    hookResult = renderHook(() => useFilterInOut({ indicator, field, filterType }), {
      wrapper: TestProvidersComponent,
    });
    expect(hookResult.result.current).toEqual({});
  });

  it('should return filterFn for Indicator', () => {
    const indicator: Indicator = generateMockUrlIndicator();
    const field: string = 'threat.indicator.name';
    const filterType = FilterIn;

    hookResult = renderHook(() => useFilterInOut({ indicator, field, filterType }), {
      wrapper: TestProvidersComponent,
    });

    expect(hookResult.result.current).toHaveProperty('filterFn');
  });

  it('should return filterFn for string', () => {
    const indicator: string = '0.0.0.0';
    const field: string = 'threat.indicator.name';
    const filterType = FilterIn;

    hookResult = renderHook(() => useFilterInOut({ indicator, field, filterType }), {
      wrapper: TestProvidersComponent,
    });

    expect(hookResult.result.current).toHaveProperty('filterFn');
  });

  describe('calling filterFn', () => {
    it('should call dependencies ', () => {
      const indicator: string = '0.0.0.0';
      const field: string = 'threat.indicator.name';
      const filterType = FilterIn;

      hookResult = renderHook(() => useFilterInOut({ indicator, field, filterType }), {
        wrapper: TestProvidersComponent,
      });

      expect(hookResult.result.current).toHaveProperty('filterFn');

      hookResult.result.current.filterFn?.();

      expect(jest.mocked(updateFiltersArray)).toHaveBeenCalledWith(
        [],
        'threat.indicator.name',
        '0.0.0.0',
        undefined,
        'security-solution-default'
      );
    });
  });
});
