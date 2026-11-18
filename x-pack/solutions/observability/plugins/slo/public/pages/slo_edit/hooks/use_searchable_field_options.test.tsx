/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { useSearchableFieldOptions } from './use_searchable_field_options';

const toFields = (names: string[]): FieldSpec[] =>
  names.map((name) => ({ name, type: 'string', searchable: true, aggregatable: true }));

const toOptions = (names: string[]) => names.map((name) => ({ label: name, value: name }));

describe('useSearchableFieldOptions', () => {
  it('returns every field as a sorted option', () => {
    const { result } = renderHook(() =>
      useSearchableFieldOptions(toFields(['service.name', 'host.name']))
    );

    expect(result.current.options).toEqual(toOptions(['host.name', 'service.name']));
  });

  it('filters the options with the search value and restores them once cleared', () => {
    const { result } = renderHook(() =>
      useSearchableFieldOptions(toFields(['service.name', 'host.name', 'host.ip']))
    );

    act(() => result.current.onSearchChange('host'));
    expect(result.current.options).toEqual(toOptions(['host.ip', 'host.name']));

    act(() => result.current.onSearchChange(''));
    expect(result.current.options).toEqual(toOptions(['host.ip', 'host.name', 'service.name']));
  });

  it('applies the active search value to updated fields', () => {
    const { result, rerender } = renderHook(({ fields }) => useSearchableFieldOptions(fields), {
      initialProps: { fields: toFields(['host.name']) },
    });

    act(() => result.current.onSearchChange('host'));
    rerender({ fields: toFields(['host.ip', 'service.name']) });

    expect(result.current.options).toEqual(toOptions(['host.ip']));
  });
});
