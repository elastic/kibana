/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, waitFor } from '@testing-library/react';
import type { UseTopAssetsOptions } from './types';
import { useFetchChartData } from './use_fetch_chart_data';
import { ASSET_FIELDS } from '../../constants';
import { useKibana } from '../../../common/lib/kibana';
import { of, throwError } from 'rxjs';
import { showErrorToast } from '@kbn/cloud-security-posture';
import { createTestProviderWrapper } from '../../test/test_provider';
import { useDataViewContext } from '../data_view_context';

jest.mock('../../../common/lib/kibana');
jest.mock('../data_view_context');
jest.mock('@kbn/cloud-security-posture', () => ({
  showErrorToast: jest.fn(),
}));

const mockSearch = jest.fn();

const renderHookWithWrapper = (options: UseTopAssetsOptions) =>
  renderHook(() => useFetchChartData(options), {
    wrapper: createTestProviderWrapper(),
  });

const getMockKibanaServices = () => ({
  data: {
    search: {
      search: mockSearch,
    },
  },
  notifications: {
    toasts: { addError: jest.fn() },
  },
});

describe('useFetchChartData', () => {
  const defaultOptions = {
    query: {
      bool: {
        must: [],
        must_not: [],
        filter: [],
        should: [],
      },
    },
    sort: [['some.field', 'desc']],
    enabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: getMockKibanaServices(),
    });
    (useDataViewContext as jest.Mock).mockReturnValue({
      dataView: {
        getIndexPattern: () => 'assets-test-*',
      },
    });
  });

  it('should return transformed aggregation data', async () => {
    const mockResponse = {
      rawResponse: {
        aggregations: {
          entityType: {
            buckets: [
              {
                key: 'aws',
                doc_count: 100,
                entityId: { value: 100 },
                entitySubType: {
                  buckets: [
                    {
                      key: 'ec2',
                      doc_count: 50,
                      entityId: { value: 50 },
                    },
                  ],
                  sum_other_doc_count: 5,
                },
              },
            ],
          },
        },
      },
    };

    mockSearch.mockReturnValue(of(mockResponse));

    const { result } = renderHookWithWrapper({ ...defaultOptions });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Debug
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeDefined();
    expect(result.current.data).toEqual([
      {
        [ASSET_FIELDS.ENTITY_TYPE]: 'aws',
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'ec2',
        count: 50,
      },
      {
        [ASSET_FIELDS.ENTITY_TYPE]: 'aws',
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'aws - Other',
        count: 5,
      },
    ]);
  });

  it('should not run query if enabled is false', async () => {
    const { result } = renderHookWithWrapper({ ...defaultOptions, enabled: false });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('should throw if aggregations are missing', async () => {
    // suppress expected console error messages
    jest.spyOn(console, 'error').mockReturnValue();

    mockSearch.mockReturnValue(
      of({
        rawResponse: {},
      })
    );

    const { result } = renderHookWithWrapper({ ...defaultOptions });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('expected aggregations to be defined');
  });

  it('should show error toast on failure', async () => {
    const mockError = new Error('Something went wrong');
    mockSearch.mockReturnValue(throwError(() => mockError));

    const { result } = renderHookWithWrapper({ ...defaultOptions });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(showErrorToast).toHaveBeenCalled();
  });
});
