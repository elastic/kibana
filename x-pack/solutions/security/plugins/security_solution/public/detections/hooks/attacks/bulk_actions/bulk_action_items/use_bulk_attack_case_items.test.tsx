/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useBulkAttackCaseItems } from './use_bulk_attack_case_items';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT,
} from '../constants';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';

const submitCaseAction = async ({
  panel,
  alertItems,
  actionTestSubj = 'attack-add-to-new-case',
}: {
  panel: NonNullable<ReturnType<typeof useBulkAttackCaseItems>['panels'][number]>;
  alertItems: TimelineItem[];
  actionTestSubj?: string;
}) => {
  render(
    panel.renderContent({
      alertItems,
      setIsBulkActionsLoading: jest.fn(),
      closePopoverMenu: jest.fn(),
    })
  );
  expect(screen.getByTestId('add-to-case-submit')).toBeDisabled();
  await userEvent.click(screen.getByTestId(actionTestSubj));
  await userEvent.click(screen.getByTestId('add-to-case-submit'));
};

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock(
  '../../../../../attack_discovery/pages/results/take_action/use_add_to_existing_case',
  () => ({
    useAddToExistingCase: jest.fn(),
  })
);
jest.mock('../../../../../attack_discovery/pages/results/take_action/use_add_to_case', () => ({
  useAddToNewCase: jest.fn(),
}));

const { useKibana } = jest.requireMock('../../../../../common/lib/kibana') as {
  useKibana: jest.Mock;
};
const { useAddToExistingCase } = jest.requireMock(
  '../../../../../attack_discovery/pages/results/take_action/use_add_to_existing_case'
) as { useAddToExistingCase: jest.Mock };
const { useAddToNewCase } = jest.requireMock(
  '../../../../../attack_discovery/pages/results/take_action/use_add_to_case'
) as { useAddToNewCase: jest.Mock };

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useBulkAttackCaseItems', () => {
  const onAddToNewCase = jest.fn();
  const onAddToExistingCase = jest.fn();
  const reportEventMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    reportEventMock.mockClear();
    queryClient = new QueryClient();

    useKibana.mockReturnValue({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
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

    useAddToNewCase.mockReturnValue({
      disabled: false,
      onAddToNewCase,
    });

    useAddToExistingCase.mockReturnValue({
      disabled: false,
      onAddToExistingCase,
    });
  });

  it('should return an add-to-case item and case type panel when user has permissions', () => {
    const { result } = renderHook(() => useBulkAttackCaseItems({ title: 'attack title' }), {
      wrapper,
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.panels).toHaveLength(1);
  });

  it('should return empty items when user lacks cases permissions', () => {
    useKibana.mockReturnValue({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
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

    const { result } = renderHook(() => useBulkAttackCaseItems({ title: 'attack title' }), {
      wrapper,
    });

    expect(result.current.items).toEqual([]);
  });

  it('should pass unique alert ids and markdown comments to onAddToNewCase', async () => {
    const closePopover = jest.fn();
    const { result } = renderHook(
      () => useBulkAttackCaseItems({ title: 'attack title', closePopover }),
      {
        wrapper,
      }
    );

    await submitCaseAction({
      panel: result.current.panels[0],
      alertItems: [
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
      ],
    });

    expect(onAddToNewCase).toHaveBeenCalledWith({
      alertIds: ['alert-1', 'alert-2', 'alert-3'],
      markdownComments: ['markdown 1', 'markdown 2'],
    });
    expect(closePopover).toHaveBeenCalledTimes(1);
  });

  it('should report ActionAddedToCase event when adding to new case', async () => {
    const { result } = renderHook(
      () =>
        useBulkAttackCaseItems({
          title: 'attack title',
          telemetrySource: 'attacks_page_group_take_action',
        }),
      {
        wrapper,
      }
    );

    await submitCaseAction({
      panel: result.current.panels[0],
      alertItems: [
        {
          _id: 'attack-1',
          data: [],
          ecs: { _id: 'attack-1' },
        },
      ],
    });

    expect(reportEventMock).toHaveBeenCalledWith(AttacksEventTypes.ActionAddedToCase, {
      source: 'attacks_page_group_take_action',
      action: 'add_to_new_case',
    });
  });

  it('should pass unique alert ids and markdown comments to onAddToExistingCase', async () => {
    const closePopover = jest.fn();
    const { result } = renderHook(
      () => useBulkAttackCaseItems({ title: 'attack title', closePopover }),
      {
        wrapper,
      }
    );

    await submitCaseAction({
      panel: result.current.panels[0],
      actionTestSubj: 'attack-add-to-existing-case',
      alertItems: [
        {
          _id: 'attack-1',
          data: [
            { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-1'] },
            { field: ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT, value: ['markdown 1'] },
          ],
          ecs: { _id: 'attack-1' },
        },
        {
          _id: 'attack-2',
          data: [
            { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-2'] },
            { field: ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT, value: ['markdown 2'] },
          ],
          ecs: { _id: 'attack-2' },
        },
      ],
    });

    expect(onAddToExistingCase).toHaveBeenCalledWith({
      alertIds: ['alert-1', 'alert-2'],
      markdownComments: ['markdown 1', 'markdown 2'],
    });
    expect(closePopover).toHaveBeenCalledTimes(1);
  });

  it('should report ActionAddedToCase event when adding to existing case', async () => {
    const { result } = renderHook(
      () =>
        useBulkAttackCaseItems({
          title: 'attack title',
          telemetrySource: 'attacks_page_group_take_action',
        }),
      {
        wrapper,
      }
    );

    await submitCaseAction({
      panel: result.current.panels[0],
      actionTestSubj: 'attack-add-to-existing-case',
      alertItems: [
        {
          _id: 'attack-1',
          data: [],
          ecs: { _id: 'attack-1' },
        },
      ],
    });

    expect(reportEventMock).toHaveBeenCalledWith(AttacksEventTypes.ActionAddedToCase, {
      source: 'attacks_page_group_take_action',
      action: 'add_to_existing_case',
    });
  });

  it('should return the case type panel', () => {
    const { result } = renderHook(() => useBulkAttackCaseItems({ title: 'attack title' }), {
      wrapper,
    });

    expect(result.current.panels).toHaveLength(1);
  });
});
