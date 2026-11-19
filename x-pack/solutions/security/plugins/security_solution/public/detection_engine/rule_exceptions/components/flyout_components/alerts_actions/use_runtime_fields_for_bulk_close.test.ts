/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

import { useRuntimeFieldsForBulkClose } from './use_runtime_fields_for_bulk_close';

const sourceIndexPatternFor = (
  fields: Array<Partial<DataViewFieldBase> & { name: string }>
): DataViewBase =>
  ({
    title: 'rule-source',
    fields: fields.map((f) => ({ type: 'string', ...f })) as DataViewFieldBase[],
  } as DataViewBase);

// Field is not on the stub alerts index, so treated as non-ECS.
const runtimeFieldExceptionItems = [
  {
    ...getExceptionListItemSchemaMock(),
    entries: [{ field: 'source.ip_ecs', operator: 'included', type: 'match' }] as EntriesArray,
  },
];

const defaultArgs = {
  exceptionListItems: runtimeFieldExceptionItems,
  shouldBulkCloseAlert: true,
  sourceIndexPatterns: sourceIndexPatternFor([{ name: 'source.ip_ecs', esTypes: ['ip'] }]),
  isSourceIndexPatternsLoading: false,
  alertsIndexPatterns: stubIndexPattern,
  areAlertsIndexPatternsReady: true,
};

describe('useRuntimeFieldsForBulkClose', () => {
  it('resolves the type of a non-ECS field present on the source data view', () => {
    const { result } = renderHook(() => useRuntimeFieldsForBulkClose(defaultArgs));

    expect(result.current).toEqual({
      runtimeFields: { 'source.ip_ecs': 'ip' },
      hasUntypedFields: false,
      isResolving: false,
    });
  });

  it('falls back to keyword + hasUntypedFields=true when the field is missing from the source data view', () => {
    const { result } = renderHook(() =>
      useRuntimeFieldsForBulkClose({
        ...defaultArgs,
        // Source data view doesn't contain the field — rule-drift scenario.
        sourceIndexPatterns: sourceIndexPatternFor([]),
      })
    );

    expect(result.current).toEqual({
      runtimeFields: { 'source.ip_ecs': 'keyword' },
      hasUntypedFields: true,
      isResolving: false,
    });
  });

  it('skips fields already present on the alerts index', () => {
    // `stubIndexPattern` contains `machine.os.raw`, so no synthesis needed.
    const { result } = renderHook(() =>
      useRuntimeFieldsForBulkClose({
        ...defaultArgs,
        exceptionListItems: [
          {
            ...getExceptionListItemSchemaMock(),
            entries: [
              { field: 'machine.os.raw', operator: 'included', type: 'match', value: 'linux' },
            ] as EntriesArray,
          },
        ],
      })
    );

    expect(result.current).toEqual({
      runtimeFields: {},
      hasUntypedFields: false,
      isResolving: false,
    });
  });

  it('stays idle (empty map, not resolving) when bulk close is unchecked', () => {
    const { result } = renderHook(() =>
      useRuntimeFieldsForBulkClose({ ...defaultArgs, shouldBulkCloseAlert: false })
    );

    expect(result.current).toEqual({
      runtimeFields: {},
      hasUntypedFields: false,
      isResolving: false,
    });
  });

  it('stays idle when sourceIndexPatterns is not provided', () => {
    // Endpoint exceptions and other rule-less callers go through this path.
    const { result } = renderHook(() =>
      useRuntimeFieldsForBulkClose({ ...defaultArgs, sourceIndexPatterns: undefined })
    );

    expect(result.current).toEqual({
      runtimeFields: {},
      hasUntypedFields: false,
      isResolving: false,
    });
  });

  it('reports isResolving while the alerts-index patterns are not ready', () => {
    const { result } = renderHook(() =>
      useRuntimeFieldsForBulkClose({ ...defaultArgs, areAlertsIndexPatternsReady: false })
    );

    expect(result.current).toEqual({
      runtimeFields: {},
      hasUntypedFields: false,
      isResolving: true,
    });
  });

  it('reports isResolving while the source-index patterns are loading', () => {
    const { result } = renderHook(() =>
      useRuntimeFieldsForBulkClose({ ...defaultArgs, isSourceIndexPatternsLoading: true })
    );

    expect(result.current).toEqual({
      runtimeFields: {},
      hasUntypedFields: false,
      isResolving: true,
    });
  });
});
