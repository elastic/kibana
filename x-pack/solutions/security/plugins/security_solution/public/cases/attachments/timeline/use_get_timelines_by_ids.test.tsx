/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { useGetTimelinesByIds } from './use_get_timelines_by_ids';
import { INTERNAL_TIMELINE_BY_IDS_URL } from '../../../../common/constants';

const mockPost = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  KibanaServices: {
    get: () => ({ http: { post: mockPost } }),
  },
}));

const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addError: mockAddError }),
}));

describe('useGetTimelinesByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty results without calling the API when ids is empty', async () => {
    const { result } = renderHook(() =>
      useGetTimelinesByIds({ ids: [], pageInfo: { pageIndex: 1, pageSize: 10 } })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.timelines).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('forwards ids, paging, search, and sort to the internal route and maps the response', async () => {
    mockPost.mockResolvedValue({
      timeline: [
        {
          savedObjectId: 'timeline-1',
          title: 'Investigation A',
          description: '',
          updated: 1700000000000,
          updatedBy: 'analyst',
          favorite: [],
          noteIds: [],
          pinnedEventIds: [],
        },
      ],
      totalCount: 1,
    });

    const { result } = renderHook(() =>
      useGetTimelinesByIds({
        ids: ['timeline-1'],
        pageInfo: { pageIndex: 2, pageSize: 25 },
        search: 'investigation',
        sort: { sortField: 'updated', sortOrder: 'desc' },
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [path, options] = mockPost.mock.calls[0];
    expect(path).toBe(INTERNAL_TIMELINE_BY_IDS_URL);
    expect(options.version).toBe('1');
    expect(JSON.parse(options.body)).toMatchObject({
      ids: ['timeline-1'],
      pageSize: 25,
      pageIndex: 2,
      search: 'investigation',
      sortField: 'updated',
      sortOrder: 'desc',
    });
    expect(result.current.totalCount).toBe(1);
    expect(result.current.timelines[0].savedObjectId).toBe('timeline-1');
    expect(result.current.timelines[0].title).toBe('Investigation A');
  });

  it('refetch triggers a new API call', async () => {
    mockPost.mockResolvedValue({ timeline: [], totalCount: 0 });

    const { result } = renderHook(() =>
      useGetTimelinesByIds({
        ids: ['timeline-1'],
        pageInfo: { pageIndex: 1, pageSize: 10 },
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockPost).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockPost).toHaveBeenCalledTimes(2);
  });
});
