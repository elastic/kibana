/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSpaceId } from './use_space_id';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

describe('useSpaceId', () => {
  it('returns undefined before the async call resolves', () => {
    mockUseKibana.mockReturnValue({
      services: {
        spaces: {
          // Never resolves so no state update fires during the synchronous assertion.
          getActiveSpace: jest.fn().mockReturnValue(new Promise(() => {})),
        },
      },
    });

    const { result } = renderHook(() => useSpaceId());

    expect(result.current).toBeUndefined();
  });

  it('returns the active space id after resolving', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        spaces: {
          getActiveSpace: jest.fn().mockResolvedValue({ id: 'my-space' }),
        },
      },
    });

    const { result } = renderHook(() => useSpaceId());

    await waitFor(() => expect(result.current).toBe('my-space'));
  });

  it('returns undefined when the spaces plugin is not available', async () => {
    mockUseKibana.mockReturnValue({
      services: { spaces: undefined },
    });

    const { result } = renderHook(() => useSpaceId());

    expect(result.current).toBeUndefined();
    // No async call is made when spaces is unavailable; state stays undefined.
    await waitFor(() => expect(result.current).toBeUndefined());
  });
});
