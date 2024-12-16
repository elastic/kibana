/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockedSearchService, TestProvidersComponent } from '../../../mocks/test_providers';
import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { useIndicatorsTotalCount } from './use_total_count';

const indicatorsResponse = { rawResponse: { hits: { hits: [], total: 0 } } };

describe('useIndicatorsTotalCount()', () => {
  beforeEach(() => {
    mockedSearchService.search.mockReturnValue(new BehaviorSubject(indicatorsResponse));
    jest.clearAllMocks();
  });

  describe('when mounted', () => {
    beforeEach(async () => {
      await act(async () => {
        renderHook(() => useIndicatorsTotalCount(), {
          wrapper: TestProvidersComponent,
        });
      });
    });

    it('should query the database for threat indicators', async () => {
      expect(mockedSearchService.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('when rerendered', () => {
    it('should not call the database when rerendered', async () => {
      const { rerender } = renderHook(() => useIndicatorsTotalCount(), {
        wrapper: TestProvidersComponent,
      });

      rerender();

      expect(mockedSearchService.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('when query succeeds', () => {
    it('should return the total count', async () => {
      const { result } = renderHook(() => useIndicatorsTotalCount(), {
        wrapper: TestProvidersComponent,
      });

      expect(result.current.count).toEqual(indicatorsResponse.rawResponse.hits.total);
      expect(result.current.isLoading).toEqual(false);
    });
  });
});
