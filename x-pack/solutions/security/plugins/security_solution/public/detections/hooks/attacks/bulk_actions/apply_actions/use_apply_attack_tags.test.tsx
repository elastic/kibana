/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useApplyAttackTags } from './use_apply_attack_tags';
import { useSetUnifiedAlertsTags } from '../../../../../common/containers/unified_alerts/hooks/use_set_unified_alerts_tags';
import { useUpdateAttacksModal } from '../confirmation_modal/use_update_attacks_modal';

jest.mock('../../../../../common/containers/unified_alerts/hooks/use_set_unified_alerts_tags');
jest.mock('../confirmation_modal/use_update_attacks_modal');

const mockUseSetUnifiedAlertsTags = useSetUnifiedAlertsTags as jest.MockedFunction<
  typeof useSetUnifiedAlertsTags
>;
const mockUseUpdateAttacksModal = useUpdateAttacksModal as jest.MockedFunction<
  typeof useUpdateAttacksModal
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useApplyAttackTags', () => {
  const mockMutateAsync = jest.fn();
  const mockShowModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseSetUnifiedAlertsTags.mockReturnValue({
      mutateAsync: mockMutateAsync,
    } as unknown as ReturnType<typeof useSetUnifiedAlertsTags>);

    mockUseUpdateAttacksModal.mockReturnValue(mockShowModal);
  });

  it('should show modal and update only attacks when user chooses attacks only', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockMutateAsync.mockResolvedValue({ updated: 2 });

    const { result } = renderHook(() => useApplyAttackTags(), { wrapper });
    const setIsLoading = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.applyTags({
        tags: { tags_to_add: ['tag1'], tags_to_remove: [] },
        attackIds: ['attack-1', 'attack-2'],
        relatedAlertIds: ['alert-1', 'alert-2'],
        setIsLoading,
        onSuccess,
      });
    });

    expect(mockShowModal).toHaveBeenCalledWith({
      alertsCount: 2,
      attackDiscoveriesCount: 2,
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      ids: ['attack-1', 'attack-2'],
      tags: { tags_to_add: ['tag1'], tags_to_remove: [] },
    });
    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should show modal and update both when user chooses attacks and alerts', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: true });
    mockMutateAsync.mockResolvedValue({ updated: 4 });

    const { result } = renderHook(() => useApplyAttackTags(), { wrapper });
    const setIsLoading = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.applyTags({
        tags: { tags_to_add: ['tag1'], tags_to_remove: ['tag2'] },
        attackIds: ['attack-1'],
        relatedAlertIds: ['alert-1', 'alert-2', 'alert-3'],
        setIsLoading,
        onSuccess,
      });
    });

    expect(mockShowModal).toHaveBeenCalledWith({
      alertsCount: 3,
      attackDiscoveriesCount: 1,
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      ids: ['attack-1', 'alert-1', 'alert-2', 'alert-3'],
      tags: { tags_to_add: ['tag1'], tags_to_remove: ['tag2'] },
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should not proceed when user cancels modal', async () => {
    mockShowModal.mockResolvedValue(null);

    const { result } = renderHook(() => useApplyAttackTags(), { wrapper });
    const setIsLoading = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.applyTags({
        tags: { tags_to_add: ['tag1'], tags_to_remove: [] },
        attackIds: ['attack-1'],
        relatedAlertIds: ['alert-1'],
        setIsLoading,
        onSuccess,
      });
    });

    expect(mockShowModal).toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(setIsLoading).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should handle missing optional callbacks', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockMutateAsync.mockResolvedValue({ updated: 1 });

    const { result } = renderHook(() => useApplyAttackTags(), { wrapper });

    await act(async () => {
      await result.current.applyTags({
        tags: { tags_to_add: ['tag1'], tags_to_remove: [] },
        attackIds: ['attack-1'],
        relatedAlertIds: [],
      });
    });

    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it('should set loading to false even if mutation fails', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockMutateAsync.mockRejectedValue(new Error('Mutation failed'));

    const { result } = renderHook(() => useApplyAttackTags(), { wrapper });
    const setIsLoading = jest.fn();

    await act(async () => {
      try {
        await result.current.applyTags({
          tags: { tags_to_add: ['tag1'], tags_to_remove: [] },
          attackIds: ['attack-1'],
          relatedAlertIds: [],
          setIsLoading,
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(setIsLoading).toHaveBeenCalledWith(false);
  });
});
