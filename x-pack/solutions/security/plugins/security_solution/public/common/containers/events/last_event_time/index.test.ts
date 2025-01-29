/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { useTimelineLastEventTime } from '.';
import { LastEventIndexKey } from '../../../../../common/search_strategy';
import { useKibana } from '../../../lib/kibana';

const mockSearchStrategy = jest.fn();

const mockUseKibana = {
  services: {
    data: {
      search: {
        search: mockSearchStrategy,
      },
    },
    notifications: {
      toasts: {
        addWarning: jest.fn(),
      },
    },
  },
};

jest.mock('../../../lib/kibana', () => ({
  useKibana: jest.fn(),
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    remove: jest.fn(),
  }),
}));

describe('useTimelineLastEventTime', () => {
  let searchStrategy$: BehaviorSubject<{ lastSeen: string | null; errorMessage?: string }>;

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    searchStrategy$ = new BehaviorSubject<{ lastSeen: string | null; errorMessage?: string }>({
      lastSeen: null,
    });

    mockSearchStrategy.mockReturnValue(searchStrategy$.asObservable());

    (useKibana as jest.Mock).mockReturnValue(mockUseKibana);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should init', async () => {
    const { result } = renderHook(() =>
      useTimelineLastEventTime({
        indexKey: LastEventIndexKey.hostDetails,
        details: {},
        indexNames: [],
      })
    );

    expect(result.current).toEqual([
      false,
      { errorMessage: undefined, lastSeen: null, refetch: expect.any(Function) },
    ]);
  });

  it('should call search strategy', async () => {
    renderHook(() =>
      useTimelineLastEventTime({
        indexKey: LastEventIndexKey.hostDetails,
        details: {},
        indexNames: [],
      })
    );
    await waitFor(() =>
      expect(mockSearchStrategy.mock.calls[0][0]).toEqual({
        defaultIndex: [],
        details: {},
        factoryQueryType: 'eventsLastEventTime',
        indexKey: 'hostDetails',
      })
    );
  });

  it('should set response', async () => {
    searchStrategy$.next({
      lastSeen: '1 minute ago',
    });

    const { result } = renderHook(() =>
      useTimelineLastEventTime({
        indexKey: LastEventIndexKey.hostDetails,
        details: {},
        indexNames: [],
      })
    );
    await waitFor(() => expect(result.current[1].lastSeen).toEqual('1 minute ago'));
  });
});
