/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEntityEnginePrivileges } from '../../entity_store/hooks/use_entity_engine_privileges';
import { useCanModifyResolution } from './use_can_modify_resolution';

jest.mock('../../entity_store/hooks/use_entity_engine_privileges');

const mockUseEntityEnginePrivileges = useEntityEnginePrivileges as jest.Mock;

describe('useCanModifyResolution', () => {
  it('stays unresolved while the privileges query is in flight', () => {
    mockUseEntityEnginePrivileges.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useCanModifyResolution());

    expect(result.current).toEqual({ canModify: false, isLoading: true });
  });

  it('stays unresolved when the privileges query fails', () => {
    mockUseEntityEnginePrivileges.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    const { result } = renderHook(() => useCanModifyResolution());

    expect(result.current).toEqual({ canModify: false, isLoading: true });
  });

  it('allows modification when the user has write permissions', () => {
    mockUseEntityEnginePrivileges.mockReturnValue({
      data: { has_write_permissions: true },
      isLoading: false,
    });

    const { result } = renderHook(() => useCanModifyResolution());

    expect(result.current).toEqual({ canModify: true, isLoading: false });
  });

  it('denies modification only after privileges confirm the user cannot write', () => {
    mockUseEntityEnginePrivileges.mockReturnValue({
      data: { has_write_permissions: false },
      isLoading: false,
    });

    const { result } = renderHook(() => useCanModifyResolution());

    expect(result.current).toEqual({ canModify: false, isLoading: false });
  });
});
