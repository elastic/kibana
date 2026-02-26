/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackInvestigateInTimelineContextMenuItems } from './use_attack_investigate_in_timeline_context_menu_items';
import { useBulkAttackInvestigateInTimelineItems } from '../bulk_action_items/use_bulk_attack_investigate_in_timeline_items';

jest.mock('../bulk_action_items/use_bulk_attack_investigate_in_timeline_items');

const mockUseBulkAttackInvestigateInTimelineItems =
  useBulkAttackInvestigateInTimelineItems as jest.MockedFunction<
    typeof useBulkAttackInvestigateInTimelineItems
  >;

describe('useAttackInvestigateInTimelineContextMenuItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseBulkAttackInvestigateInTimelineItems.mockReturnValue({
      items: [
        {
          label: 'Investigate in timeline',
          key: 'attack-investigate-in-timeline-action-item',
          'data-test-subj': 'attack-investigate-in-timeline-action-item',
          disableOnQuery: true,
          onClick: jest.fn(),
        },
      ],
      panels: [],
    });
  });

  it('should return one item matching the snapshot', () => {
    const { result } = renderHook(() =>
      useAttackInvestigateInTimelineContextMenuItems({
        attacksWithTimelineAlerts: [{ attackId: 'attack-1', relatedAlertIds: ['alert-1'] }],
      })
    );

    expect(result.current.items).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "attack-investigate-in-timeline-action-item",
          "key": "attack-investigate-in-timeline-action-item",
          "name": "Investigate in timeline",
          "onClick": [Function],
          "panel": undefined,
        },
      ]
    `);
  });

  it('should call useBulkAttackInvestigateInTimelineItems', () => {
    renderHook(() =>
      useAttackInvestigateInTimelineContextMenuItems({
        attacksWithTimelineAlerts: [{ attackId: 'attack-1', relatedAlertIds: ['alert-1'] }],
      })
    );

    expect(mockUseBulkAttackInvestigateInTimelineItems).toHaveBeenCalledWith({
      closePopover: undefined,
    });
  });

  it('should pass closePopover to useBulkAttackInvestigateInTimelineItems', () => {
    const closePopover = jest.fn();

    renderHook(() =>
      useAttackInvestigateInTimelineContextMenuItems({
        attacksWithTimelineAlerts: [{ attackId: 'attack-1', relatedAlertIds: ['alert-1'] }],
        closePopover,
      })
    );

    expect(mockUseBulkAttackInvestigateInTimelineItems).toHaveBeenCalledWith({
      closePopover,
    });
  });

  it('should return empty panels', () => {
    const { result } = renderHook(() =>
      useAttackInvestigateInTimelineContextMenuItems({
        attacksWithTimelineAlerts: [{ attackId: 'attack-1', relatedAlertIds: ['alert-1'] }],
      })
    );

    expect(result.current.panels).toEqual([]);
  });
});
