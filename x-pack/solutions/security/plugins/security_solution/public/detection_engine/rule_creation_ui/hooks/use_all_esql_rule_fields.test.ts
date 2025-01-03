/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { DataViewFieldBase } from '@kbn/es-query';
import { useQuery } from '@tanstack/react-query';
import { useAllEsqlRuleFields } from './use_all_esql_rule_fields';
import { computeIsESQLQueryAggregating } from '@kbn/securitysolution-utils';

jest.mock('@kbn/securitysolution-utils', () => ({ computeIsESQLQueryAggregating: jest.fn() }));
jest.mock('@tanstack/react-query', () => {
  return {
    useQuery: jest.fn(),
  };
});

const computeIsESQLQueryAggregatingMock = computeIsESQLQueryAggregating as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;
const mockEsqlQuery = 'from auditbeat* metadata _id';
const mockIndexPatternFields: DataViewFieldBase[] = [
  {
    name: 'agent.name',
    type: 'string',
  },
  {
    name: 'agent.type',
    type: 'string',
  },
];
const mockEsqlDatatable = {
  type: 'datatable',
  rows: [],
  columns: [{ id: '_custom_field', name: '_custom_field', meta: { type: 'string' } }],
};

describe('useAllEsqlRuleFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    computeIsESQLQueryAggregatingMock.mockReturnValue(false);
    mockUseQuery.mockImplementation((config) => {
      const data =
        config.queryKey[0] === 'deduplicate_test'
          ? [
              { id: 'agent.name', name: 'agent.name', meta: { type: 'string' } }, // agent.name is already present in mockIndexPatternFields
              { id: '_custom_field_0', name: '_custom_field_0', meta: { type: 'string' } },
            ]
          : mockEsqlDatatable.columns;
      return { data, isLoading: false };
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return loading true when esql fields still loading', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true });

    const { result } = renderHook(() =>
      useAllEsqlRuleFields({
        esqlQuery: mockEsqlQuery,
        indexPatternsFields: mockIndexPatternFields,
      })
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('should return only index pattern fields when ES|QL query is empty', () => {
    const { result } = renderHook(() =>
      useAllEsqlRuleFields({
        esqlQuery: '',
        indexPatternsFields: mockIndexPatternFields,
      })
    );

    expect(result.current.fields).toEqual(mockIndexPatternFields);
  });

  it('should return only index pattern fields when ES|QL query is undefined', () => {
    const { result } = renderHook(() =>
      useAllEsqlRuleFields({
        esqlQuery: undefined,
        indexPatternsFields: mockIndexPatternFields,
      })
    );

    expect(result.current.fields).toEqual(mockIndexPatternFields);
  });

  it('should return index pattern fields concatenated with ES|QL fields when ES|QL query is non-aggregating', () => {
    computeIsESQLQueryAggregatingMock.mockReturnValue(false);

    const { result } = renderHook(() =>
      useAllEsqlRuleFields({
        esqlQuery: mockEsqlQuery,
        indexPatternsFields: mockIndexPatternFields,
      })
    );
    act(() => jest.advanceTimersByTime(400));

    expect(result.current.fields).toEqual([
      {
        name: '_custom_field',
        type: 'string',
      },
      ...mockIndexPatternFields,
    ]);
  });

  it('should return only ES|QL fields when ES|QL query is aggregating', () => {
    computeIsESQLQueryAggregatingMock.mockReturnValue(true);

    const { result } = renderHook(() =>
      useAllEsqlRuleFields({
        esqlQuery: mockEsqlQuery,
        indexPatternsFields: mockIndexPatternFields,
      })
    );
    act(() => jest.advanceTimersByTime(400));

    expect(result.current.fields).toEqual([
      {
        name: '_custom_field',
        type: 'string',
      },
    ]);
  });

  it('should deduplicate index pattern fields and ES|QL fields when fields have same name', () => {
    computeIsESQLQueryAggregatingMock.mockReturnValue(false);

    const { result } = renderHook(() =>
      useAllEsqlRuleFields({
        esqlQuery: 'deduplicate_test',
        indexPatternsFields: mockIndexPatternFields,
      })
    );
    act(() => jest.advanceTimersByTime(400));

    expect(result.current.fields).toEqual([
      {
        name: 'agent.name',
        type: 'string',
      },
      {
        name: '_custom_field_0',
        type: 'string',
      },
      {
        name: 'agent.type',
        type: 'string',
      },
    ]);
  });
});
