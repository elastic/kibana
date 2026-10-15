/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import { FILTER_CLOSED, FILTER_OPEN } from '../../../../../../common/types';
import type { AlertWorkflowStatus } from '../../../../../common/types';
import { useApplyAttackWorkflowStatus } from './use_apply_attack_workflow_status';
import { useSetAttacksStatus } from '../../../../../common/containers/attacks/hooks/use_set_attacks_status';
import { useUpdateAttacksModal } from '../confirmation_modal/use_update_attacks_modal';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/containers/attacks/hooks/use_set_attacks_status');
jest.mock('../confirmation_modal/use_update_attacks_modal');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSetAttacksStatus = useSetAttacksStatus as jest.MockedFunction<
  typeof useSetAttacksStatus
>;
const mockUseUpdateAttacksModal = useUpdateAttacksModal as jest.MockedFunction<
  typeof useUpdateAttacksModal
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useApplyAttackWorkflowStatus', () => {
  const mockAttacksMutateAsync = jest.fn();
  const mockShowModal = jest.fn();
  const mockReportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseKibana.mockReturnValue({
      services: {
        telemetry: {
          reportEvent: mockReportEvent,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseSetAttacksStatus.mockReturnValue({
      mutateAsync: mockAttacksMutateAsync,
    } as unknown as ReturnType<typeof useSetAttacksStatus>);

    mockUseUpdateAttacksModal.mockReturnValue(mockShowModal);
  });

  it('should report telemetry with attack_only scope when user chooses attacks only', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockAttacksMutateAsync.mockResolvedValue({ updated: 2 });

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_OPEN as AlertWorkflowStatus,
        attackIds: ['attack-1', 'attack-2'],
        relatedAlertIds: ['alert-1', 'alert-2'],
        telemetrySource: 'attacks_page_group_take_action',
      });
    });

    expect(mockReportEvent).toHaveBeenCalledWith(AttacksEventTypes.ActionStatusUpdated, {
      status: FILTER_OPEN,
      source: 'attacks_page_group_take_action',
      scope: 'attack_only',
    });
  });

  it('should report telemetry with attack_and_related_alerts scope when user chooses both', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: true });
    mockAttacksMutateAsync.mockResolvedValue({ updated: 2 });

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_OPEN as AlertWorkflowStatus,
        attackIds: ['attack-1'],
        relatedAlertIds: ['alert-1', 'alert-2', 'alert-3'],
        telemetrySource: 'attacks_page_group_take_action',
      });
    });

    expect(mockReportEvent).toHaveBeenCalledWith(AttacksEventTypes.ActionStatusUpdated, {
      status: FILTER_OPEN,
      source: 'attacks_page_group_take_action',
      scope: 'attack_and_related_alerts',
    });
  });

  it('should show modal and update only attacks when user chooses attacks only', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockAttacksMutateAsync.mockResolvedValue({ updated: 2 });

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
    expect(mockAttacksMutateAsync).toHaveBeenCalledWith({
      ids: ['attack-1', 'attack-2'],
      status: FILTER_OPEN,
      update_related_alerts: false,
    });
    expect(setIsLoading).toHaveBeenCalledWith(true);
    expect(setIsLoading).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should show modal and update both when user chooses attacks and alerts', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: true });
    mockAttacksMutateAsync.mockResolvedValue({ updated: 4 });

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
    expect(mockAttacksMutateAsync).toHaveBeenCalledWith({
      ids: ['attack-1'],
      status: FILTER_OPEN,
      update_related_alerts: true,
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should include reason when status is FILTER_CLOSED', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockAttacksMutateAsync.mockResolvedValue({ updated: 1 });

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

    expect(mockAttacksMutateAsync).toHaveBeenCalledWith({
      ids: ['attack-1'],
      status: FILTER_CLOSED,
      update_related_alerts: false,
      reason,
    });
  });

  it('should not include reason when status is not FILTER_CLOSED', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockAttacksMutateAsync.mockResolvedValue({ updated: 1 });

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

    expect(mockAttacksMutateAsync).toHaveBeenCalledWith({
      ids: ['attack-1'],
      status: FILTER_OPEN,
      update_related_alerts: false,
    });
    expect(mockAttacksMutateAsync).not.toHaveBeenCalledWith(expect.objectContaining({ reason }));
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
    expect(mockAttacksMutateAsync).not.toHaveBeenCalled();
    expect(setIsLoading).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should handle missing optional callbacks', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockAttacksMutateAsync.mockResolvedValue({ updated: 1 });

    const { result } = renderHook(() => useApplyAttackWorkflowStatus(), { wrapper });

    await act(async () => {
      await result.current.applyWorkflowStatus({
        status: FILTER_OPEN as AlertWorkflowStatus,
        attackIds: ['attack-1'],
        relatedAlertIds: [],
      });
    });

    expect(mockAttacksMutateAsync).toHaveBeenCalled();
  });

  it('should set loading to false even if mutation fails', async () => {
    mockShowModal.mockResolvedValue({ updateAlerts: false });
    mockAttacksMutateAsync.mockRejectedValue(new Error('Mutation failed'));

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
