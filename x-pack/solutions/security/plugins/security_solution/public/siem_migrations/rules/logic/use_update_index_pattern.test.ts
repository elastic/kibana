/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useUpdateIndexPattern } from './use_update_index_pattern';
import { updateIndexPattern } from '../api';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../api');

describe('useUpdateIndexPattern', () => {
  it('updates index pattern successfully', async () => {
    (updateIndexPattern as jest.Mock).mockResolvedValue({ updated: 1 });
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useUpdateIndexPattern({ onSuccess }), {
      wrapper: TestProviders,
    });

    result.current.mutate({
      migrationId: 'test-migration-1',
      ids: ['test-rule-1', 'test-rule-2'],
      indexPattern: 'new-index-pattern',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updateIndexPattern).toHaveBeenCalledWith({
      migrationId: 'test-migration-1',
      ids: ['test-rule-1', 'test-rule-2'],
      indexPattern: 'new-index-pattern',
    });
    expect(onSuccess).toHaveBeenCalledWith({ updated: 1 });
  });

  it('handles API errors gracefully', async () => {
    const mockError = new Error('API error');
    (updateIndexPattern as jest.Mock).mockRejectedValue(mockError);
    const onError = jest.fn();
    const { result } = renderHook(() => useUpdateIndexPattern({ onError }), {
      wrapper: TestProviders,
    });

    result.current.mutate({
      migrationId: 'test-migration-1',
      ids: ['test-rule-1', 'test-rule-2'],
      indexPattern: 'new-index-pattern',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith(mockError);
  });
});
