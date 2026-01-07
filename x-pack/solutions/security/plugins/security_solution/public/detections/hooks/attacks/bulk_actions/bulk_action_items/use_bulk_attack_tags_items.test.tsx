/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useBulkAttackTagsItems } from './use_bulk_attack_tags_items';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { useApplyAttackTags } from '../apply_actions/use_apply_attack_tags';

jest.mock('../use_attacks_privileges');
jest.mock('../apply_actions/use_apply_attack_tags');

const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockUseApplyAttackTags = useApplyAttackTags as jest.MockedFunction<typeof useApplyAttackTags>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useBulkAttackTagsItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });

    mockUseApplyAttackTags.mockReturnValue({
      applyTags: jest.fn(),
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
});
