/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataLoadingState } from '@kbn/unified-data-table';
import { act, waitFor, renderHook } from '@testing-library/react';
import type { TimelineArgs, UseTimelineEventsProps } from '.';
import * as useTimelineEventsModule from '.';
import { SecurityPageName } from '../../../common/constants';
import { TimelineId } from '../../../common/types/timeline';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { mockTimelineData } from '../../common/mock';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { useFetchNotes } from '../../notes/hooks/use_fetch_notes';

const { initSortDefault, useTimelineEvents, useTimelineEventsHandler } = useTimelineEventsModule;

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../notes/hooks/use_fetch_notes');
const onLoadMock = jest.fn();
const useFetchNotesMock = useFetchNotes as jest.Mock;

const mockEvents = structuredClone(mockTimelineData);

const mockSearch = jest.fn();

jest.mock('../../common/lib/apm/use_track_http_request');
jest.mock('../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

jest.mock('../../common/lib/kibana', () => ({
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    remove: jest.fn(),
  }),
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        capabilities: {
          siem: {
            crud: true,
          },
        },
      },
      data: {
        search: {
          search: jest.fn().mockImplementation((args) => {
            mockSearch(args);
            return {
              subscribe: jest.fn().mockImplementation(({ next }) => {
                const start = args.pagination.activePage * args.pagination.querySize;
                const end = start + args.pagination.querySize;
                const timelineOut = setTimeout(() => {
                  next({
                    isRunning: false,
                    isPartial: false,
                    inspect: {
                      dsl: [],
                      response: [],
                    },
                    edges: mockEvents.map((item) => ({ node: item })).slice(start, end),
                    pageInfo: {
                      activePage: args.pagination.activePage,
                      querySize: args.pagination.querySize,
                    },
                    rawResponse: {},
                    totalCount: mockTimelineData.length,
                  });
                }, 50);
                return {
                  unsubscribe: jest.fn(() => {
                    clearTimeout(timelineOut);
                  }),
                };
              }),
            };
          }),
        },
      },
      notifications: {
        toasts: {
          addWarning: jest.fn(),
        },
      },
    },
  }),
}));

const mockUseRouteSpy: jest.Mock = useRouteSpy as jest.Mock;
jest.mock('../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn(),
}));

mockUseRouteSpy.mockReturnValue([
  {
    pageName: SecurityPageName.overview,
    detailName: undefined,
    tabName: undefined,
    search: '',
    pathName: '/overview',
  },
]);

const startDate: string = '2020-07-07T08:20:18.966Z';
const endDate: string = '3000-01-01T00:00:00.000Z';
const props: UseTimelineEventsProps = {
  dataViewId: 'data-view-id',
  endDate,
  id: TimelineId.active,
  indexNames: ['filebeat-*'],
  fields: ['@timestamp', 'event.kind'],
  filterQuery: '',
  startDate,
  limit: 25,
  runtimeMappings: {},
  sort: initSortDefault,
  skip: false,
};

