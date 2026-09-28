/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackCaseContextMenuItems } from './use_attack_case_context_menu_items';
import { useBulkAttackCaseItems } from '../bulk_action_items/use_bulk_attack_case_items';

jest.mock('../bulk_action_items/use_bulk_attack_case_items');

const mockUseBulkAttackCaseItems = useBulkAttackCaseItems as jest.MockedFunction<
  typeof useBulkAttackCaseItems
>;

describe('useAttackCaseContextMenuItems', () => {
  const closePopover = jest.fn();
  const title = 'Attack title';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBulkAttackCaseItems.mockReturnValue({
      items: [
        {
          label: 'Add to case',
          key: 'attack-add-to-case',
          'data-test-subj': 'attack-add-to-case',
          disableOnQuery: true,
          onClick: jest.fn(),
        },
      ],
      panels: [],
    });
  });

  it('should return items from transformed bulk hook', () => {
    const { result } = renderHook(() =>
      useAttackCaseContextMenuItems({
        attacksWithCase: [
          {
            attackId: 'attack-1',
            relatedAlertIds: ['alert-1'],
            markdownComment: 'markdown',
          },
        ],
        closePopover,
        title,
      })
    );

    expect(result.current.items).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "attack-add-to-case",
          "key": "attack-add-to-case",
          "name": "Add to case",
          "onClick": [Function],
          "panel": undefined,
        },
      ]
    `);
  });

  it('should call useBulkAttackCaseItems with expected props', () => {
    renderHook(() =>
      useAttackCaseContextMenuItems({
        attacksWithCase: [
          {
            attackId: 'attack-1',
            relatedAlertIds: ['alert-1'],
            markdownComment: 'markdown',
          },
        ],
        title,
      })
    );

    expect(mockUseBulkAttackCaseItems).toHaveBeenCalledWith({
      closePopover: undefined,
      title,
    });
  });

  it('should pass telemetrySource to useBulkAttackCaseItems', () => {
    renderHook(() =>
      useAttackCaseContextMenuItems({
        attacksWithCase: [
          {
            attackId: 'attack-1',
            relatedAlertIds: ['alert-1'],
            markdownComment: 'markdown',
          },
        ],
        telemetrySource: 'attacks_page_group_take_action',
        title,
      })
    );

    expect(mockUseBulkAttackCaseItems).toHaveBeenCalledWith({
      closePopover: undefined,
      telemetrySource: 'attacks_page_group_take_action',
      title,
    });
  });

  it('should pass closePopover to useBulkAttackCaseItems', () => {
    renderHook(() =>
      useAttackCaseContextMenuItems({
        attacksWithCase: [
          {
            attackId: 'attack-1',
            relatedAlertIds: ['alert-1'],
            markdownComment: 'markdown',
          },
        ],
        closePopover,
        title,
      })
    );

    expect(mockUseBulkAttackCaseItems).toHaveBeenCalledWith({
      closePopover,
      title,
    });
  });

  it('should return empty panels', () => {
    const { result } = renderHook(() =>
      useAttackCaseContextMenuItems({
        attacksWithCase: [],
        title,
      })
    );

    expect(result.current.panels).toEqual([]);
  });
});
