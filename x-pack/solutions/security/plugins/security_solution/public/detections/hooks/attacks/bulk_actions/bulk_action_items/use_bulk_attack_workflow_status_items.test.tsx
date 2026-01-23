/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useBulkAttackWorkflowStatusItems } from './use_bulk_attack_workflow_status_items';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { useApplyAttackWorkflowStatus } from '../apply_actions/use_apply_attack_workflow_status';

jest.mock('../use_attacks_privileges');
jest.mock('../apply_actions/use_apply_attack_workflow_status');

const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockUseApplyAttackWorkflowStatus = useApplyAttackWorkflowStatus as jest.MockedFunction<
  typeof useApplyAttackWorkflowStatus
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useBulkAttackWorkflowStatusItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });

    mockUseApplyAttackWorkflowStatus.mockReturnValue({
      applyWorkflowStatus: jest.fn(),
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

  it('should return empty panels array', () => {
    const { result } = renderHook(() => useBulkAttackWorkflowStatusItems(), { wrapper });

    expect(result.current.panels).toEqual([]);
  });
});
