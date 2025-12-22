/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, screen, render } from '@testing-library/react';

import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useUpdateWorkflowStatusAction } from './use_update_status_action';

const mockMutateAsyncBulk = jest.fn().mockResolvedValue({});
const mockMutateAsyncStatus = jest.fn().mockResolvedValue({});

jest.mock('../../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: jest.fn(),
}));

jest.mock('../../../../attack_discovery/pages/use_attack_discovery_bulk', () => ({
  useAttackDiscoveryBulk: jest.fn(() => ({ mutateAsync: mockMutateAsyncBulk })),
}));

jest.mock(
  '../../../../attack_discovery/pages/results/take_action/use_update_alerts_status',
  () => ({
    useUpdateAlertsStatus: jest.fn(() => ({ mutateAsync: mockMutateAsyncStatus })),
  })
);

jest.mock('./translations', () => ({
  MARK_AS_OPEN: 'Mark as open',
  MARK_AS_ACKNOWLEDGED: 'Mark as acknowledged',
  MARK_AS_CLOSED: 'Mark as closed',
}));

jest.mock('../../../../attack_discovery/pages/results/take_action/update_alerts_modal', () => ({
  UpdateAlertsModal: (props: {
    alertsCount: number;
    attackDiscoveriesCount: number;
    workflowStatus: 'open' | 'acknowledged' | 'closed';
    onCancel: () => void;
    onClose: () => void;
    onConfirm: (args: {
      updateAlerts: boolean;
      workflowStatus: 'open' | 'acknowledged' | 'closed';
    }) => void;
  }) => (
    <div data-test-subj="update-alerts-modal">
      <div data-test-subj="alertsCount">{props.alertsCount}</div>
      <div data-test-subj="attackDiscoveriesCount">{props.attackDiscoveriesCount}</div>
      <div data-test-subj="workflowStatus">{props.workflowStatus}</div>

      <button
        type="button"
        data-test-subj="confirm-update-alerts"
        onClick={() =>
          props.onConfirm({ updateAlerts: true, workflowStatus: props.workflowStatus })
        }
      >
        {'confirm-update-alerts'}
      </button>

      <button
        type="button"
        data-test-subj="confirm-no-alerts"
        onClick={() =>
          props.onConfirm({ updateAlerts: false, workflowStatus: props.workflowStatus })
        }
      >
        {'confirm-no-alerts'}
      </button>

      <button type="button" data-test-subj="cancel" onClick={props.onCancel}>
        {'cancel'}
      </button>

      <button type="button" data-test-subj="close" onClick={props.onClose}>
        {'close'}
      </button>
    </div>
  ),
}));

let lastOpenedModalNode: React.ReactNode | null = null;
const mockCloseModal = jest.fn();

const mockOpenModal = jest.fn((node: React.ReactNode) => {
  lastOpenedModalNode = node;
  return { close: mockCloseModal };
});

jest.mock('../../../../common/lib/kibana', () => ({
  KibanaContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKibana: () => ({
    overlays: { openModal: mockOpenModal },
    services: {},
  }),
}));

const mockUseAssistantAvailability = useAssistantAvailability as jest.Mock;

const setAssistantAvailability = (hasSearchAILakeConfigurations: boolean) => {
  mockUseAssistantAvailability.mockReturnValue({
    hasSearchAILakeConfigurations,
  });
};