describe('useTimelineEventsHandler', () => {
  useIsExperimentalFeatureEnabledMock.mockReturnValue(false);

  beforeEach(() => {
    mockSearch.mockReset();
    useFetchNotesMock.mockClear();
    onLoadMock.mockClear();

    useFetchNotesMock.mockReturnValue({
      onLoad: onLoadMock,
    });
  });

  test('init', async () => {
    const { result } = renderHook((args) => useTimelineEvents(args), {
      initialProps: props,
    });

    expect(result.current).toEqual([
      DataLoadingState.loading,
      {
        events: [],
        id: TimelineId.active,
        inspect: expect.objectContaining({ dsl: [], response: [] }),
        loadNextBatch: expect.any(Function),
        pageInfo: expect.objectContaining({
          activePage: 0,
          querySize: 0,
        }),
        refetch: expect.any(Function),
        totalCount: -1,
        refreshedAt: 0,
      },
    ]);
  });

  test('happy path query', async () => {
    const { result, rerender } = renderHook<
      [DataLoadingState, TimelineArgs],
      UseTimelineEventsProps
    >((args) => useTimelineEvents(args), {
      initialProps: props,
    });
    // useEffect on params request
    await waitFor(() => new Promise((resolve) => resolve(null)));
    rerender({ ...props, startDate: '', endDate: '' });
    // useEffect on params request
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledTimes(2);
      expect(result.current).toEqual([
        DataLoadingState.loaded,
        {
          events: mockEvents,
          id: TimelineId.active,
          inspect: result.current[1].inspect,
          loadNextBatch: result.current[1].loadNextBatch,
          pageInfo: result.current[1].pageInfo,
          refetch: result.current[1].refetch,
          totalCount: 32,
          refreshedAt: result.current[1].refreshedAt,
        },
      ]);
    });
  });

  test('Mock cache for active timeline when switching page', async () => {
    const { result, rerender } = renderHook<
      [DataLoadingState, TimelineArgs],
      UseTimelineEventsProps
    >((args) => useTimelineEvents(args), {
      initialProps: props,
    });

    mockUseRouteSpy.mockReturnValue([
      {
        pageName: SecurityPageName.timelines,
        detailName: undefined,
        tabName: undefined,
        search: '',
        pathName: '/timelines',
      },
    ]);

    rerender({ ...props, startDate, endDate });

    await waitFor(() => {
      expect(result.current[0]).toEqual(DataLoadingState.loaded);
    });

    expect(mockSearch).toHaveBeenCalledTimes(1);

    expect(result.current).toEqual([
      DataLoadingState.loaded,
      {
        events: mockEvents,
        id: TimelineId.active,
        inspect: result.current[1].inspect,
        loadNextBatch: result.current[1].loadNextBatch,
        pageInfo: result.current[1].pageInfo,
        refetch: result.current[1].refetch,
        totalCount: 32,
        refreshedAt: result.current[1].refreshedAt,
      },
    ]);
  });

  test('Correlation pagination is calling search strategy when switching page', async () => {
    const { result, rerender } = renderHook<
      [DataLoadingState, TimelineArgs],
      UseTimelineEventsProps
    >((args) => useTimelineEvents(args), {
      initialProps: {
        ...props,
        language: 'eql',
        eqlOptions: {
          eventCategoryField: 'category',
          tiebreakerField: '',
          timestampField: '@timestamp',
          query: 'find it EQL',
          size: 100,
        },
      },
    });

    // useEffect on params request
    await waitFor(() => new Promise((resolve) => resolve(null)));
    rerender({
      ...props,
      startDate,
      endDate,
      language: 'eql',
      eqlOptions: {
        eventCategoryField: 'category',
        tiebreakerField: '',
        timestampField: '@timestamp',
        query: 'find it EQL',
        size: 100,
      },
    });
    // useEffect on params request
    await waitFor(() => new Promise((resolve) => resolve(null)));
    mockSearch.mockReset();
    act(() => {
      result.current[1].loadNextBatch();
    });
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
  });

  describe('fields', () => {
    test('should query again when a new field is added', async () => {
      const { rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: props,
      });

      // useEffect on params request
      await waitFor(() => new Promise((resolve) => resolve(null)));
      rerender({ ...props, startDate, endDate });
      // useEffect on params request
      await waitFor(() => new Promise((resolve) => resolve(null)));

      expect(mockSearch).toHaveBeenCalledTimes(1);
      mockSearch.mockClear();

      rerender({
        ...props,
        startDate,
        endDate,
        fields: ['@timestamp', 'event.kind', 'event.category'],
      });

      await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    });

    test('should not query again when a field is removed', async () => {
      const { rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: props,
      });

      // useEffect on params request
      await waitFor(() => new Promise((resolve) => resolve(null)));
      rerender({ ...props, startDate, endDate });
      // useEffect on params request
      await waitFor(() => new Promise((resolve) => resolve(null)));

      expect(mockSearch).toHaveBeenCalledTimes(1);
      mockSearch.mockClear();

      rerender({ ...props, startDate, endDate, fields: ['@timestamp'] });

      await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(0));
    });
    test('should not query again when a removed field is added back', async () => {
      const { rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: props,
      });

      // useEffect on params request
      await waitFor(() => new Promise((resolve) => resolve(null)));
      rerender({ ...props, startDate, endDate });
      // useEffect on params request
      await waitFor(() => new Promise((resolve) => resolve(null)));

      expect(mockSearch).toHaveBeenCalledTimes(1);
      mockSearch.mockClear();

      // remove `event.kind` from default fields
      rerender({ ...props, startDate, endDate, fields: ['@timestamp'] });

      await waitFor(() => new Promise((resolve) => resolve(null)));

      expect(mockSearch).toHaveBeenCalledTimes(0);

      // request default Fields
      rerender({ ...props, startDate, endDate });

      // since there is no new update in useEffect, it should throw an timeout error
      // await expect(waitFor(() => null)).rejects.toThrowError();
      await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(0));
    });
  });

  describe('batching', () => {
    test('should broadcast correct loading state based on the batch being fetched', async () => {
      const { result } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loading);
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
      });

      act(() => {
        result.current[1].loadNextBatch();
      });

      expect(result.current[0]).toBe(DataLoadingState.loadingMore);

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
      });
    });
    test('should request cumulative data of all the batches when next batch has been requested', async () => {
      const { result } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
        );
      });

      mockSearch.mockClear();
      act(() => {
        result.current[1].loadNextBatch();
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
        expect(mockSearch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ pagination: { activePage: 0, querySize: 50 } })
        );
      });

      mockSearch.mockClear();
      act(() => {
        result.current[1].loadNextBatch();
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
        expect(mockSearch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ pagination: { activePage: 0, querySize: 75 } })
        );
      });
    });
    test('should fetch new columns data for the all the batches ', async () => {
      const { result, rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
      });

      ////////
      // fetch 3 batches before requesting new column
      ////////
      act(() => {
        result.current[1].loadNextBatch();
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
      });

      act(() => {
        result.current[1].loadNextBatch();
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
      });
      ///////

      rerender({ ...props, fields: [...props.fields, 'new_column'] });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            fields: ['@timestamp', 'event.kind', 'new_column'],
            pagination: { activePage: 0, querySize: 75 },
          })
        );
      });
    });
    test('should reset batch to 0th when the data is `refetched`', async () => {
      const { result } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      act(() => {
        result.current[1].loadNextBatch();
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ pagination: { activePage: 0, querySize: 50 } })
        );
      });

      mockSearch.mockClear();

      act(() => {
        result.current[1].refetch();
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledTimes(1);
        expect(mockSearch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
        );
      });
    });

    test('should query all batches when new column is added', async () => {
      const { result, rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
        );
      });
      mockSearch.mockClear();

      act(() => {
        result.current[1].loadNextBatch();
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ pagination: { activePage: 1, querySize: 25 } })
        );
      });

      mockSearch.mockClear();

      rerender({ ...props, fields: [...props.fields, 'new_column'] });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ pagination: { activePage: 0, querySize: 50 } })
        );
      });
      mockSearch.mockClear();

      act(() => {
        result.current[1].loadNextBatch();
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ pagination: { activePage: 2, querySize: 25 } })
        );
      });
    });

    test.only('should combine batches correctly when new column is added', async () => {
      const { result, rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props, limit: 5 },
      });

      await waitFor(() => {
        expect(result.current[1].events.length).toBe(5);
      });

      act(() => {
        result.current[1].loadNextBatch();
      });

      await waitFor(() => {
        expect(result.current[1].events.length).toBe(10);
      });
    });
  });
});

