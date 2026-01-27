/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useBulkAttackAssigneesItems } from './use_bulk_attack_assignees_items';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { useLicense } from '../../../../../common/hooks/use_license';
import { useApplyAttackAssignees } from '../apply_actions/use_apply_attack_assignees';

jest.mock('../use_attacks_privileges');
jest.mock('../../../../../common/hooks/use_license');
jest.mock('../apply_actions/use_apply_attack_assignees');

const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;
const mockUseApplyAttackAssignees = useApplyAttackAssignees as jest.MockedFunction<
  typeof useApplyAttackAssignees
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useBulkAttackAssigneesItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });

    mockUseLicense.mockReturnValue({
      isPlatinumPlus: jest.fn().mockReturnValue(true),
    } as unknown as ReturnType<typeof useLicense>);

    mockUseApplyAttackAssignees.mockReturnValue({
      applyAssignees: jest.fn(),
    } as ReturnType<typeof useApplyAttackAssignees>);
  });

  it('should return empty items when user lacks privileges', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: false,
      hasAttackIndexWrite: true,
      loading: false,
    });

    const { result } = renderHook(() => useBulkAttackAssigneesItems(), { wrapper });

    expect(result.current.items).toEqual([]);
  });

  it('should return empty items when not platinum plus', () => {
    mockUseLicense.mockReturnValue({
      isPlatinumPlus: jest.fn().mockReturnValue(false),
    } as unknown as ReturnType<typeof useLicense>);

    const { result } = renderHook(() => useBulkAttackAssigneesItems(), { wrapper });

    expect(result.current.items).toEqual([]);
  });

  it('should return assignees items when user has privileges and platinum license', () => {
    const { result } = renderHook(() => useBulkAttackAssigneesItems(), { wrapper });

    expect(result.current.items.length).toBeGreaterThan(0);
  });

  it('should return empty panels when user lacks privileges', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: false,
      hasAttackIndexWrite: true,
      loading: false,
    });

    const { result } = renderHook(() => useBulkAttackAssigneesItems(), { wrapper });

    expect(result.current.panels).toEqual([]);
  });

  it('should return panels when user has privileges', () => {
    const { result } = renderHook(() => useBulkAttackAssigneesItems(), { wrapper });

    expect(result.current.panels.length).toBeGreaterThan(0);
  });
});
