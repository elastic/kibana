/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';

import { useUpdateAttacksModal } from './use_update_attacks_modal';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAssistantAvailability } from '../../../../../assistant/use_assistant_availability';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../assistant/use_assistant_availability');
jest.mock('./update_attacks_modal', () => ({
  UpdateAttacksModal: (props: {
    alertsCount: number;
    attackDiscoveriesCount: number;
    onCancel: () => void;
    onClose: () => void;
    onConfirm: (params: { updateAlerts: boolean }) => Promise<void>;
  }) => (
    <div
      data-test-subj="updateAttacksModal"
      data-alerts-count={props.alertsCount}
      data-attack-discoveries-count={props.attackDiscoveriesCount}
    >
      <button type="button" data-test-subj="cancel" onClick={props.onCancel}>
        {'Cancel'}
      </button>
      <button type="button" data-test-subj="close" onClick={props.onClose}>
        {'Close'}
      </button>
      <button
        type="button"
        data-test-subj="confirm-update-alerts-false"
        onClick={() => props.onConfirm({ updateAlerts: false })}
      >
        {'Update attacks only'}
      </button>
      <button
        type="button"
        data-test-subj="confirm-update-alerts-true"
        onClick={() => props.onConfirm({ updateAlerts: true })}
      >
        {'Update attacks and alerts'}
      </button>
    </div>
  ),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseAssistantAvailability = useAssistantAvailability as jest.MockedFunction<
  typeof useAssistantAvailability
>;

const mockClose = jest.fn();
const mockOverlays = {
  openModal: jest.fn((_component: React.ReactElement) => ({
    close: mockClose,
  })),
};

const mockServices = {};

describe('useUpdateAttacksModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default implementation
    mockOverlays.openModal.mockImplementation((_component: React.ReactElement) => ({
      close: mockClose,
    }));
    mockUseKibana.mockReturnValue({
      overlays: mockOverlays,
      services: mockServices,
    } as unknown as ReturnType<typeof useKibana>);
    // Default to false (normal behavior - show modal)
    mockUseAssistantAvailability.mockReturnValue({
      hasSearchAILakeConfigurations: false,
    } as ReturnType<typeof useAssistantAvailability>);
  });

  it('should call overlays.openModal when showModal is called', () => {
    const { result } = renderHook(() => useUpdateAttacksModal());

    act(() => {
      result.current({
        alertsCount: 0,
        attackDiscoveriesCount: 1,
      });
    });

    expect(mockOverlays.openModal).toHaveBeenCalledTimes(1);
  });

  it('should resolve with null when onCancel is called', async () => {
    let onCancelCallback: (() => void) | null = null;

    mockOverlays.openModal.mockImplementation((component: React.ReactElement) => {
      // Extract the onCancel callback from the modal component
      // component is KibanaContextProvider, its children is UpdateAttacksModal
      const kibanaProvider = component;
      const updateAttacksModal = React.Children.only(kibanaProvider.props.children);
      onCancelCallback = updateAttacksModal.props.onCancel;

      return {
        close: mockClose,
      };
    });

    const { result } = renderHook(() => useUpdateAttacksModal());

    let promise: Promise<{ updateAlerts: boolean } | null>;
    act(() => {
      promise = result.current({
        alertsCount: 0,
        attackDiscoveriesCount: 1,
      });
    });

    await act(async () => {
      if (onCancelCallback) {
        onCancelCallback();
      }
      const resolved = await promise!;
      expect(resolved).toBeNull();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('should resolve with null when onClose is called', async () => {
    let onCloseCallback: (() => void) | null = null;

    // Reset mock implementation for this test
    mockOverlays.openModal.mockImplementation((component: React.ReactElement) => {
      const kibanaProvider = component;
      const updateAttacksModal = React.Children.only(kibanaProvider.props.children);
      onCloseCallback = updateAttacksModal.props.onClose;

      return {
        close: mockClose,
      };
    });

    const { result } = renderHook(() => useUpdateAttacksModal());

    let promise: Promise<{ updateAlerts: boolean } | null>;
    act(() => {
      promise = result.current({
        alertsCount: 0,
        attackDiscoveriesCount: 1,
      });
    });

    await act(async () => {
      if (onCloseCallback) {
        onCloseCallback();
      }
      const resolved = await promise!;
      expect(resolved).toBeNull();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('should resolve with updateAlerts true when onConfirm is called with updateAlerts true', async () => {
    let onConfirmCallback: ((params: { updateAlerts: boolean }) => Promise<void>) | null = null;

    // Reset mock implementation for this test
    mockOverlays.openModal.mockImplementation((component: React.ReactElement) => {
      const kibanaProvider = component;
      const updateAttacksModal = React.Children.only(kibanaProvider.props.children);
      onConfirmCallback = updateAttacksModal.props.onConfirm;

      return {
        close: mockClose,
      };
    });

    const { result } = renderHook(() => useUpdateAttacksModal());

    let promise: Promise<{ updateAlerts: boolean } | null>;
    act(() => {
      promise = result.current({
        alertsCount: 1,
        attackDiscoveriesCount: 1,
      });
    });

    await act(async () => {
      if (onConfirmCallback) {
        await onConfirmCallback({ updateAlerts: true });
      }
      const resolved = await promise!;
      expect(resolved).toEqual({ updateAlerts: true });
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('should resolve with updateAlerts false when onConfirm is called with updateAlerts false', async () => {
    let onConfirmCallback: ((params: { updateAlerts: boolean }) => Promise<void>) | null = null;

    // Reset mock implementation for this test
    mockOverlays.openModal.mockImplementation((component: React.ReactElement) => {
      const kibanaProvider = component;
      const updateAttacksModal = React.Children.only(kibanaProvider.props.children);
      onConfirmCallback = updateAttacksModal.props.onConfirm;

      return {
        close: mockClose,
      };
    });

    const { result } = renderHook(() => useUpdateAttacksModal());

    let promise: Promise<{ updateAlerts: boolean } | null>;
    act(() => {
      promise = result.current({
        alertsCount: 1,
        attackDiscoveriesCount: 1,
      });
    });

    await act(async () => {
      if (onConfirmCallback) {
        await onConfirmCallback({ updateAlerts: false });
      }
      const resolved = await promise!;
      expect(resolved).toEqual({ updateAlerts: false });
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('should pass correct actionType to UpdateAttacksModal', () => {
    // Reset mock to default implementation
    mockOverlays.openModal.mockImplementation((_component: React.ReactElement) => ({
      close: mockClose,
    }));

    const { result: resultWorkflow } = renderHook(() => useUpdateAttacksModal());
    act(() => {
      resultWorkflow.current({
        alertsCount: 0,
        attackDiscoveriesCount: 1,
      });
    });

    const { result: resultAssignees } = renderHook(() => useUpdateAttacksModal());
    act(() => {
      resultAssignees.current({
        alertsCount: 0,
        attackDiscoveriesCount: 1,
      });
    });

    const { result: resultTags } = renderHook(() => useUpdateAttacksModal());
    act(() => {
      resultTags.current({
        alertsCount: 0,
        attackDiscoveriesCount: 1,
      });
    });

    expect(mockOverlays.openModal).toHaveBeenCalledTimes(3);
  });

  it('should pass correct counts to UpdateAttacksModal', () => {
    // Reset mock to default implementation
    mockOverlays.openModal.mockImplementation((_component: React.ReactElement) => ({
      close: mockClose,
    }));

    const { result } = renderHook(() => useUpdateAttacksModal());

    act(() => {
      result.current({
        alertsCount: 3,
        attackDiscoveriesCount: 2,
      });
    });

    expect(mockOverlays.openModal).toHaveBeenCalled();

    // Verify counts are passed correctly
    const call = mockOverlays.openModal.mock.calls[0][0];
    const updateAttacksModal = React.Children.only(call.props.children);

    // Should have 2 attacks
    expect(updateAttacksModal.props.attackDiscoveriesCount).toBe(2);
    // Should have 3 related alerts
    expect(updateAttacksModal.props.alertsCount).toBe(3);
  });

  it('should skip modal and resolve with updateAlerts false when hasSearchAILakeConfigurations is true', async () => {
    mockUseAssistantAvailability.mockReturnValue({
      hasSearchAILakeConfigurations: true,
    } as ReturnType<typeof useAssistantAvailability>);

    const { result } = renderHook(() => useUpdateAttacksModal());

    let promise: Promise<{ updateAlerts: boolean } | null>;
    await act(async () => {
      promise = result.current({
        alertsCount: 3,
        attackDiscoveriesCount: 2,
      });
      const resolved = await promise!;
      expect(resolved).toEqual({ updateAlerts: false });
      // Modal should not be opened
      expect(mockOverlays.openModal).not.toHaveBeenCalled();
    });
  });

  it('should show modal when hasSearchAILakeConfigurations is false', () => {
    mockUseAssistantAvailability.mockReturnValue({
      hasSearchAILakeConfigurations: false,
    } as ReturnType<typeof useAssistantAvailability>);

    const { result } = renderHook(() => useUpdateAttacksModal());

    act(() => {
      result.current({
        alertsCount: 0,
        attackDiscoveriesCount: 1,
      });
    });

    expect(mockOverlays.openModal).toHaveBeenCalledTimes(1);
  });
});
