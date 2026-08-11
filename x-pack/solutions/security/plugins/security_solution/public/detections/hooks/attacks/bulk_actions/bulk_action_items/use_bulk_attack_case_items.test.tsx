/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';
import { useBulkAttackCaseItems } from './use_bulk_attack_case_items';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT,
} from '../constants';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../../../../attack_discovery/pages/results/take_action/use_add_to_case', () => ({
  useAddToCase: jest.fn(),
}));

const { useKibana } = jest.requireMock('../../../../../common/lib/kibana') as {
  useKibana: jest.Mock;
};
const { useAddToCase } = jest.requireMock(
  '../../../../../attack_discovery/pages/results/take_action/use_add_to_case'
) as { useAddToCase: jest.Mock };

const alertItems: TimelineItem[] = [
  {
    _id: 'attack-1',
    data: [
      { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-1', 'alert-2'] },
      { field: ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT, value: ['markdown 1'] },
    ],
    ecs: { _id: 'attack-1' },
  },
  {
    _id: 'attack-2',
    data: [
      { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-2', 'alert-3'] },
      { field: ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT, value: ['markdown 2'] },
    ],
    ecs: { _id: 'attack-2' },
  },
];

describe('useBulkAttackCaseItems', () => {
  const onAddToCase = jest.fn();
  const reportEvent = jest.fn();
  const title = 'Attack title';

  beforeEach(() => {
    jest.clearAllMocks();
    useKibana.mockReturnValue({
      services: {
        telemetry: { reportEvent },
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              createComment: true,
              read: true,
            }),
          },
        },
      },
    });
    useAddToCase.mockReturnValue({
      disabled: false,
      onAddToCase,
    });
  });

  it('returns one modal-backed case action and no panels', () => {
    const { result } = renderHook(() => useBulkAttackCaseItems({ title }));

    expect(result.current.items).toEqual([
      expect.objectContaining({
        key: 'attack-add-to-case',
        label: 'Add to case',
        'data-test-subj': 'attack-add-to-case',
        icon: 'briefcase',
        onClick: expect.any(Function),
      }),
    ]);
    expect(result.current.panels).toEqual([]);
    expect(useAddToCase).toHaveBeenCalledWith(
      expect.objectContaining({
        title,
      })
    );
  });

  it('returns no case action without permissions', () => {
    useKibana.mockReturnValue({
      services: {
        telemetry: { reportEvent },
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              createComment: false,
              read: true,
            }),
          },
        },
      },
    });

    const { result } = renderHook(() => useBulkAttackCaseItems({ title }));

    expect(result.current.items).toEqual([]);
  });

  it('opens the selector with unique alert ids and markdown comments', async () => {
    const closePopover = jest.fn();
    const { result } = renderHook(() => useBulkAttackCaseItems({ closePopover, title }));

    await act(async () => {
      await result.current.items[0].onClick?.(alertItems, false, jest.fn(), jest.fn(), jest.fn());
    });

    expect(onAddToCase).toHaveBeenCalledWith({
      alertIds: ['alert-1', 'alert-2', 'alert-3'],
      markdownComments: ['markdown 1', 'markdown 2'],
    });
    expect(closePopover).toHaveBeenCalled();
  });

  it('reports the singular add-to-case telemetry action', async () => {
    const { result } = renderHook(() =>
      useBulkAttackCaseItems({
        telemetrySource: 'attacks_page_group_take_action',
        title,
      })
    );

    await act(async () => {
      await result.current.items[0].onClick?.(alertItems, false, jest.fn(), jest.fn(), jest.fn());
    });

    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.ActionAddedToCase, {
      source: 'attacks_page_group_take_action',
      action: 'add_to_case',
    });
  });
});
