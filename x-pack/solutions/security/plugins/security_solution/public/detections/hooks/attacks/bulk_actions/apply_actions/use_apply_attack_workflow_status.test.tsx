/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { FILTER_CLOSED, FILTER_OPEN } from '../../../../../../common/types';
import type { AlertWorkflowStatus } from '../../../../../common/types';
import { useApplyAttackWorkflowStatus } from './use_apply_attack_workflow_status';
import { useSetUnifiedAlertsWorkflowStatus } from '../../../../../common/containers/unified_alerts/hooks/use_set_unified_alerts_workflow_status';
import { useUpdateAttacksModal } from '../confirmation_modal/use_update_attacks_modal';

jest.mock(
  '../../../../../common/containers/unified_alerts/hooks/use_set_unified_alerts_workflow_status'
);
jest.mock('../confirmation_modal/use_update_attacks_modal');

const mockUseSetUnifiedAlertsWorkflowStatus =
  useSetUnifiedAlertsWorkflowStatus as jest.MockedFunction<
    typeof useSetUnifiedAlertsWorkflowStatus
  >;
const mockUseUpdateAttacksModal = useUpdateAttacksModal as jest.MockedFunction<
  typeof useUpdateAttacksModal
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useApplyAttackWorkflowStatus', () => {
  const mockMutateAsync = jest.fn();
  const mockShowModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseSetUnifiedAlertsWorkflowStatus.mockReturnValue({
      mutateAsync: mockMutateAsync,
    } as unknown as ReturnType<typeof useSetUnifiedAlertsWorkflowStatus>);

    mockUseUpdateAttacksModal.mockReturnValue(mockShowModal);
  });

  it('should show modal and update only attacks when user chooses attacks only', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockMutateAsync.mockResolvedValue({ updated: 2 });

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });
    const setIsLoading = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_OPEN as AlertWorkflowStatus,
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
      signal_ids: ['attack-1', 'attack-2'],
      status: FILTER_OPEN,
    });
    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should show modal and update both when user chooses attacks and alerts', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: true });
    mockMutateAsync.mockResolvedValue({ updated: 4 });

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });
    const setIsLoading = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_OPEN as AlertWorkflowStatus,
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
      signal_ids: ['attack-1', 'alert-1', 'alert-2', 'alert-3'],
      status: FILTER_OPEN,
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should include reason when status is FILTER_CLOSED', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockMutateAsync.mockResolvedValue({ updated: 1 });

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });
    const reason = 'false_positive' as const;

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_CLOSED as AlertWorkflowStatus,
        attackIds: ['attack-1'],
        relatedAlertIds: [],
        reason,
      });
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      signal_ids: ['attack-1'],
      status: FILTER_CLOSED,
      reason,
    });
  });

  it('should not include reason when status is not FILTER_CLOSED', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockMutateAsync.mockResolvedValue({ updated: 1 });

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });
    const reason = 'false_positive' as const;

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_OPEN as AlertWorkflowStatus,
        attackIds: ['attack-1'],
        relatedAlertIds: [],
        reason,
      });
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      signal_ids: ['attack-1'],
      status: FILTER_OPEN,
    });
    expect(mockMutateAsync).not.toHaveBeenCalledWith(expect.objectContaining({ reason }));
  });

  it('should not proceed when user cancels modal', async () => {
    mockShowModal.mockResolvedValue(null);

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });
    const setIsLoading = jest.fn();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_OPEN as AlertWorkflowStatus,
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

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_OPEN as AlertWorkflowStatus,
        attackIds: ['attack-1'],
        relatedAlertIds: [],
      });
    });

    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it('should set loading to false even if mutation fails', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockMutateAsync.mockRejectedValue(new Error('Mutation failed'));

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });
    const setIsLoading = jest.fn();

    await act(async () => {
      try {
        await result.current.applyWorkflowStatus({
          status: FILTER_OPEN as AlertWorkflowStatus,
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
