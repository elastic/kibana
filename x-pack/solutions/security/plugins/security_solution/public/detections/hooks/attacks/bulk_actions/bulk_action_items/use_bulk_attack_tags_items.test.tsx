/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useBulkAttackTagsItems } from './use_bulk_attack_tags_items';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { useApplyAttackTags } from '../apply_actions/use_apply_attack_tags';
import { BulkAlertTagsPanel } from '../../../../../common/components/toolbar/bulk_actions/alert_bulk_tags';

jest.mock('../use_attacks_privileges');
jest.mock('../apply_actions/use_apply_attack_tags');
jest.mock('../../../../../common/components/toolbar/bulk_actions/alert_bulk_tags', () => ({
  BulkAlertTagsPanel: jest.fn(() => null),
}));

const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockUseApplyAttackTags = useApplyAttackTags as jest.MockedFunction<typeof useApplyAttackTags>;
const mockBulkAlertTagsPanel = BulkAlertTagsPanel as jest.MockedFunction<typeof BulkAlertTagsPanel>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useBulkAttackTagsItems', () => {
  const mockApplyTags = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });

    mockUseApplyAttackTags.mockReturnValue({
      applyTags: mockApplyTags,
    } as ReturnType<typeof useApplyAttackTags>);
  });

  it('should return empty items when user lacks privileges', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: false,
      hasAttackIndexWrite: true,
      loading: false,
    });

    const { result } = renderHook(() => useBulkAttackTagsItems(), { wrapper });

    expect(result.current.items).toEqual([]);
  });

  it('should return empty items when loading', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: true,
    });

    const { result } = renderHook(() => useBulkAttackTagsItems(), { wrapper });

    expect(result.current.items).toEqual([]);
  });

  it('should return tags items when user has privileges', () => {
    const { result } = renderHook(() => useBulkAttackTagsItems(), { wrapper });

    expect(result.current.items.length).toBeGreaterThan(0);
  });

  it('should return empty panels when user lacks privileges', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: false,
      hasAttackIndexWrite: true,
      loading: false,
    });

    const { result } = renderHook(() => useBulkAttackTagsItems(), { wrapper });

    expect(result.current.panels).toEqual([]);
  });

  it('should return panels when user has privileges', () => {
    const { result } = renderHook(() => useBulkAttackTagsItems(), { wrapper });

    expect(result.current.panels.length).toBeGreaterThan(0);
  });

  it('should call applyTags with telemetrySource when tags are submitted', async () => {
    const { result } = renderHook(
      () => useBulkAttackTagsItems({ telemetrySource: 'attacks_page_group_take_action' }),
      { wrapper }
    );

    const panel = result.current.panels[0];
    if (panel && panel.renderContent) {
      render(
        panel.renderContent({
          alertItems: [{ _id: '1', data: [], ecs: { _id: '1' } }],
          closePopoverMenu: jest.fn(),
          setIsBulkActionsLoading: jest.fn(),
        })
      );
    }

    const onSubmit = mockBulkAlertTagsPanel.mock.calls[0][0].onSubmit;
    if (onSubmit) {
      await onSubmit({ tags_to_add: ['tag1'], tags_to_remove: ['tag2'] }, [], jest.fn(), jest.fn());
    }

    expect(mockApplyTags).toHaveBeenCalledWith(
      expect.objectContaining({
        telemetrySource: 'attacks_page_group_take_action',
      })
    );
  });
});
