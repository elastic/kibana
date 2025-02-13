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
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { useFetchNotes } from '../../notes/hooks/use_fetch_notes';
import { useKibana } from '../../common/lib/kibana';
import { getMockTimelineSearchSubscription } from '../../common/mock/mock_timeline_search_service';

const { initSortDefault, useTimelineEvents } = useTimelineEventsModule;

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
          securitySolutionTimeline: {
            crud: true,
          },
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
  filterQuery: '*',
  startDate,
  limit: 25,
  runtimeMappings: {},
  sort: initSortDefault,
  skip: false,
};

const { mockTimelineSearchSubscription: mockSearchSubscription, mockSearchWithArgs: mockSearch } =
  getMockTimelineSearchSubscription();

const loadNextBatch = async (result: { current: [DataLoadingState, TimelineArgs] }) => {
  act(() => {
    result.current[1].loadNextBatch();
  });

  await waitFor(() => {
    expect(result.current[0]).toBe(DataLoadingState.loadingMore);
  });

  await waitFor(() => {
    expect(result.current[0]).toBe(DataLoadingState.loaded);
  });
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

    (useKibana as jest.Mock).mockReturnValue({
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
            search: mockSearchSubscription,
          },
        },
        notifications: {
          toasts: {
            addWarning: jest.fn(),
          },
        },
      },
    });
  });

  test('should init empty response', async () => {
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

  test('should make events search request correctly', async () => {
    const { result } = renderHook<[DataLoadingState, TimelineArgs], UseTimelineEventsProps>(
      (args) => useTimelineEvents(args),
      {
        initialProps: props,
      }
    );
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
      );
      expect(result.current[1].events).toHaveLength(25);
      expect(result.current).toEqual([
        DataLoadingState.loaded,
        {
          events: expect.any(Array),
          id: TimelineId.active,
          inspect: result.current[1].inspect,
          loadNextBatch: result.current[1].loadNextBatch,
          pageInfo: {
            activePage: 0,
            querySize: 25,
          },
          refetch: result.current[1].refetch,
          totalCount: 32,
          refreshedAt: result.current[1].refreshedAt,
        },
      ]);
    });
  });

  test('should mock cache for active timeline when switching page', async () => {
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

    expect(result.current[1].events).toHaveLength(25);

    expect(result.current).toEqual([
      DataLoadingState.loaded,
      {
        events: expect.any(Array),
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

  describe('error/invalid states', () => {
    const uniqueError = 'UNIQUE_ERROR';
    const onError = jest.fn();
    const mockSubscribeWithError = jest.fn(({ error }) => {
      error(uniqueError);
    });

    beforeEach(() => {
      onError.mockClear();
      mockSubscribeWithError.mockClear();

      (useKibana as jest.Mock).mockReturnValue({
        services: {
          data: {
            search: {
              search: () => ({
                subscribe: jest.fn().mockImplementation(({ error }) => {
                  const requestTimeout = setTimeout(() => {
                    mockSubscribeWithError({ error });
                  }, 100);

                  return {
                    unsubscribe: () => {
                      clearTimeout(requestTimeout);
                    },
                  };
                }),
              }),
              showError: onError,
            },
          },
        },
      });
    });

    test('should broadcast correct loading state when request throws error', async () => {
      const { result } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      expect(result.current[0]).toBe(DataLoadingState.loading);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(uniqueError);
        expect(result.current[0]).toBe(DataLoadingState.loaded);
      });
    });
    test('should should not fire any request when indexName is empty', async () => {
      const { result } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props, indexNames: [] },
      });

      await waitFor(() => {
        expect(mockSearch).not.toHaveBeenCalled();
        expect(result.current[0]).toBe(DataLoadingState.loaded);
      });
    });
  });

  describe('fields', () => {
    test('should query again when a new field is added', async () => {
      const { rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: props,
      });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledTimes(1);
      });

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

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledTimes(1);
      });
      mockSearch.mockClear();

      rerender({ ...props, fields: ['@timestamp'] });

      await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(0));
    });
    test('should not query again when a removed field is added back', async () => {
      const { rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: props,
      });

      expect(mockSearch).toHaveBeenCalledTimes(1);
      mockSearch.mockClear();

      // remove `event.kind` from default fields
      rerender({ ...props, fields: ['@timestamp'] });

      await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(0));

      // request default Fields
      rerender({ ...props });

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

    test('should request incremental batches when next batch has been requested', async () => {
      const { result } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
        expect(mockSearch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
        );
      });

      expect(mockSearch).toHaveBeenCalledTimes(1);

      mockSearch.mockClear();

      await loadNextBatch(result);

      await waitFor(() => {
        expect(mockSearch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ pagination: { activePage: 1, querySize: 25 } })
        );
      });

      mockSearch.mockClear();

      await loadNextBatch(result);

      await waitFor(() => {
        expect(mockSearch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ pagination: { activePage: 2, querySize: 25 } })
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
      // fetch 2 more batches before requesting new column
      ////////
      await loadNextBatch(result);

      await loadNextBatch(result);
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

    describe('refetching', () => {
      /*
       * Below are some use cases where refetch is triggered :
       *
       *  - When user triggers a manual refresh of the data
       *  - When user updates an event, which triggers a refresh of the data
       *    - For example, when alert status is updated.
       *  - When user adds a new column
       *
       */

      test('should fetch first batch again when refetch is triggered', async () => {
        const { result } = renderHook((args) => useTimelineEvents(args), {
          initialProps: { ...props, timerangeKind: 'absolute' } as UseTimelineEventsProps,
        });

        await waitFor(() => {
          expect(mockSearch).toHaveBeenCalledWith(
            expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
          );
        });

        mockSearch.mockClear();

        act(() => {
          result.current[1].refetch();
        });

        await waitFor(() => {
          expect(mockSearch).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
          );
        });
      });

      test('should fetch first batch again when refetch is triggered with relative timerange', async () => {
        const { result } = renderHook((args) => useTimelineEvents(args), {
          initialProps: { ...props, timerangeKind: 'relative' } as UseTimelineEventsProps,
        });

        await waitFor(() => {
          expect(mockSearch).toHaveBeenCalledWith(
            expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
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

      test('should fetch first batch again when refetch is triggered when user has already fetched multiple batches', async () => {
        const { result } = renderHook((args) => useTimelineEvents(args), {
          initialProps: { ...props },
        });

        await waitFor(() => {
          expect(mockSearch).toHaveBeenCalledWith(
            expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
          );
        });

        mockSearch.mockClear();

        await loadNextBatch(result);

        await waitFor(() => {
          expect(mockSearch).toHaveBeenCalledWith(
            expect.objectContaining({ pagination: { activePage: 1, querySize: 25 } })
          );
        });

        mockSearch.mockClear();

        act(() => {
          result.current[1].refetch();
        });

        await waitFor(() => {
          expect(mockSearch).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
          );
        });
      });
    });

    describe('sort', () => {
      test('should fetch first batch again when sort is updated', async () => {
        const { result, rerender } = renderHook((args) => useTimelineEvents(args), {
          initialProps: { ...props } as UseTimelineEventsProps,
        });

        await waitFor(() => {
          expect(mockSearch).toHaveBeenCalledWith(
            expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
          );
        });

        act(() => {
          result.current[1].loadNextBatch();
        });

        await waitFor(() => {
          expect(result.current[0]).toBe(DataLoadingState.loaded);
          expect(mockSearch).toHaveBeenCalledWith(
            expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
          );
        });

        mockSearch.mockClear();

        act(() => {
          rerender({
            ...props,
            sort: [...initSortDefault, { ...initSortDefault[0], field: 'event.kind' }],
          });
        });

        await waitFor(() => {
          expect(mockSearch).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ pagination: { activePage: 0, querySize: 25 } })
          );
        });
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

      await loadNextBatch(result);

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

      await loadNextBatch(result);

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ pagination: { activePage: 2, querySize: 25 } })
        );
      });
    });

    test('should combine batches correctly when new column is added', async () => {
      const { result, rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props, limit: 5 },
      });

      await waitFor(() => {
        expect(result.current[1].events.length).toBe(5);
      });

      //////////////////////
      // Batch 2
      await loadNextBatch(result);
      await waitFor(() => {
        expect(result.current[1].events.length).toBe(10);
      });
      //////////////////////

      //////////////////////
      // Batch 3
      await loadNextBatch(result);
      await waitFor(() => {
        expect(result.current[1].events.length).toBe(15);
      });
      //////////////////////

      ///////////////////////////////////////////
      // add new column
      // Fetch all 3 batches together
      rerender({ ...props, limit: 5, fields: [...props.fields, 'new_column'] });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loadingMore);
      });

      // should fetch all the records together
      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
        expect(result.current[1].events.length).toBe(15);
        expect(result.current[1].pageInfo).toMatchObject({
          activePage: 0,
          querySize: 15,
        });
      });
      ///////////////////////////////////////////

      //////////////////////
      // subsequent batch should be fetched incrementally
      // Batch 4
      await loadNextBatch(result);

      await waitFor(() => {
        expect(result.current[1].events.length).toBe(20);
        expect(result.current[1].pageInfo).toMatchObject({
          activePage: 3,
          querySize: 5,
        });
      });
      //////////////////////

      //////////////////////
      // Batch 5
      await loadNextBatch(result);

      await waitFor(() => {
        expect(result.current[1].events.length).toBe(25);
        expect(result.current[1].pageInfo).toMatchObject({
          activePage: 4,
          querySize: 5,
        });
      });
      //////////////////////
    });

    test('should request 0th batch when batchSize is changed', async () => {
      const { result, rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props, limit: 5 },
      });

      //////////////////////
      // Batch 2
      await loadNextBatch(result);

      //////////////////////
      // Batch 3
      await loadNextBatch(result);

      mockSearch.mockClear();

      // change the batch size
      rerender({ ...props, limit: 10 });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ pagination: { activePage: 0, querySize: 10 } })
        );
      });
    });

    test('should return correct list of events ( 0th batch ) when batchSize is changed', async () => {
      const { result, rerender } = renderHook((args) => useTimelineEvents(args), {
        initialProps: { ...props, limit: 5 },
      });

      //////////////////////
      // Batch 2
      await loadNextBatch(result);

      //////////////////////
      // Batch 3
      await loadNextBatch(result);

      // change the batch size
      rerender({ ...props, limit: 10 });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loading);
      });

      await waitFor(() => {
        expect(result.current[0]).toBe(DataLoadingState.loaded);
        expect(result.current[1].events.length).toBe(10);
      });
    });
  });
});
