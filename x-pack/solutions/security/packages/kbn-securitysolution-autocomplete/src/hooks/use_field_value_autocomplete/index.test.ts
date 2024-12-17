/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, renderHook } from '@testing-library/react';
import { ListOperatorTypeEnum as OperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { UseFieldValueAutocompleteReturn, useFieldValueAutocomplete } from '.';
import { getField } from '../../fields/index.mock';
import { autocompleteStartMock } from '../../autocomplete/index.mock';
import { DataViewFieldBase } from '@kbn/es-query';

// Copied from "src/plugins/data/common/index_patterns/index_pattern.stub.ts"
// TODO: Remove this in favor of the above if/when it is ported, https://github.com/elastic/kibana/issues/100715
export const stubIndexPatternWithFields = {
  id: '1234',
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
};

describe('use_field_value_autocomplete', () => {
  const onErrorMock = jest.fn();
  const getValueSuggestionsMock = jest.fn().mockResolvedValue(['value 1', 'value 2']);

  afterEach(() => {
    onErrorMock.mockClear();
    getValueSuggestionsMock.mockClear();
  });

  test('initializes hook', async () => {
    const { result } = renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        },
        fieldValue: '',
        indexPattern: undefined,
        operatorType: OperatorTypeEnum.MATCH,
        query: '',
        selectedField: undefined,
      })
    );
    await waitFor(() => expect(result.current).toEqual([false, true, [], result.current[3]]));
  });

  test('does not call autocomplete service if "operatorType" is "exists"', async () => {
    const { result } = renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        },
        fieldValue: '',
        indexPattern: stubIndexPatternWithFields,
        operatorType: OperatorTypeEnum.EXISTS,
        query: '',
        selectedField: getField('machine.os'),
      })
    );

    await waitFor(() => {
      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(result.current).toEqual(expectedResult);
      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
    });
  });

  test('does not call autocomplete service if "selectedField" is undefined', async () => {
    const { result } = renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        },
        fieldValue: '',
        indexPattern: stubIndexPatternWithFields,
        operatorType: OperatorTypeEnum.EXISTS,
        query: '',
        selectedField: undefined,
      })
    );

    await waitFor(() => {
      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(result.current).toEqual(expectedResult);
      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
    });
  });

  test('does not call autocomplete service if "indexPattern" is undefined', async () => {
    const { result } = renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        },
        fieldValue: '',
        indexPattern: undefined,
        operatorType: OperatorTypeEnum.EXISTS,
        query: '',
        selectedField: getField('machine.os'),
      })
    );

    await waitFor(() => {
      const expectedResult: UseFieldValueAutocompleteReturn = [false, true, [], result.current[3]];

      expect(result.current).toEqual(expectedResult);
      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
    });
  });

  test('it uses full path name for nested fields to fetch suggestions', async () => {
    const suggestionsMock = jest.fn().mockResolvedValue([]);

    const selectedField: DataViewFieldBase | undefined = getField('nestedField.child');
    if (selectedField == null) {
      throw new TypeError('selectedField for this test should always be defined');
    }

    const { signal } = new AbortController();
    renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: suggestionsMock,
        },
        fieldValue: '',
        indexPattern: stubIndexPatternWithFields,
        operatorType: OperatorTypeEnum.MATCH,
        query: '',
        selectedField: { ...selectedField, name: 'child' },
      })
    );

    await waitFor(() =>
      expect(suggestionsMock).toHaveBeenCalledWith({
        field: { ...getField('nestedField.child'), name: 'nestedField.child' },
        indexPattern: {
          fields: [
            {
              aggregatable: true,
              esTypes: ['integer'],
              filterable: true,
              name: 'response',
              searchable: true,
              type: 'number',
            },
          ],
          id: '1234',
          title: 'logstash-*',
        },
        query: '',
        signal,
        useTimeRange: false,
      })
    );
  });

  test('returns "isSuggestingValues" of false if field type is boolean', async () => {
    const { result } = renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        },
        fieldValue: '',
        indexPattern: stubIndexPatternWithFields,
        operatorType: OperatorTypeEnum.MATCH,
        query: '',
        selectedField: getField('ssl'),
      })
    );

    await waitFor(() => {
      const expectedResult: UseFieldValueAutocompleteReturn = [false, false, [], result.current[3]];

      expect(result.current).toEqual(expectedResult);
      expect(getValueSuggestionsMock).not.toHaveBeenCalled();
    });
  });

  test('returns "isSuggestingValues" of false to note that autocomplete service is not in use if no autocomplete suggestions available', async () => {
    const suggestionsMock = jest.fn().mockResolvedValue([]);

    const { result } = renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: suggestionsMock,
        },
        fieldValue: '',
        indexPattern: stubIndexPatternWithFields,
        operatorType: OperatorTypeEnum.MATCH,
        query: '',
        selectedField: getField('bytes'),
      })
    );

    await waitFor(() => {
      const expectedResult: UseFieldValueAutocompleteReturn = [false, false, [], result.current[3]];

      expect(suggestionsMock).toHaveBeenCalled();
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns suggestions', async () => {
    const { signal } = new AbortController();
    const { result } = renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        },
        fieldValue: '',
        indexPattern: stubIndexPatternWithFields,
        operatorType: OperatorTypeEnum.MATCH,
        query: '',
        selectedField: getField('@tags'),
      })
    );

    await waitFor(() => {
      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        true,
        ['value 1', 'value 2'],
        result.current[3],
      ];

      expect(getValueSuggestionsMock).toHaveBeenCalledWith({
        field: getField('@tags'),
        indexPattern: stubIndexPatternWithFields,
        query: '',
        signal,
        useTimeRange: false,
      });
      expect(result.current).toEqual(expectedResult);
    });
  });

  test('returns new suggestions on subsequent calls', async () => {
    const { result } = renderHook(() =>
      useFieldValueAutocomplete({
        autocompleteService: {
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        },
        fieldValue: '',
        indexPattern: stubIndexPatternWithFields,
        operatorType: OperatorTypeEnum.MATCH,
        query: '',
        selectedField: getField('@tags'),
      })
    );

    await waitFor(() => expect(result.current[3]).not.toBeNull());

    // Added check for typescripts sake, if null,
    // would not reach below logic as test would stop above
    if (result.current[3] != null) {
      result.current[3]({
        fieldSelected: getField('@tags'),
        patterns: stubIndexPatternWithFields,
        searchQuery: '',
        value: 'hello',
      });
    }

    await waitFor(() => {
      const expectedResult: UseFieldValueAutocompleteReturn = [
        false,
        true,
        ['value 1', 'value 2'],
        result.current[3],
      ];

      expect(getValueSuggestionsMock).toHaveBeenCalledTimes(2);
      expect(result.current).toEqual(expectedResult);
    });
  });
});
