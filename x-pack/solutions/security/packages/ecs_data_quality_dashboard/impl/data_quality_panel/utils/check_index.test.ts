/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkIndex, EMPTY_PARTITIONED_FIELD_METADATA } from './check_index';
import { mockMappingsResponse } from '../mock/mappings_response/mock_mappings_response';
import { mockUnallowedValuesResponse } from '../mock/unallowed_values/mock_unallowed_values';
import { UnallowedValueRequestItem, UnallowedValueSearchResult } from '../types';
import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { getUnallowedValues } from './fetch_unallowed_values';
import { getUnallowedValueRequestItems } from './get_unallowed_value_request_items';
import { EcsFlatTyped, EMPTY_STAT } from '../constants';
import { getMappingsProperties, getSortedPartitionedFieldMetadata } from './metadata';

let mockFetchMappings = jest.fn(
  (_: { abortController: AbortController; patternOrIndexName: string }) =>
    Promise.resolve(mockMappingsResponse)
);

jest.mock('./fetch_mappings', () => {
  const original = jest.requireActual('./fetch_mappings');
  return {
    ...original,
    fetchMappings: ({
      abortController,
      patternOrIndexName,
    }: {
      abortController: AbortController;
      patternOrIndexName: string;
    }) =>
      mockFetchMappings({
        abortController,
        patternOrIndexName,
      }),
  };
});

const mockFetchUnallowedValues = jest.fn(
  (_: {
    abortController: AbortController;
    indexName: string;
    requestItems: UnallowedValueRequestItem[];
  }) => Promise.resolve(mockUnallowedValuesResponse)
);

jest.mock('./fetch_unallowed_values', () => {
  const original = jest.requireActual('./fetch_unallowed_values');

  return {
    ...original,
    fetchUnallowedValues: ({
      abortController,
      indexName,
      requestItems,
    }: {
      abortController: AbortController;
      indexName: string;
      requestItems: UnallowedValueRequestItem[];
    }) =>
      mockFetchUnallowedValues({
        abortController,
        indexName,
        requestItems,
      }),
  };
});

