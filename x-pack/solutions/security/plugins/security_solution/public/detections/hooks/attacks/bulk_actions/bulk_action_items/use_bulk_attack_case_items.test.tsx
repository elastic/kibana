/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useBulkAttackCaseItems } from './use_bulk_attack_case_items';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT,
} from '../constants';

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

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    useKibana.mockReturnValue({
      services: {
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

  it('should return two case items when user has permissions', () => {
    const { result } = renderHook(() => useBulkAttackCaseItems({ title: 'attack title' }), {
      wrapper,
    });

    expect(result.current.items).toHaveLength(2);
  });

  it('should return empty items when user lacks cases permissions', () => {
    useKibana.mockReturnValue({
      services: {
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

    await result.current.items[0]?.onClick?.(
      [
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
      false,
      jest.fn(),
      jest.fn(),
      jest.fn()
    );

    expect(onAddToNewCase).toHaveBeenCalledWith({
      alertIds: ['alert-1', 'alert-2', 'alert-3'],
      markdownComments: ['markdown 1', 'markdown 2'],
    });
    expect(closePopover).toHaveBeenCalledTimes(1);
  });

  it('should pass unique alert ids and markdown comments to onAddToExistingCase', async () => {
    const closePopover = jest.fn();
    const { result } = renderHook(
      () => useBulkAttackCaseItems({ title: 'attack title', closePopover }),
      {
        wrapper,
      }
    );

    await result.current.items[1]?.onClick?.(
      [
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
      false,
      jest.fn(),
      jest.fn(),
      jest.fn()
    );

    expect(onAddToExistingCase).toHaveBeenCalledWith({
      alertIds: ['alert-1', 'alert-2'],
      markdownComments: ['markdown 1', 'markdown 2'],
    });
    expect(closePopover).toHaveBeenCalledTimes(1);
  });

  it('should return empty panels', () => {
    const { result } = renderHook(() => useBulkAttackCaseItems({ title: 'attack title' }), {
      wrapper,
    });

    expect(result.current.panels).toEqual([]);
  });
});
