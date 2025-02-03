/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useDataViewFallback } from './use_data_view_fallback';
import { useCreateAdhocDataView } from './use_create_adhoc_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';

jest.mock('./use_create_adhoc_data_view');

const mockDataView = {
  id: 'mock',
  getIndexPattern: () => 'pattern1,pattern2',
} as unknown as DataView;

describe('useDataViewFallback', () => {
  let onResolveErrorManually: VoidFunction;
  let onApplyFallbackDataView: VoidFunction;

  beforeEach(() => {
    onResolveErrorManually = jest.fn();
    onApplyFallbackDataView = jest.fn();
    jest.mocked(useCreateAdhocDataView).mockReturnValue({
      createAdhocDataView: jest.fn(async (): Promise<DataView | null> => mockDataView),
    });
  });

  it('should not create an adhoc data view when `enableFallback` is false', async () => {
    renderHook(() =>
      useDataViewFallback({
        onResolveErrorManually,
        missingPatterns: ['pattern1'],
        enableFallback: false,
        onApplyFallbackDataView,
      })
    );

    expect(useCreateAdhocDataView(() => {}).createAdhocDataView).not.toHaveBeenCalled();
  });

  it('should create adhoc data views when `enableFallback` and `missingPatterns` are provided', async () => {
    renderHook(() =>
      useDataViewFallback({
        onResolveErrorManually,
        missingPatterns: ['pattern1'],
        enableFallback: true,
        onApplyFallbackDataView,
      })
    );

    expect(useCreateAdhocDataView(() => {}).createAdhocDataView).toHaveBeenCalledWith(['pattern1']);
  });

  it('should apply fallback data view once when a data view is successfully created', async () => {
    const result = renderHook(() =>
      useDataViewFallback({
        onResolveErrorManually,
        missingPatterns: ['pattern1'],
        enableFallback: true,
        onApplyFallbackDataView,
      })
    );

    // NOTE: test if  multiple renders with the same props result with a single dataview selection call
    await act(async () => result.rerender());
    await act(async () => result.rerender());
    await act(async () => result.rerender());

    expect(onApplyFallbackDataView).toHaveBeenCalledWith('mock', ['pattern1', 'pattern2'], false);
    expect(onApplyFallbackDataView).toHaveBeenCalledTimes(1);
  });
});
