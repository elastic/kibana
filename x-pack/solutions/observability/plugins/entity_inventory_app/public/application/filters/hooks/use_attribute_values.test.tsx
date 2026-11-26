/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { AttributeValuesResponse } from '@kbn/entity-inventory-plugin/common';
import { createFixtureEntityInventoryApiClient } from '../../../__fixtures__/inventory_client';
import { createAppServicesMock } from '../../../mocks';
import type { EntityInventoryAttributeValuesParams } from '../../../inventory_api_types';
import { useAttributeValues } from './use_attribute_values';

const mockGetFilterValues = jest.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <KibanaContextProvider
    services={createAppServicesMock({
      inventoryApi: {
        ...createFixtureEntityInventoryApiClient(),
        getFilterValues: mockGetFilterValues,
      },
    })}
  >
    {children}
  </KibanaContextProvider>
);

const params: EntityInventoryAttributeValuesParams = {
  attribute: 'os.type',
  types: ['host'],
  filters: {},
  selected: [],
  timeRange: { from: 'now-15m', to: 'now' },
};

const response = (values: string[], invalidSelections: string[] = []): AttributeValuesResponse => ({
  values,
  invalidSelections,
  truncated: false,
  errors: [],
});

const render = (initialProps: EntityInventoryAttributeValuesParams = params) =>
  renderHook((hookParams) => useAttributeValues(hookParams), { initialProps, wrapper });

const lastBody = () => mockGetFilterValues.mock.calls[mockGetFilterValues.mock.calls.length - 1][0];

describe('useAttributeValues', () => {
  beforeEach(() => {
    mockGetFilterValues.mockReset();
  });

  it('loads the values', async () => {
    mockGetFilterValues.mockResolvedValue(response(['linux'], ['windows']));

    const { result } = render();

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.values).toEqual(['linux']);
    expect(result.current.invalidSelections).toEqual(['windows']);
    expect(result.current.error).toBeUndefined();
  });

  it('sends the params with the time range resolved to absolute bounds', async () => {
    mockGetFilterValues.mockResolvedValue(response(['linux']));

    const { result } = render({ ...params, selected: ['linux'], filters: { a: ['b'] } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const body = lastBody();
    expect(body).toEqual({
      attribute: 'os.type',
      types: ['host'],
      filters: { a: ['b'] },
      selected: ['linux'],
      from: expect.any(String),
      to: expect.any(String),
    });
    expect(Date.parse(body.to) - Date.parse(body.from)).toBe(15 * 60 * 1000);
  });

  it('loads the values again when the params change', async () => {
    mockGetFilterValues.mockResolvedValue(response(['linux']));
    const { result, rerender } = render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ ...params, filters: { 'cloud.provider': ['aws'] } });

    await waitFor(() => expect(mockGetFilterValues).toHaveBeenCalledTimes(2));
    expect(lastBody().filters).toEqual({ 'cloud.provider': ['aws'] });
  });

  it('does not load the values again for equal params', async () => {
    mockGetFilterValues.mockResolvedValue(response(['linux']));
    const { result, rerender } = render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ ...params, filters: {}, types: [...params.types] });

    expect(mockGetFilterValues).toHaveBeenCalledTimes(1);
  });

  it('does not load the values again when only the selection changes', async () => {
    mockGetFilterValues.mockResolvedValue(response(['linux', 'windows']));
    const { result, rerender } = render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ ...params, selected: ['linux'] });

    expect(mockGetFilterValues).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('sends the latest selection when the values are loaded again', async () => {
    mockGetFilterValues.mockResolvedValue(response(['linux', 'windows']));
    const { result, rerender } = render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ ...params, selected: ['linux'] });
    rerender({ ...params, selected: ['linux'], filters: { 'cloud.provider': ['aws'] } });

    await waitFor(() => expect(mockGetFilterValues).toHaveBeenCalledTimes(2));
    expect(lastBody().selected).toEqual(['linux']);
  });

  it('aborts the previous request when the params change', async () => {
    mockGetFilterValues.mockResolvedValue(response(['linux']));
    const { result, rerender } = render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const [, { signal }] = mockGetFilterValues.mock.calls[0];

    rerender({ ...params, filters: { 'cloud.provider': ['aws'] } });

    expect(signal.aborted).toBe(true);
  });

  it('ignores a response that arrives after the params changed', async () => {
    let resolveFirst: (value: AttributeValuesResponse) => void = () => {};
    mockGetFilterValues
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(response(['new']));
    const { result, rerender } = render();

    rerender({ ...params, filters: { 'cloud.provider': ['aws'] } });
    await waitFor(() => expect(result.current.values).toEqual(['new']));

    await act(async () => resolveFirst(response(['old'])));

    expect(result.current.values).toEqual(['new']);
  });

  it('returns the error when the request fails', async () => {
    mockGetFilterValues.mockRejectedValue(new Error('failed'));

    const { result } = render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toEqual(new Error('failed'));
    expect(result.current.values).toEqual([]);
  });

  it('returns an error without a request when the time range is invalid', async () => {
    const { result } = render({ ...params, timeRange: { from: 'not a date', to: 'now' } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toMatch(/Invalid time range/);
    expect(mockGetFilterValues).not.toHaveBeenCalled();
  });

  it('clears the error when a new request starts', async () => {
    mockGetFilterValues
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(response(['linux']));
    const { result, rerender } = render();
    await waitFor(() => expect(result.current.error).toBeDefined());

    rerender({ ...params, filters: { 'cloud.provider': ['aws'] } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.values).toEqual(['linux']);
  });
});
