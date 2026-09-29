/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import { useRefetchOnTimelineClose } from './use_refetch_on_timeline_close';

const mockRefetch = vi.fn();

// Controls what the mocked useSelector returns for { show }.
let mockShow = false;

vi.mock('react-redux-v7', () => {
  const mocked = {
    useSelector: (selector: (s: unknown) => unknown) => selector({}),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../timelines/store/selectors', () => {
  const mocked = {
    getTimelineShowStatusByIdSelector: () => () => ({ show: mockShow }),
  };
  return { ...mocked, default: mocked };
});

describe('useRefetchOnTimelineClose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShow = false;
  });

  it('does not call refetch on mount', () => {
    mockShow = false;
    renderHook(() => useRefetchOnTimelineClose(mockRefetch));
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('does not call refetch when timeline becomes visible', () => {
    mockShow = false;
    const { rerender } = renderHook(() => useRefetchOnTimelineClose(mockRefetch));

    act(() => {
      mockShow = true;
    });
    rerender();

    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('calls refetch when timeline transitions from visible to hidden', () => {
    mockShow = true;
    const { rerender } = renderHook(() => useRefetchOnTimelineClose(mockRefetch));

    act(() => {
      mockShow = false;
    });
    rerender();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not call refetch when timeline stays hidden', () => {
    mockShow = false;
    const { rerender } = renderHook(() => useRefetchOnTimelineClose(mockRefetch));

    rerender();
    rerender();

    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
