/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { UseExpandSectionParams } from './use_expand_section';
import { useExpandSection } from './use_expand_section';
import { useKibana } from '../../../common/lib/kibana';

vi.mock('../../../common/lib/kibana');

describe('useExpandSection', () => {
  let hookResult: RenderHookResult<boolean, UseExpandSectionParams>;

  const STORAGE_KEY = 'test-storage-key';

  it('should return default value if nothing in localStorage', () => {
    const get = vi.fn().mockReturnValue(undefined);

    (useKibana as Mock).mockReturnValue({
      services: {
        storage: { get },
      },
    });

    const initialProps: UseExpandSectionParams = {
      storageKey: STORAGE_KEY,
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(get).toHaveBeenCalledWith(STORAGE_KEY);
    expect(hookResult.result.current).toBe(true);
  });

  it(`should return default value if localStorage doesn't have the correct key`, () => {
    const get = vi.fn().mockReturnValue({ other: false });

    (useKibana as Mock).mockReturnValue({
      services: {
        storage: { get },
      },
    });

    const initialProps: UseExpandSectionParams = {
      storageKey: STORAGE_KEY,
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(get).toHaveBeenCalledWith(STORAGE_KEY);
    expect(hookResult.result.current).toBe(true);
  });

  it('should return value from local storage', () => {
    const get = vi.fn().mockReturnValue({ test: false });

    (useKibana as Mock).mockReturnValue({
      services: {
        storage: { get },
      },
    });

    const initialProps: UseExpandSectionParams = {
      storageKey: STORAGE_KEY,
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(get).toHaveBeenCalledWith(STORAGE_KEY);
    expect(hookResult.result.current).toBe(false);
  });

  it('should check against lowercase values', () => {
    const get = vi.fn().mockReturnValue({ test: false });

    (useKibana as Mock).mockReturnValue({
      services: {
        storage: { get },
      },
    });

    const initialProps: UseExpandSectionParams = {
      storageKey: STORAGE_KEY,
      title: 'Test', // should be normalized to 'test'
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(get).toHaveBeenCalledWith(STORAGE_KEY);
    expect(hookResult.result.current).toBe(false);
  });
});
