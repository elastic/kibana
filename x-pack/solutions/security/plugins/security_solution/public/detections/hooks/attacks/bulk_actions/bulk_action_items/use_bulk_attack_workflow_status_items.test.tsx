/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  ALERT_CLOSING_REASON_PANEL_ID,
  useBulkClosingReasonItems,
} from '@kbn/response-ops-detections-close-reason';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useBulkAttackWorkflowStatusItems } from './use_bulk_attack_workflow_status_items';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { useApplyAttackWorkflowStatus } from '../apply_actions/use_apply_attack_workflow_status';

jest.mock('../use_attacks_privileges');
jest.mock('../apply_actions/use_apply_attack_workflow_status');
jest.mock('@kbn/response-ops-detections-close-reason');

const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockUseApplyAttackWorkflowStatus = useApplyAttackWorkflowStatus as jest.MockedFunction<
  typeof useApplyAttackWorkflowStatus
>;
const mockUseBulkClosingReasonItems = useBulkClosingReasonItems as jest.MockedFunction<
  typeof useBulkClosingReasonItems
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useBulkAttackWorkflowStatusItems', () => {
  const mockApplyWorkflowStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseBulkClosingReasonItems.mockReturnValue({
      item: {
        label: 'Close',
        key: 'closed-attack-status',
        'data-test-subj': 'closed-attack-status',
        panel: ALERT_CLOSING_REASON_PANEL_ID,
      },
      panels: [
        {
          id: ALERT_CLOSING_REASON_PANEL_ID,
          title: 'Close selected alerts',
          renderContent: () => React.createElement('div'),
        },
      ],
      getPanels: jest.fn().mockReturnValue([]),
    });

    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });

    mockUseApplyAttackWorkflowStatus.mockReturnValue({
      applyWorkflowStatus: mockApplyWorkflowStatus,
    } as ReturnType<typeof useApplyAttackWorkflowStatus>);
  });

  it('should return empty items when user lacks privileges', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: false,
      hasAttackIndexWrite: true,
      loading: false,
    });

    const { result } = renderHook(() => useBulkAttackWorkflowStatusItems(), { wrapper });

    expect(result.current.items).toEqual([]);
  });

  it('should return empty items when loading', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: true,
    });

    const { result } = renderHook(() => useBulkAttackWorkflowStatusItems(), { wrapper });

    expect(result.current.items).toEqual([]);
  });

  it('should return workflow status items when user has privileges', () => {
    const { result } = renderHook(() => useBulkAttackWorkflowStatusItems(), { wrapper });

    expect(result.current.items.length).toBeGreaterThan(0);
  });

  it('should not include current status in items', () => {
    const { result } = renderHook(
      () => useBulkAttackWorkflowStatusItems({ currentStatus: 'open' }),
      { wrapper }
    );

    const openItem = result.current.items.find((item) => item.key === 'open-attack-status');
    expect(openItem).toBeUndefined();
  });

  it('should return closing reason panel', () => {
    const { result } = renderHook(() => useBulkAttackWorkflowStatusItems(), { wrapper });

    expect(result.current.panels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ALERT_CLOSING_REASON_PANEL_ID,
        }),
      ])
    );
  });

  describe('actions', () => {
    it('should call applyWorkflowStatus with telemetrySource when opening attacks', async () => {
      const { result } = renderHook(
        () =>
          useBulkAttackWorkflowStatusItems({
            telemetrySource: 'attacks_page_group_take_action',
            currentStatus: 'closed',
          }),
        { wrapper }
      );

      const openItem = result.current.items.find((item) => item.key === 'open-attack-status');
      if (openItem && openItem.onClick) {
        await openItem.onClick(
          [{ _id: '1', data: [], ecs: { _id: '1' } }],
          false,
          jest.fn(),
          jest.fn(),
          jest.fn()
        );
      }

      expect(mockApplyWorkflowStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
          telemetrySource: 'attacks_page_group_take_action',
        })
      );
    });

    it('should call applyWorkflowStatus with telemetrySource when acknowledging attacks', async () => {
      const { result } = renderHook(
        () =>
          useBulkAttackWorkflowStatusItems({
            telemetrySource: 'attacks_page_group_take_action',
            currentStatus: 'open',
          }),
        { wrapper }
      );

      const ackItem = result.current.items.find((item) => item.key === 'acknowledge-attack-status');
      if (ackItem && ackItem.onClick) {
        await ackItem.onClick(
          [{ _id: '1', data: [], ecs: { _id: '1' } }],
          false,
          jest.fn(),
          jest.fn(),
          jest.fn()
        );
      }

      expect(mockApplyWorkflowStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'acknowledged',
          telemetrySource: 'attacks_page_group_take_action',
        })
      );
    });

    it('should call applyWorkflowStatus with telemetrySource when closing attacks', async () => {
      renderHook(
        () =>
          useBulkAttackWorkflowStatusItems({
            telemetrySource: 'attacks_page_group_take_action',
            currentStatus: 'open',
          }),
        { wrapper }
      );

      const onSubmitCloseReason =
        mockUseBulkClosingReasonItems.mock.calls[0][0]?.onSubmitCloseReason;
      if (onSubmitCloseReason) {
        await onSubmitCloseReason({
          alertItems: [{ _id: '1', data: [], ecs: { _id: '1' } }],
          reason: 'other',
          setIsBulkActionsLoading: jest.fn(),
          closePopoverMenu: jest.fn(),
        });
      }

      expect(mockApplyWorkflowStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'closed',
          telemetrySource: 'attacks_page_group_take_action',
        })
      );
    });
  });
});
