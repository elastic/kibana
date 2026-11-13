/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { getEntityInventoryAttributeValues } from '../../mock_inventory_api/get_attribute_values';
import type {
  EntityInventoryAttributeValuesParams,
  EntityInventoryAttributeValuesResponse,
} from '../../inventory_api_types';
import { useAttributeValues } from './use_attribute_values';

jest.mock('../../mock_inventory_api/get_attribute_values');

const mockGetValues = getEntityInventoryAttributeValues as jest.MockedFunction<
  typeof getEntityInventoryAttributeValues
>;

const params: EntityInventoryAttributeValuesParams = {
  attribute: 'os.type',
  types: ['host'],
  filters: {},
  selected: [],
  timeRange: { from: 'now-15m', to: 'now' },
};

const response = (
  values: string[],
  invalidSelections: string[] = []
): EntityInventoryAttributeValuesResponse => ({ values, invalidSelections });

describe('useAttributeValues', () => {
  beforeEach(() => {
    mockGetValues.mockReset();
  });

  it('loads the values', async () => {
    mockGetValues.mockResolvedValue(response(['linux'], ['windows']));

    const { result } = renderHook(() => useAttributeValues(params));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.values).toEqual(['linux']);
    expect(result.current.invalidSelections).toEqual(['windows']);
    expect(result.current.error).toBeUndefined();
  });

  it('loads the values again when the params change', async () => {
    mockGetValues.mockResolvedValue(response(['linux']));
    const { result, rerender } = renderHook((hookParams) => useAttributeValues(hookParams), {
      initialProps: params,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const nextParams = { ...params, filters: { 'cloud.provider': ['aws'] } };
    rerender(nextParams);

    await waitFor(() => expect(mockGetValues).toHaveBeenCalledTimes(2));
    expect(mockGetValues).toHaveBeenLastCalledWith(nextParams);
  });

  it('does not load the values again for equal params', async () => {
    mockGetValues.mockResolvedValue(response(['linux']));
    const { result, rerender } = renderHook((hookParams) => useAttributeValues(hookParams), {
      initialProps: params,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ ...params, filters: {}, types: [...params.types] });

    expect(mockGetValues).toHaveBeenCalledTimes(1);
  });

  it('does not load the values again when only the selection changes', async () => {
    mockGetValues.mockResolvedValue(response(['linux', 'windows']));
    const { result, rerender } = renderHook((hookParams) => useAttributeValues(hookParams), {
      initialProps: params,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ ...params, selected: ['linux'] });

    expect(mockGetValues).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('sends the latest selection when the values are loaded again', async () => {
    mockGetValues.mockResolvedValue(response(['linux', 'windows']));
    const { result, rerender } = renderHook((hookParams) => useAttributeValues(hookParams), {
      initialProps: params,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ ...params, selected: ['linux'] });
    const nextParams = { ...params, selected: ['linux'], filters: { 'cloud.provider': ['aws'] } };
    rerender(nextParams);

    await waitFor(() => expect(mockGetValues).toHaveBeenCalledTimes(2));
    expect(mockGetValues).toHaveBeenLastCalledWith(nextParams);
  });

  it('ignores a response that arrives after the params changed', async () => {
    let resolveFirst: (value: EntityInventoryAttributeValuesResponse) => void = () => {};
    mockGetValues
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(response(['new']));
    const { result, rerender } = renderHook((hookParams) => useAttributeValues(hookParams), {
      initialProps: params,
    });

    rerender({ ...params, filters: { 'cloud.provider': ['aws'] } });
    await waitFor(() => expect(result.current.values).toEqual(['new']));

    await act(async () => resolveFirst(response(['old'])));

    expect(result.current.values).toEqual(['new']);
  });

  it('returns the error when the request fails', async () => {
    mockGetValues.mockRejectedValue(new Error('failed'));

    const { result } = renderHook(() => useAttributeValues(params));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toEqual(new Error('failed'));
    expect(result.current.values).toEqual([]);
  });

  it('clears the error when a new request starts', async () => {
    mockGetValues
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(response(['linux']));
    const { result, rerender } = renderHook((hookParams) => useAttributeValues(hookParams), {
      initialProps: params,
    });
    await waitFor(() => expect(result.current.error).toBeDefined());

    rerender({ ...params, filters: { 'cloud.provider': ['aws'] } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.values).toEqual(['linux']);
  });
});
