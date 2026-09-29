/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useKibanaSpace } from '../../../hooks/use_kibana_space';
import { useGetUrlParams } from './use_url_params';
import { useUrlSpaceId } from './use_url_space_id';

vi.mock('../../../hooks/use_kibana_space', () => {
      const mocked = {
      useKibanaSpace: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_url_params', () => {
      const mocked = {
      useGetUrlParams: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('useUrlSpaceId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the spaceId when it differs from the active space', () => {
    (useKibanaSpace as Mock).mockReturnValue({ space: { id: 'default' } });
    (useGetUrlParams as Mock).mockReturnValue({ spaceId: 'team-a' });

    const { result } = renderHook(() => useUrlSpaceId());

    expect(result.current).toBe('team-a');
  });

  it('returns undefined when spaceId matches the active space', () => {
    (useKibanaSpace as Mock).mockReturnValue({ space: { id: 'team-a' } });
    (useGetUrlParams as Mock).mockReturnValue({ spaceId: 'team-a' });

    const { result } = renderHook(() => useUrlSpaceId());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when spaceId is missing from the URL', () => {
    (useKibanaSpace as Mock).mockReturnValue({ space: { id: 'default' } });
    (useGetUrlParams as Mock).mockReturnValue({});

    const { result } = renderHook(() => useUrlSpaceId());

    expect(result.current).toBeUndefined();
  });

  it('returns the spaceId when the active space is not yet resolved', () => {
    (useKibanaSpace as Mock).mockReturnValue({ space: undefined });
    (useGetUrlParams as Mock).mockReturnValue({ spaceId: 'team-a' });

    const { result } = renderHook(() => useUrlSpaceId());

    expect(result.current).toBe('team-a');
  });
});