describe('checkIndex', () => {
  const defaultBytesFormat = '0,0.[0]b';
  const formatBytes = (value: number | undefined) =>
    value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

  const defaultNumberFormat = '0,0.[000]';
  const formatNumber = (value: number | undefined) =>
    value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

  const indexName = 'auditbeat-custom-index-1';
  const pattern = 'auditbeat-*';
  const httpFetch = jest.fn();

  describe('when `checkIndex` successfully completes the check', () => {
    const onCheckCompleted = jest.fn();

    beforeEach(async () => {
      jest.clearAllMocks();

      await checkIndex({
        abortController: new AbortController(),
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
      });
    });

    test('it invokes onCheckCompleted with a null `error`', () => {
      expect(onCheckCompleted.mock.calls[0][0].error).toBeNull();
    });

    test('it invokes onCheckCompleted with the expected `indexName`', () => {
      expect(onCheckCompleted.mock.calls[0][0].indexName).toEqual(indexName);
    });

    test('it invokes onCheckCompleted with the non-default `partitionedFieldMetadata`', () => {
      expect(onCheckCompleted.mock.calls[0][0].partitionedFieldMetadata).not.toEqual(
        EMPTY_PARTITIONED_FIELD_METADATA
      );
    });

    test('it invokes onCheckCompleted with the expected`pattern`', () => {
      expect(onCheckCompleted.mock.calls[0][0].pattern).toEqual(pattern);
    });
  });

  describe('lifecycle hooks', () => {
    const orderOfCalls: string[] = [];
    const onStart = jest.fn(() => orderOfCalls.push('onStart'));
    const onSuccess = jest.fn(() => orderOfCalls.push('onSuccess'));
    const onError = jest.fn(() => orderOfCalls.push('onError'));
    const onLoadMappingsStart = jest.fn(() => orderOfCalls.push('onLoadMappingsStart'));
    const onLoadMappingsSuccess = jest.fn(() => orderOfCalls.push('onLoadMappingsSuccess'));
    const onLoadUnallowedValuesStart = jest.fn(() =>
      orderOfCalls.push('onLoadUnallowedValuesStart')
    );
    const onLoadUnallowedValuesSuccess = jest.fn(() =>
      orderOfCalls.push('onLoadUnallowedValuesSuccess')
    );

    beforeEach(async () => {
      orderOfCalls.length = 0;
      jest.clearAllMocks();

      await checkIndex({
        abortController: new AbortController(),
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted: jest.fn(),
        pattern,
        onError,
        onLoadMappingsStart,
        onLoadMappingsSuccess,
        onLoadUnallowedValuesStart,
        onLoadUnallowedValuesSuccess,
        onStart,
        onSuccess,
      });
    });

    test('it invokes `onStart`', () => {
      expect(onStart).toBeCalled();
    });

    test('it invokes `onLoadMappingsStart`', () => {
      expect(onLoadMappingsStart).toBeCalled();
    });

    test('it invokes `onLoadMappingsSuccess` with mappings response', () => {
      expect(onLoadMappingsSuccess).toBeCalledWith(mockMappingsResponse);
    });

    test('it invokes `onLoadUnallowedValuesStart`', () => {
      expect(onLoadUnallowedValuesStart).toBeCalled();
    });

    test('it invokes `onLoadUnallowedValuesSuccess` with unallowed value search results', () => {
      expect(onLoadUnallowedValuesSuccess).toBeCalledWith(mockUnallowedValuesResponse);
    });

    test('it invokes `onSuccess` with the expected arguments', () => {
      const mappingsProperties = getMappingsProperties({
        indexName,
        indexes: mockMappingsResponse as Record<string, IndicesGetMappingIndexMappingRecord>,
      });
      const unallowedValues = getUnallowedValues({
        requestItems: getUnallowedValueRequestItems({
          ecsMetadata: EcsFlatTyped,
          indexName,
        }),
        searchResults: mockUnallowedValuesResponse as unknown as UnallowedValueSearchResult[],
      });
      const partitionedFieldMetadata = getSortedPartitionedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        loadingMappings: false,
        mappingsProperties,
        unallowedValues,
      });
      expect(onSuccess).toBeCalledWith({
        partitionedFieldMetadata,
        mappingsProperties,
        unallowedValues,
      });
    });

    test('it does NOT invoke `onError`', () => {
      expect(onError).not.toBeCalled();
    });

    test('it invokes the lifecycle hooks in the expected order', () => {
      expect(orderOfCalls).toEqual([
        'onStart',
        'onLoadMappingsStart',
        'onLoadMappingsSuccess',
        'onLoadUnallowedValuesStart',
        'onLoadUnallowedValuesSuccess',
        'onSuccess',
      ]);
    });

    describe('when load mappings error occurs', () => {
      const error = 'simulated fetch mappings error';
      const onCheckCompleted = jest.fn();

      beforeEach(async () => {
        orderOfCalls.length = 0;
        jest.clearAllMocks();

        mockFetchMappings.mockRejectedValueOnce(new Error(error));

        await checkIndex({
          abortController: new AbortController(),
          batchId: 'batch-id',
          checkAllStartTime: Date.now(),
          formatBytes,
          formatNumber,
          httpFetch,
          indexName,
          isLastCheck: false,
          onCheckCompleted,
          pattern,
          onError,
          onLoadMappingsStart,
          onLoadMappingsSuccess,
          onLoadUnallowedValuesStart,
          onLoadUnallowedValuesSuccess,
          onStart,
          onSuccess,
        });
      });

      test('it invokes `onError` with mappings error', () => {
        expect(onError).toBeCalledWith(new Error(error));
      });

      test('it does NOT invoke `onSuccess`', () => {
        expect(onSuccess).not.toBeCalled();
      });

      test('it invokes the lifecycle hooks in the expected order', () => {
        expect(orderOfCalls).toEqual(['onStart', 'onLoadMappingsStart', 'onError']);
      });
    });

    describe('when load unallowed values error occurs', () => {
      const error = 'simulated fetch unallowed values error';
      const onCheckCompleted = jest.fn();

      beforeEach(async () => {
        orderOfCalls.length = 0;
        jest.clearAllMocks();

        mockFetchUnallowedValues.mockRejectedValueOnce(new Error(error));

        await checkIndex({
          abortController: new AbortController(),
          batchId: 'batch-id',
          checkAllStartTime: Date.now(),
          formatBytes,
          formatNumber,
          httpFetch,
          indexName,
          isLastCheck: false,
          onCheckCompleted,
          pattern,
          onError,
          onLoadMappingsStart,
          onLoadMappingsSuccess,
          onLoadUnallowedValuesStart,
          onLoadUnallowedValuesSuccess,
          onStart,
          onSuccess,
        });
      });

      test('it invokes `onError` with unallowed values error', () => {
        expect(onError).toBeCalledWith(new Error(error));
      });

      test('it does NOT invoke `onSuccess`', () => {
        expect(onSuccess).not.toBeCalled();
      });

      test('it invokes the lifecycle hooks in the expected order', () => {
        expect(orderOfCalls).toEqual([
          'onStart',
          'onLoadMappingsStart',
          'onLoadMappingsSuccess',
          'onLoadUnallowedValuesStart',
          'onError',
        ]);
      });
    });
  });

  describe('happy path, when the signal is aborted', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('it does NOT invoke onCheckCompleted', async () => {
      const onCheckCompleted = jest.fn();

      const abortController = new AbortController();
      abortController.abort();

      await checkIndex({
        abortController,
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
      });

      expect(onCheckCompleted).not.toBeCalled();
    });
  });

  describe('when an error occurs', () => {
    const onCheckCompleted = jest.fn();
    const error = 'simulated fetch mappings error';

    beforeEach(async () => {
      jest.clearAllMocks();

      mockFetchMappings = jest.fn(
        (_: { abortController: AbortController; patternOrIndexName: string }) =>
          Promise.reject(new Error(error))
      );

      await checkIndex({
        abortController: new AbortController(),
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
      });
    });

    test('it invokes onCheckCompleted with the expected `error`', () => {
      expect(onCheckCompleted.mock.calls[0][0].error).toEqual(error);
    });

    test('it invokes onCheckCompleted with the expected `indexName`', () => {
      expect(onCheckCompleted.mock.calls[0][0].indexName).toEqual(indexName);
    });

    test('it invokes onCheckCompleted with null `partitionedFieldMetadata`', () => {
      expect(onCheckCompleted.mock.calls[0][0].partitionedFieldMetadata).toBeNull();
    });

    test('it invokes onCheckCompleted with the expected `pattern`', () => {
      expect(onCheckCompleted.mock.calls[0][0].pattern).toEqual(pattern);
    });
  });

  describe('when an error occurs, but the error does not have a toString', () => {
    const onCheckCompleted = jest.fn();

    beforeEach(async () => {
      jest.clearAllMocks();

      mockFetchMappings = jest.fn(
        (_: { abortController: AbortController; patternOrIndexName: string }) =>
          // eslint-disable-next-line prefer-promise-reject-errors
          Promise.reject(undefined)
      );

      await checkIndex({
        abortController: new AbortController(),
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
      });
    });

    test('it invokes onCheckCompleted with the fallback `error`', () => {
      expect(onCheckCompleted.mock.calls[0][0].error).toEqual(
        `An error occurred checking index ${indexName}`
      );
    });

    test('it invokes onCheckCompleted with the expected `indexName`', () => {
      expect(onCheckCompleted.mock.calls[0][0].indexName).toEqual(indexName);
    });

    test('it invokes onCheckCompleted with null `partitionedFieldMetadata`', () => {
      expect(onCheckCompleted.mock.calls[0][0].partitionedFieldMetadata).toBeNull();
    });

    test('it invokes onCheckCompleted with the expected `pattern`', () => {
      expect(onCheckCompleted.mock.calls[0][0].pattern).toEqual(pattern);
    });
  });

  describe('when an error occurs, and the signal is aborted', () => {
    const onCheckCompleted = jest.fn();
    const abortController = new AbortController();
    abortController.abort();

    const error = 'simulated fetch mappings error';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('it does NOT invoke onCheckCompleted', async () => {
      mockFetchMappings = jest.fn(
        (_: { abortController: AbortController; patternOrIndexName: string }) =>
          Promise.reject(new Error(error))
      );

      await checkIndex({
        abortController,
        batchId: 'batch-id',
        checkAllStartTime: Date.now(),
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        isLastCheck: false,
        onCheckCompleted,
        pattern,
      });

      expect(onCheckCompleted).not.toBeCalled();
    });
  });
});
