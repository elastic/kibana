/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { UseExpandSectionParams } from './use_expand_section';
import { useExpandSection } from './use_expand_section';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');

describe('useExpandSection', () => {
  let hookResult: RenderHookResult<boolean, UseExpandSectionParams>;

  it('should return default value if nothing in localStorage', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: {
          get: () => undefined,
        },
      },
    });

    const initialProps: UseExpandSectionParams = {
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(hookResult.result.current).toBe(true);
  });

  it(`should return default value if localStorage doesn't have the correct key`, () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: {
          get: () => ({ other: false }),
        },
      },
    });
    const initialProps: UseExpandSectionParams = {
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(hookResult.result.current).toBe(true);
  });

  it('should return value from local storage', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: {
          get: () => ({ test: false }),
        },
      },
    });
    const initialProps: UseExpandSectionParams = {
      title: 'test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(hookResult.result.current).toBe(false);
  });

  it('should check against lowercase values', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: {
          get: () => ({ test: false }),
        },
      },
    });
    const initialProps: UseExpandSectionParams = {
      title: 'Test',
      defaultValue: true,
    };

    hookResult = renderHook((props: UseExpandSectionParams) => useExpandSection(props), {
      initialProps,
    });

    expect(hookResult.result.current).toBe(false);
  });
});
