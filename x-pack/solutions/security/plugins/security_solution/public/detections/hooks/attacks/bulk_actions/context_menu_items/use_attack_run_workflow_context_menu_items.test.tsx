/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { RUN_WORKFLOW_BULK_PANEL_ID } from '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { useBulkAttackRunWorkflowItems } from '../bulk_action_items/use_bulk_attack_run_workflow_items';
import { useAttackRunWorkflowContextMenuItems } from './use_attack_run_workflow_context_menu_items';

jest.mock('../bulk_action_items/use_bulk_attack_run_workflow_items');

const mockUseBulkAttackRunWorkflowItems = useBulkAttackRunWorkflowItems as jest.MockedFunction<
  typeof useBulkAttackRunWorkflowItems
>;

const defaultAttacks = [
  {
    attackId: 'attack-1',
    attackIndex: '.alerts-security.attack.discovery.alerts-default-000001',
    relatedAlertIds: ['alert-1', 'alert-2'],
  },
];

const mockRenderContent = jest.fn((props) => React.createElement('div', null, 'Workflow Panel'));

const defaultBulkActionItems = {
  items: [
    {
      key: 'run-attack-workflow-action',
      label: 'Run workflow',
      name: 'Run workflow',
      panel: RUN_WORKFLOW_BULK_PANEL_ID,
      'data-test-subj': 'run-attack-workflow-action',
      disableOnQuery: true as const,
    },
  ],
  panels: [
    {
      id: RUN_WORKFLOW_BULK_PANEL_ID,
      title: 'Select workflow',
      'data-test-subj': 'attack-workflow-context-menu-panel',
      renderContent: mockRenderContent,
    },
  ],
};

describe('useAttackRunWorkflowContextMenuItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBulkAttackRunWorkflowItems.mockReturnValue(defaultBulkActionItems);
  });

  describe('when bulk action items are available', () => {
    it('should return one item with the correct key and panel', () => {
      const { result } = renderHook(() =>
        useAttackRunWorkflowContextMenuItems({ attacksForWorkflowRun: defaultAttacks })
      );

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        key: 'run-attack-workflow-action',
        panel: RUN_WORKFLOW_BULK_PANEL_ID,
        'data-test-subj': 'run-attack-workflow-action',
      });
    });

    it('should return one panel with the correct id', () => {
      const { result } = renderHook(() =>
        useAttackRunWorkflowContextMenuItems({ attacksForWorkflowRun: defaultAttacks })
      );

      expect(result.current.panels).toHaveLength(1);
      expect(result.current.panels[0]).toMatchObject({
        id: RUN_WORKFLOW_BULK_PANEL_ID,
      });
    });

    it('should pass alert ids with the correct index name to the panel renderContent', () => {
      renderHook(() =>
        useAttackRunWorkflowContextMenuItems({ attacksForWorkflowRun: defaultAttacks })
      );

      expect(mockRenderContent).toHaveBeenCalled();
      const callArgs = mockRenderContent.mock.calls[0][0];
      expect(callArgs.alertItems).toEqual([
        {
          _id: 'attack-1',
          data: [],
          ecs: {
            _id: 'attack-1',
            _index: '.alerts-security.attack.discovery.alerts-default-000001',
          },
        },
      ]);
    });

    it('should pass attackIndex as ecs._index when provided', () => {
      const attacksWithIndex = [
        {
          attackId: 'attack-1',
          relatedAlertIds: ['alert-1'],
          attackIndex: '.alerts-security.attack.discovery.alerts-default-000001',
        },
      ];

      renderHook(() =>
        useAttackRunWorkflowContextMenuItems({ attacksForWorkflowRun: attacksWithIndex })
      );

      const callArgs = mockRenderContent.mock.calls[0][0];
      expect(callArgs.alertItems[0].ecs._index).toBe(
        '.alerts-security.attack.discovery.alerts-default-000001'
      );
    });

    it('should call closePopoverMenu via closePopover when provided', () => {
      const closePopover = jest.fn();

      renderHook(() =>
        useAttackRunWorkflowContextMenuItems({
          attacksForWorkflowRun: defaultAttacks,
          closePopover,
        })
      );

      const callArgs = mockRenderContent.mock.calls[0][0];
      callArgs.closePopoverMenu();
      expect(closePopover).toHaveBeenCalledTimes(1);
    });

    it('should map multiple attacks to alert items', () => {
      const attacks = [
        {
          attackId: 'attack-1',
          attackIndex: '.alerts-security.attack.discovery.alerts-default-000001',
          relatedAlertIds: ['alert-1'],
        },
        {
          attackId: 'attack-2',
          attackIndex: '.alerts-security.attack.discovery.alerts-default-000002',
          relatedAlertIds: ['alert-2'],
        },
      ];

      renderHook(() => useAttackRunWorkflowContextMenuItems({ attacksForWorkflowRun: attacks }));

      const callArgs = mockRenderContent.mock.calls[0][0];
      expect(callArgs.alertItems).toEqual([
        {
          _id: 'attack-1',
          data: [],
          ecs: {
            _id: 'attack-1',
            _index: '.alerts-security.attack.discovery.alerts-default-000001',
          },
        },
        {
          _id: 'attack-2',
          data: [],
          ecs: {
            _id: 'attack-2',
            _index: '.alerts-security.attack.discovery.alerts-default-000002',
          },
        },
      ]);
    });
  });

  describe('when attacksForWorkflowRun is empty', () => {
    it('should return empty items and panels', () => {
      const { result } = renderHook(() =>
        useAttackRunWorkflowContextMenuItems({ attacksForWorkflowRun: [] })
      );

      expect(result.current.items).toHaveLength(0);
      expect(result.current.panels).toHaveLength(0);
    });
  });

  describe('when attacksForWorkflowRun do not have concrete index', () => {
    it('should return empty items and panels', () => {
      const { result } = renderHook(() =>
        useAttackRunWorkflowContextMenuItems({
          attacksForWorkflowRun: [{ attackId: 'attack-1' }],
        })
      );

      expect(result.current.items).toHaveLength(0);
      expect(result.current.panels).toHaveLength(0);
    });
  });

  describe('when bulk action items are empty', () => {
    it('should return empty items and panels', () => {
      mockUseBulkAttackRunWorkflowItems.mockReturnValue({ items: [], panels: [] });

      const { result } = renderHook(() =>
        useAttackRunWorkflowContextMenuItems({ attacksForWorkflowRun: defaultAttacks })
      );

      expect(result.current.items).toHaveLength(0);
      expect(result.current.panels).toHaveLength(0);
    });
  });
});
