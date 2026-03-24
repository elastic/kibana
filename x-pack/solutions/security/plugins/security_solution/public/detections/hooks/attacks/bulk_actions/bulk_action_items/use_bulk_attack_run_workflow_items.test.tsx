/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import { renderHook } from '@testing-library/react';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import type { WorkflowsManagementCapabilities } from '@kbn/workflows-ui';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';

import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { RUN_WORKFLOW_BULK_PANEL_ID } from '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { useBulkAttackRunWorkflowItems } from './use_bulk_attack_run_workflow_items';

const createCapabilities = (
  overrides: Partial<WorkflowsManagementCapabilities> = {}
): WorkflowsManagementCapabilities => ({
  canCreateWorkflow: true,
  canReadWorkflow: true,
  canUpdateWorkflow: true,
  canDeleteWorkflow: true,
  canExecuteWorkflow: true,
  canReadWorkflowExecution: true,
  canCancelWorkflowExecution: true,
  ...overrides,
});

jest.mock('@kbn/workflows-ui');
jest.mock('../../../../../common/hooks/use_space_id');
jest.mock('../use_attacks_privileges');
jest.mock(
  '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel',
  () => ({
    ...jest.requireActual(
      '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel'
    ),
    AlertWorkflowsPanel: () => null,
  })
);

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;
const mockUseWorkflowsUIEnabledSetting = useWorkflowsUIEnabledSetting as jest.MockedFunction<
  typeof useWorkflowsUIEnabledSetting
>;
const mockUseSpaceId = useSpaceId as jest.MockedFunction<typeof useSpaceId>;
const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;

const defaultAlertItems = [{ _id: 'attack-1', data: [], ecs: { _id: 'attack-1' } }];

describe('useBulkAttackRunWorkflowItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSpaceId.mockReturnValue('default');
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });
    mockUseWorkflowsCapabilities.mockReturnValue(createCapabilities());
    mockUseWorkflowsUIEnabledSetting.mockReturnValue(true);
  });

  describe('when all permissions are granted', () => {
    it('should return one item with the correct key and panel', () => {
      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        key: 'run-attack-workflow-action',
        panel: RUN_WORKFLOW_BULK_PANEL_ID,
        'data-test-subj': 'run-attack-workflow-action',
      });
    });

    it('should return one panel with the correct id and data-test-subj', () => {
      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      expect(result.current.panels).toHaveLength(1);
      expect(result.current.panels[0]).toMatchObject({
        id: RUN_WORKFLOW_BULK_PANEL_ID,
        'data-test-subj': 'attack-workflow-context-menu-panel',
      });
    });

    it('should pass alert ids with the correct index name to the panel content', () => {
      const spaceId = 'my-space';
      mockUseSpaceId.mockReturnValue(spaceId);

      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      const expectedIndex = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`;
      const closePopoverMenu = jest.fn();
      const panelContent = result.current.panels[0].renderContent({
        alertItems: defaultAlertItems,
        closePopoverMenu,
        setIsBulkActionsLoading: jest.fn(),
      }) as ReactElement;
      expect(panelContent.props.alertIds).toEqual([{ _id: 'attack-1', _index: expectedIndex }]);
    });

    it('should use ecs._index from alertItems when provided, instead of the alias', () => {
      const concreteIndex = '.alerts-security.attack.discovery.alerts-default-000001';
      const alertItemsWithIndex = [
        { _id: 'attack-1', data: [], ecs: { _id: 'attack-1', _index: concreteIndex } },
      ];

      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      const closePopoverMenu = jest.fn();
      const panelContent = result.current.panels[0].renderContent({
        alertItems: alertItemsWithIndex,
        closePopoverMenu,
        setIsBulkActionsLoading: jest.fn(),
      }) as ReactElement;
      expect(panelContent.props.alertIds).toEqual([{ _id: 'attack-1', _index: concreteIndex }]);
    });

    it('should fall back to "default" space when useSpaceId returns undefined', () => {
      mockUseSpaceId.mockReturnValue(undefined);

      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      const expectedIndex = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default`;
      const closePopoverMenu = jest.fn();
      const panelContent = result.current.panels[0].renderContent({
        alertItems: defaultAlertItems,
        closePopoverMenu,
        setIsBulkActionsLoading: jest.fn(),
      }) as ReactElement;
      expect(panelContent.props.alertIds).toEqual([{ _id: 'attack-1', _index: expectedIndex }]);
    });

    it('should pass closePopoverMenu to the panel onClose', () => {
      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      const closePopoverMenu = jest.fn();
      const panelContent = result.current.panels[0].renderContent({
        alertItems: defaultAlertItems,
        closePopoverMenu,
        setIsBulkActionsLoading: jest.fn(),
      }) as ReactElement;
      panelContent.props.onClose();
      expect(closePopoverMenu).toHaveBeenCalledTimes(1);
    });
  });

  describe('when canRunWorkflow is false', () => {
    it('should return empty items and panels when still loading', () => {
      mockUseAttacksPrivileges.mockReturnValue({
        hasIndexWrite: true,
        hasAttackIndexWrite: true,
        loading: true,
      });

      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.panels).toHaveLength(0);
    });

    it('should return empty items and panels when hasIndexWrite is false', () => {
      mockUseAttacksPrivileges.mockReturnValue({
        hasIndexWrite: false,
        hasAttackIndexWrite: true,
        loading: false,
      });

      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.panels).toHaveLength(0);
    });

    it('should return empty items and panels when hasAttackIndexWrite is false', () => {
      mockUseAttacksPrivileges.mockReturnValue({
        hasIndexWrite: true,
        hasAttackIndexWrite: false,
        loading: false,
      });

      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.panels).toHaveLength(0);
    });

    it('should return empty items and panels when workflowUIEnabled is false', () => {
      mockUseWorkflowsUIEnabledSetting.mockReturnValue(false);

      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.panels).toHaveLength(0);
    });

    it('should return empty items and panels when canExecuteWorkflow is false', () => {
      mockUseWorkflowsCapabilities.mockReturnValue(
        createCapabilities({ canExecuteWorkflow: false })
      );

      const { result } = renderHook(() => useBulkAttackRunWorkflowItems());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.panels).toHaveLength(0);
    });
  });
});