describe.skip('useTimelineEvents', () => {
  const mockUseTimelineEventsHandler = jest.spyOn(
    useTimelineEventsModule,
    'useTimelineEventsHandler'
  );

  const mockSearchOutput = {
    isRunning: false,
    isPartial: false,
    inspect: {
      dsl: [],
      response: [],
    },
    edges: mockEvents.map((item) => ({ node: item })),
    pageInfo: {
      activePage: 0,
      querySize: 10,
    },
    rawResponse: {},
    totalCount: mockTimelineData.length,
  };
  beforeEach(() => {
    mockUseTimelineEventsHandler.mockReturnValue([DataLoadingState.loaded, mockSearchOutput]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should process Events PerPage correctly', async () => {
    // default events per Batch = 10
    const { result, rerender } = renderHook((args) => useTimelineEvents(args), {
      initialProps: { ...props, limit: 10 },
    });

    await waitFor(() => {
      expect(result.current[1].events.length).toEqual(mockEvents.length);
    });

    // return second page.
    const secondPageMockOutput = {
      ...mockSearchOutput,
      pageInfo: {
        activePage: 1,
        querySize: 10,
      },
    };

    console.log(`should be `, { secondPageMockOutput });
    mockUseTimelineEventsHandler.mockImplementation(() => [
      DataLoadingState.loaded,
      secondPageMockOutput,
    ]);

    rerender({ ...props, limit: 10 });

    await waitFor(() => {
      expect(result.current[1].events.length).toEqual(mockEvents.length * 2);
    });
    /////////
    // return third page.
    const thirdPageMockOutput = {
      ...mockSearchOutput,
      pageInfo: {
        activePage: 2,
        querySize: 10,
      },
    };

    mockUseTimelineEventsHandler.mockReturnValue([DataLoadingState.loaded, secondPageMockOutput]);

    rerender({ ...props, limit: 10 });

    expect(result.current[1].events.length).toEqual(mockEvents.length * 3);

    /////////
  });
});
