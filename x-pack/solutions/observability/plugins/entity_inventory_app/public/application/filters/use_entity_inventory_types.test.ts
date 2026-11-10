/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getEntityInventoryTypes } from '../../mock_inventory_api/get_types';
import { typesFixture } from './__fixtures__/types';
import { useEntityInventoryTypes } from './use_entity_inventory_types';

jest.mock('../../mock_inventory_api/get_types');

const mockGetTypes = getEntityInventoryTypes as jest.MockedFunction<typeof getEntityInventoryTypes>;

describe('useEntityInventoryTypes', () => {
  beforeEach(() => {
    mockGetTypes.mockReset();
  });

  it('loads the types', async () => {
    mockGetTypes.mockResolvedValue(typesFixture);

    const { result } = renderHook(() => useEntityInventoryTypes());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.types).toEqual(typesFixture);
    expect(result.current.error).toBeUndefined();
  });

  it('returns the error when the request fails', async () => {
    mockGetTypes.mockRejectedValue(new Error('failed'));

    const { result } = renderHook(() => useEntityInventoryTypes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toEqual(new Error('failed'));
    expect(result.current.types).toEqual([]);
  });
});