describe('useUpdateWorkflowStatusAction', () => {
  const attackDiscoveryIds = ['ad-1', 'ad-2'];
  const alertIds = ['a-1', 'a-2', 'a-3'];

  beforeEach(() => {
    jest.clearAllMocks();
    lastOpenedModalNode = null;
  });

  it('returns only the actions that would change status', () => {
    setAssistantAvailability(false);

    const { result } = renderHook(() =>
      useUpdateWorkflowStatusAction({
        attackDiscoveryIds,
        alertIds,
        currentWorkflowStatus: 'open',
      })
    );

    const titles = result.current.actionItems.map((a) => a.title);
    expect(titles).toEqual(['Mark as acknowledged', 'Mark as closed']);
  });

  it('non-EASE: clicking an action opens confirmation modal with correct props', async () => {
    setAssistantAvailability(false);

    const { result } = renderHook(() =>
      useUpdateWorkflowStatusAction({
        attackDiscoveryIds,
        alertIds,
        currentWorkflowStatus: 'open',
      })
    );

    expect(mockOpenModal).not.toHaveBeenCalled();
    expect(lastOpenedModalNode).toBeNull();

    await act(async () => {
      result.current.actionItems.find((x) => x.title === 'Mark as acknowledged')?.onClick?.();
    });

    expect(mockOpenModal).toHaveBeenCalledTimes(1);
    expect(lastOpenedModalNode).not.toBeNull();

    render(<>{lastOpenedModalNode}</>);

    expect(screen.getByTestId('update-alerts-modal')).toBeInTheDocument();
    expect(screen.getByTestId('alertsCount')).toHaveTextContent(String(alertIds.length));
    expect(screen.getByTestId('attackDiscoveriesCount')).toHaveTextContent(
      String(attackDiscoveryIds.length)
    );
    expect(screen.getByTestId('workflowStatus')).toHaveTextContent('acknowledged');
  });

  it('non-EASE: confirm updates attack discoveries and (optionally) alerts, and closes modal', async () => {
    setAssistantAvailability(false);

    const { result } = renderHook(() =>
      useUpdateWorkflowStatusAction({
        attackDiscoveryIds,
        alertIds,
        currentWorkflowStatus: 'open',
      })
    );

    await act(async () => {
      result.current.actionItems.find((x) => x.title === 'Mark as closed')?.onClick?.();
    });

    render(<>{lastOpenedModalNode}</>);

    expect(screen.getByTestId('update-alerts-modal')).toBeInTheDocument();

    await act(async () => {
      screen.getByTestId('confirm-update-alerts').click();
    });

    expect(mockMutateAsyncBulk).toHaveBeenCalledWith({
      ids: attackDiscoveryIds,
      kibanaAlertWorkflowStatus: 'closed',
    });

    expect(mockMutateAsyncStatus).toHaveBeenCalledWith({
      ids: alertIds,
      kibanaAlertWorkflowStatus: 'closed',
    });

    // close is called by the hook before / around updates
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('non-EASE: confirm does not update alerts when user opts out', async () => {
    setAssistantAvailability(false);

    const { result } = renderHook(() =>
      useUpdateWorkflowStatusAction({
        attackDiscoveryIds,
        alertIds,
        currentWorkflowStatus: 'open',
      })
    );

    await act(async () => {
      result.current.actionItems.find((x) => x.title === 'Mark as acknowledged')?.onClick?.();
    });

    render(<>{lastOpenedModalNode}</>);

    await act(async () => {
      screen.getByTestId('confirm-no-alerts').click();
    });

    expect(mockMutateAsyncBulk).toHaveBeenCalledWith({
      ids: attackDiscoveryIds,
      kibanaAlertWorkflowStatus: 'acknowledged',
    });

    expect(mockMutateAsyncStatus).not.toHaveBeenCalled();
  });

  it('non-EASE: confirm does not update alerts when there are no alertIds', async () => {
    setAssistantAvailability(false);

    const { result } = renderHook(() =>
      useUpdateWorkflowStatusAction({
        attackDiscoveryIds,
        alertIds: [],
        currentWorkflowStatus: 'open',
      })
    );

    await act(async () => {
      result.current.actionItems.find((x) => x.title === 'Mark as closed')?.onClick?.();
    });

    render(<>{lastOpenedModalNode}</>);

    await act(async () => {
      screen.getByTestId('confirm-update-alerts').click();
    });

    expect(mockMutateAsyncBulk).toHaveBeenCalledWith({
      ids: attackDiscoveryIds,
      kibanaAlertWorkflowStatus: 'closed',
    });

    expect(mockMutateAsyncStatus).not.toHaveBeenCalled();
  });

  it('EASE: clicking an action updates attack discoveries immediately and does not open the modal', async () => {
    setAssistantAvailability(true);

    const { result } = renderHook(() =>
      useUpdateWorkflowStatusAction({
        attackDiscoveryIds,
        alertIds,
        currentWorkflowStatus: 'open',
      })
    );

    await act(async () => {
      result.current.actionItems.find((x) => x.title === 'Mark as closed')?.onClick?.();
    });

    expect(mockMutateAsyncBulk).toHaveBeenCalledWith({
      ids: attackDiscoveryIds,
      kibanaAlertWorkflowStatus: 'closed',
    });

    expect(mockMutateAsyncStatus).not.toHaveBeenCalled();
    expect(mockOpenModal).not.toHaveBeenCalled();
    expect(lastOpenedModalNode).toBeNull();
  });
});
