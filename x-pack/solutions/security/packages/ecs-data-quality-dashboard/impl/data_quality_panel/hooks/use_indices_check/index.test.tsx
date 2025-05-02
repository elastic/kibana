/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';

import { useIndicesCheck } from '.';

import * as utilsCheckIndex from '../../utils/check_index';
import { mockUnallowedValuesResponse } from '../../mock/unallowed_values/mock_unallowed_values';
import { mockMappingsResponse } from '../../mock/mappings_response/mock_mappings_response';
import { HttpHandler } from '@kbn/core-http-browser';
import { MappingsError } from '../../utils/fetch_mappings';
import { UnallowedValuesError } from '../../utils/fetch_unallowed_values';
import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { UnallowedValueSearchResult } from '../../types';
import { getInitialCheckStateValue } from './reducer';

const getSpies = () => {
  return {
    checkIndexSpy: jest.spyOn(utilsCheckIndex, 'checkIndex').mockImplementation(jest.fn()),
  };
};

describe('useIndicesCheck', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should return checkIndex and checkState', () => {
    const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

    expect(result.current).toEqual({
      checkIndex: expect.any(Function),
      checkState: expect.any(Object),
    });
  });

  describe('checkIndex', () => {
    it('should call checkIndex with the correct arguments', () => {
      const { checkIndexSpy } = getSpies();

      const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

      const props = {
        abortController: new AbortController(),
        formatBytes: jest.fn(),
        formatNumber: jest.fn(),
        indexName: 'indexName',
        pattern: 'pattern',
        httpFetch: jest.fn(),
      };

      act(() => {
        result.current.checkIndex(props);
      });

      expect(checkIndexSpy).toHaveBeenCalledWith({
        ...props,
        onCheckCompleted: expect.any(Function),
        onLoadMappingsStart: expect.any(Function),
        onLoadMappingsSuccess: expect.any(Function),
        onLoadUnallowedValuesStart: expect.any(Function),
        onLoadUnallowedValuesSuccess: expect.any(Function),
        onStart: expect.any(Function),
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      });
    });
  });

  describe('checkState', () => {
    it('should be empty by default', () => {
      const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

      expect(result.current.checkState).toEqual({});
    });

    describe('when checkIndex completes', () => {
      it('should set correct data', async () => {
        const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

        const httpFetchMock = jest.fn((route) => {
          if (route.startsWith('/internal/ecs_data_quality_dashboard/mappings')) {
            return Promise.resolve(mockMappingsResponse);
          }

          if (route.startsWith('/internal/ecs_data_quality_dashboard/unallowed_field_values')) {
            return Promise.resolve(mockUnallowedValuesResponse);
          }
        });

        act(() => {
          result.current.checkIndex({
            abortController: new AbortController(),
            formatBytes: jest.fn(),
            formatNumber: jest.fn(),
            indexName: 'auditbeat-custom-index-1',
            pattern: 'auditbeat-*',
            httpFetch: httpFetchMock as unknown as HttpHandler,
          });
        });

        await waitFor(() =>
          expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
            ...getInitialCheckStateValue(),
            indexes: expect.any(Object),
            partitionedFieldMetadata: expect.any(Object),
            searchResults: expect.any(Object),
            unallowedValues: expect.any(Object),
            mappingsProperties: expect.any(Object),
            isCheckComplete: true,
          })
        );
      });
    });

    describe('errors', () => {
      describe('when mappings request errors', () => {
        it('should set mappingsError', async () => {
          const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

          const httpFetchMock = jest.fn((route) => {
            if (route.startsWith('/internal/ecs_data_quality_dashboard/mappings')) {
              return Promise.reject(new Error('mappings error'));
            }

            if (route.startsWith('/internal/ecs_data_quality_dashboard/unallowed_field_values')) {
              return Promise.reject(new Error('unallowed values error'));
            }
          });

          act(() =>
            result.current.checkIndex({
              abortController: new AbortController(),
              formatBytes: jest.fn(),
              formatNumber: jest.fn(),
              indexName: 'auditbeat-custom-index-1',
              pattern: 'auditbeat-*',
              httpFetch: httpFetchMock as unknown as HttpHandler,
            })
          );

          await waitFor(() =>
            expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
              ...getInitialCheckStateValue(),
              mappingsError: expect.any(MappingsError),
            })
          );
        });
      });

      describe('when unallowed values request errors', () => {
        it('should set unallowedValuesError', async () => {
          const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

          const httpFetchMock = jest.fn((route) => {
            if (route.startsWith('/internal/ecs_data_quality_dashboard/mappings')) {
              return Promise.resolve(mockMappingsResponse);
            }

            if (route.startsWith('/internal/ecs_data_quality_dashboard/unallowed_field_values')) {
              return Promise.reject(new Error('unallowed values error'));
            }
          });

          act(() =>
            result.current.checkIndex({
              abortController: new AbortController(),
              formatBytes: jest.fn(),
              formatNumber: jest.fn(),
              indexName: 'auditbeat-custom-index-1',
              pattern: 'auditbeat-*',
              httpFetch: httpFetchMock as unknown as HttpHandler,
            })
          );

          await waitFor(() =>
            expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
              ...getInitialCheckStateValue(),
              unallowedValuesError: expect.any(UnallowedValuesError),
            })
          );
        });
      });

      describe('when anything else errors', () => {
        it('should set genericError', () => {
          const { checkIndexSpy } = getSpies();

          checkIndexSpy.mockImplementation(async ({ onError }) => {
            onError?.(new Error('generic error'));
          });

          const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

          act(() =>
            result.current.checkIndex({
              abortController: new AbortController(),
              formatBytes: jest.fn(),
              formatNumber: jest.fn(),
              indexName: 'auditbeat-custom-index-1',
              pattern: 'auditbeat-*',
              httpFetch: jest.fn(),
            })
          );

          expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
            ...getInitialCheckStateValue(),
            genericError: expect.any(Error),
          });
        });
      });
    });

    describe('lifecycle states', () => {
      describe('when check is started', () => {
        it('it should set isChecking to true', async () => {
          const { checkIndexSpy } = getSpies();

          checkIndexSpy.mockImplementation(async ({ onStart }) => {
            onStart?.();
          });

          const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

          act(() =>
            result.current.checkIndex({
              abortController: new AbortController(),
              formatBytes: jest.fn(),
              formatNumber: jest.fn(),
              indexName: 'auditbeat-custom-index-1',
              pattern: 'auditbeat-*',
              httpFetch: jest.fn(),
            })
          );

          await waitFor(() =>
            expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
              ...getInitialCheckStateValue(),
              isChecking: true,
            })
          );
        });
      });

      describe('when mappings are loading', () => {
        it('it should set isLoadingMappings to true', async () => {
          const { checkIndexSpy } = getSpies();

          checkIndexSpy.mockImplementation(async ({ onStart, onLoadMappingsStart }) => {
            onStart?.();
            onLoadMappingsStart?.();
          });

          const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

          act(() =>
            result.current.checkIndex({
              abortController: new AbortController(),
              formatBytes: jest.fn(),
              formatNumber: jest.fn(),
              indexName: 'auditbeat-custom-index-1',
              pattern: 'auditbeat-*',
              httpFetch: jest.fn(),
            })
          );

          await waitFor(() =>
            expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
              ...getInitialCheckStateValue(),
              isChecking: true,
              isLoadingMappings: true,
            })
          );
        });
      });

      describe('when unallowed values are loading', () => {
        it('it should set isLoadingUnallowedValues to true', () => {
          const { checkIndexSpy } = getSpies();

          checkIndexSpy.mockImplementation(async ({ onStart, onLoadUnallowedValuesStart }) => {
            onStart?.();
            onLoadUnallowedValuesStart?.();
          });

          const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

          act(() =>
            result.current.checkIndex({
              abortController: new AbortController(),
              formatBytes: jest.fn(),
              formatNumber: jest.fn(),
              indexName: 'auditbeat-custom-index-1',
              pattern: 'auditbeat-*',
              httpFetch: jest.fn(),
            })
          );

          expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
            ...getInitialCheckStateValue(),
            isChecking: true,
            isLoadingUnallowedValues: true,
          });
        });
      });

      describe('when mappings are loaded', () => {
        it('should set indexes', () => {
          const { checkIndexSpy } = getSpies();

          checkIndexSpy.mockImplementation(async ({ onStart, onLoadMappingsSuccess }) => {
            onStart?.();
            onLoadMappingsSuccess?.(
              mockMappingsResponse as Record<string, IndicesGetMappingIndexMappingRecord>
            );
          });

          const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

          act(() =>
            result.current.checkIndex({
              abortController: new AbortController(),
              formatBytes: jest.fn(),
              formatNumber: jest.fn(),
              indexName: 'auditbeat-custom-index-1',
              pattern: 'auditbeat-*',
              httpFetch: jest.fn(),
            })
          );

          expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
            ...getInitialCheckStateValue(),
            indexes: mockMappingsResponse,
          });
        });
      });

      describe('when unallowed values are loaded', () => {
        it('should set searchResults', () => {
          const { checkIndexSpy } = getSpies();

          checkIndexSpy.mockImplementation(async ({ onStart, onLoadUnallowedValuesSuccess }) => {
            onStart?.();
            onLoadUnallowedValuesSuccess?.(
              mockUnallowedValuesResponse as unknown as UnallowedValueSearchResult[]
            );
          });

          const { result } = renderHook(() => useIndicesCheck({ onCheckCompleted: jest.fn() }));

          act(() =>
            result.current.checkIndex({
              abortController: new AbortController(),
              formatBytes: jest.fn(),
              formatNumber: jest.fn(),
              indexName: 'auditbeat-custom-index-1',
              pattern: 'auditbeat-*',
              httpFetch: jest.fn(),
            })
          );

          expect(result.current.checkState['auditbeat-custom-index-1']).toEqual({
            ...getInitialCheckStateValue(),
            searchResults: mockUnallowedValuesResponse,
          });
        });
      });
    });
  });
});
