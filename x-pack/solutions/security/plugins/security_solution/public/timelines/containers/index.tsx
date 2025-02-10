/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Subscription } from 'rxjs';

import type { DataView } from '@kbn/data-plugin/common';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { DataLoadingState } from '@kbn/unified-data-table';
import type {
  TimelineEqlRequestOptionsInput,
  TimelineEventsAllOptionsInput,
} from '@kbn/timelines-plugin/common/api/search_strategy';
import type { ESQuery } from '../../../common/typed_json';

import type { inputsModel } from '../../common/store';
import type { RunTimeMappings } from '../../sourcerer/store/model';
import { useKibana } from '../../common/lib/kibana';
import { createFilter } from '../../common/containers/helpers';
import { timelineActions } from '../store';
import { detectionsTimelineIds } from './helpers';
import { getInspectResponse } from '../../helpers';
import type {
  PaginationInputPaginated,
  TimelineEventsAllStrategyResponse,
  TimelineEdges,
  TimelineItem,
  TimelineRequestSortField,
} from '../../../common/search_strategy';
import { Direction, TimelineEventsQueries } from '../../../common/search_strategy';
import type { InspectResponse } from '../../types';
import type { KueryFilterQueryKind } from '../../../common/types/timeline';
import { TimelineId } from '../../../common/types/timeline';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { activeTimeline } from './active_timeline_context';
import type {
  EqlOptions,
  TimelineEqlResponse,
} from '../../../common/search_strategy/timeline/events/eql';
import { useTrackHttpRequest } from '../../common/lib/apm/use_track_http_request';
import { APP_UI_ID } from '../../../common/constants';

export interface TimelineArgs {
  events: TimelineItem[];
  id: string;
  inspect: InspectResponse;

  /**
   * `loadNextBatch` loads the next page/batch of records.
   * This is different from the data grid pages. Data grid pagination is only
   * client side and changing data grid pages does not impact this function.
   *
   * When user manually requests next batch of records, then a next batch is fetched
   * irrespective of where user is in Data grid pagination.
   *
   */
  loadNextBatch: LoadPage;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  refetch: inputsModel.Refetch;
  totalCount: number;
  refreshedAt: number;
}

type OnNextResponseHandler = (response: TimelineArgs) => Promise<void> | void;

type TimelineEventsSearchHandler = (onNextResponse?: OnNextResponseHandler) => void;

type LoadPage = () => void;

type TimelineRequest<T extends KueryFilterQueryKind> = T extends 'kuery'
  ? TimelineEventsAllOptionsInput
  : T extends 'lucene'
  ? TimelineEventsAllOptionsInput
  : T extends 'eql'
  ? TimelineEqlRequestOptionsInput
  : TimelineEventsAllOptionsInput;

type TimelineResponse<T extends KueryFilterQueryKind> = T extends 'kuery'
  ? TimelineEventsAllStrategyResponse
  : T extends 'lucene'
  ? TimelineEventsAllStrategyResponse
  : T extends 'eql'
  ? TimelineEqlResponse
  : TimelineEventsAllStrategyResponse;

export interface UseTimelineEventsProps {
  dataViewId: string | null;
  endDate?: string;
  eqlOptions?: EqlOptions;
  fields: string[];
  filterQuery?: ESQuery | string;
  id: string;
  indexNames: string[];
  language?: KueryFilterQueryKind;
  limit: number;
  runtimeMappings: RunTimeMappings;
  skip?: boolean;
  sort?: TimelineRequestSortField[];
  startDate?: string;
  timerangeKind?: 'absolute' | 'relative';
  fetchNotes?: boolean;
}

const getTimelineEvents = (timelineEdges: TimelineEdges[]): TimelineItem[] =>
  timelineEdges.map((e: TimelineEdges) => e.node);

const ID = 'timelineEventsQuery';
export const initSortDefault: TimelineRequestSortField[] = [
  {
    field: '@timestamp',
    direction: Direction.asc,
    type: 'date',
    esTypes: ['date'],
  },
];

const deStructureEqlOptions = (eqlOptions?: EqlOptions) => ({
  ...(!isEmpty(eqlOptions?.eventCategoryField)
    ? {
        eventCategoryField: eqlOptions?.eventCategoryField,
      }
    : {}),
  ...(!isEmpty(eqlOptions?.size)
    ? {
        size: eqlOptions?.size,
      }
    : {}),
  ...(!isEmpty(eqlOptions?.tiebreakerField)
    ? {
        tiebreakerField: eqlOptions?.tiebreakerField,
      }
    : {}),
  ...(!isEmpty(eqlOptions?.timestampField)
    ? {
        timestampField: eqlOptions?.timestampField,
      }
    : {}),
});

export const useTimelineEventsHandler = ({
  dataViewId,
  endDate,
  eqlOptions = undefined,
  id = ID,
  indexNames,
  fields,
  filterQuery,
  runtimeMappings,
  startDate,
  language = 'kuery',
  limit,
  sort = initSortDefault,
  skip = false,
  timerangeKind,
}: UseTimelineEventsProps): [DataLoadingState, TimelineArgs, TimelineEventsSearchHandler] => {
  const [{ pageName }] = useRouteSpy();
  const dispatch = useDispatch();
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState<DataLoadingState>(DataLoadingState.loaded);
  const [activeBatch, setActiveBatch] = useState(
    id === TimelineId.active ? activeTimeline.getActivePage() : 0
  );
  const [timelineRequest, setTimelineRequest] = useState<TimelineRequest<typeof language> | null>(
    null
  );
  const prevTimelineRequest = useRef<TimelineRequest<typeof language> | null>(null);
  const { startTracking } = useTrackHttpRequest();

  const clearSignalsState = useCallback(() => {
    if (id != null && detectionsTimelineIds.some((timelineId) => timelineId === id)) {
      dispatch(timelineActions.clearEventsLoading({ id }));
      dispatch(timelineActions.clearEventsDeleted({ id }));
    }
  }, [dispatch, id]);

  /**
   * `loadBatchHandler` loads the next batch of records.
   * This is different from the data grid pages. Data grid pagination is only
   * client side and changing data grid pages does not impact this function.
   *
   * When user manually requests next batch of records, then a next batch is fetched
   * irrespective of where user is in Data grid pagination.
   *
   */
  const loadBatchHandler = useCallback(
    (newActiveBatch: number) => {
      clearSignalsState();

      if (id === TimelineId.active) {
        activeTimeline.setActivePage(newActiveBatch);
      }

      setActiveBatch(newActiveBatch);
    },
    [clearSignalsState, id]
  );

  const loadNextBatch = useCallback(() => {
    loadBatchHandler(activeBatch + 1);
  }, [activeBatch, loadBatchHandler]);

  useEffect(() => {
    return () => {
      searchSubscription$.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // when batch size changes, refetch DataGrid
    setActiveBatch(0);
  }, [limit]);

  const [timelineResponse, setTimelineResponse] = useState<TimelineArgs>({
    id,
    inspect: {
      dsl: [],
      response: [],
    },
    refetch: () => {},
    totalCount: -1,
    pageInfo: {
      activePage: 0,
      querySize: 0,
    },
    events: [],
    loadNextBatch,
    refreshedAt: 0,
  });

  const timelineSearch = useCallback(
    async (
      request: TimelineRequest<typeof language> | null,
      onNextHandler?: OnNextResponseHandler
    ) => {
      if (request == null || pageName === '' || skip) {
        return;
      }

      const asyncSearch = async () => {
        prevTimelineRequest.current = request;
        abortCtrl.current = new AbortController();

        if (activeBatch === 0) {
          setLoading(DataLoadingState.loading);
        } else {
          setLoading(DataLoadingState.loadingMore);
        }
        const { endTracking } = startTracking({ name: `${APP_UI_ID} timeline events search` });
        searchSubscription$.current = data.search
          .search<TimelineRequest<typeof language>, TimelineResponse<typeof language>>(request, {
            strategy:
              request.language === 'eql' ? 'timelineEqlSearchStrategy' : 'timelineSearchStrategy',
            abortSignal: abortCtrl.current.signal,
            // we only need the id to throw better errors
            indexPattern: { id: dataViewId } as unknown as DataView,
          })
          .subscribe({
            next: (response) => {
              if (!isRunningResponse(response)) {
                endTracking('success');

                setLoading(DataLoadingState.loaded);
                setTimelineResponse((prevResponse) => {
                  const newTimelineResponse = {
                    ...prevResponse,
                    /**/
                    events: getTimelineEvents(response.edges),
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    pageInfo: response.pageInfo,
                    totalCount: response.totalCount,
                    refreshedAt: Date.now(),
                  };
                  if (id === TimelineId.active) {
                    activeTimeline.setPageName(pageName);
                    if (request.language === 'eql') {
                      activeTimeline.setEqlRequest(request as TimelineEqlRequestOptionsInput);
                      activeTimeline.setEqlResponse(newTimelineResponse);
                    } else {
                      activeTimeline.setRequest(request);
                      activeTimeline.setResponse(newTimelineResponse);
                    }
                  }
                  if (onNextHandler) onNextHandler(newTimelineResponse);
                  return newTimelineResponse;
                });

                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              endTracking(abortCtrl.current.signal.aborted ? 'aborted' : 'error');

              setLoading(DataLoadingState.loaded);
              data.search.showError(msg);
              searchSubscription$.current.unsubscribe();
            },
          });
      };

      if (
        id === TimelineId.active &&
        activeTimeline.getPageName() !== '' &&
        pageName !== activeTimeline.getPageName()
      ) {
        activeTimeline.setPageName(pageName);
        abortCtrl.current.abort();
        setLoading(DataLoadingState.loaded);

        if (request.language === 'eql') {
          prevTimelineRequest.current = activeTimeline.getEqlRequest();
        } else {
          prevTimelineRequest.current = activeTimeline.getRequest();
        }

        setTimelineResponse((prevResp) => {
          const resp =
            request.language === 'eql'
              ? activeTimeline.getEqlResponse()
              : activeTimeline.getResponse();
          if (resp != null) {
            return resp;
          }
          return prevResp;
        });
        if (request.language !== 'eql' && activeTimeline.getResponse() != null) {
          return;
        } else if (request.language === 'eql' && activeTimeline.getEqlResponse() != null) {
          return;
        }
      }

      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      await asyncSearch();
    },
    [pageName, skip, id, activeBatch, startTracking, data.search, dataViewId]
  );

  const refetchGrid = useCallback(() => {
    /*
     *
     * Trigger search with a new request object to fetch the latest data.
     *
     */
    const newTimelineRequest: typeof timelineRequest = {
      ...timelineRequest,
      factoryQueryType: TimelineEventsQueries.all,
      language,
      sort,
      fieldRequested: timelineRequest?.fieldRequested ?? fields,
      fields: timelineRequest?.fieldRequested ?? fields,
      pagination: {
        activePage: 0,
        querySize: limit,
      },
    };

    setTimelineRequest(newTimelineRequest);

    timelineSearch(newTimelineRequest);
    setActiveBatch(0);
  }, [timelineRequest, timelineSearch, limit, language, sort, fields]);

  useEffect(() => {
    if (indexNames.length === 0) {
      return;
    }

    setTimelineRequest((prevRequest) => {
      const prevEqlRequest = prevRequest as TimelineEqlRequestOptionsInput;
      const prevSearchParameters = {
        defaultIndex: prevRequest?.defaultIndex ?? [],
        filterQuery: prevRequest?.filterQuery ?? '',
        sort: prevRequest?.sort ?? initSortDefault,
        timerange: prevRequest?.timerange ?? {},
        runtimeMappings: (prevRequest?.runtimeMappings ?? {}) as unknown as RunTimeMappings,
        ...deStructureEqlOptions(prevEqlRequest),
      };

      const timerange =
        startDate && endDate
          ? { timerange: { interval: '12h', from: startDate, to: endDate } }
          : {};
      const currentSearchParameters = {
        defaultIndex: indexNames,
        filterQuery: createFilter(filterQuery),
        sort,
        runtimeMappings: runtimeMappings ?? {},
        ...timerange,
        ...deStructureEqlOptions(eqlOptions),
      };

      const areSearchParamsSame = deepEqual(prevSearchParameters, currentSearchParameters);

      const newActiveBatch = !areSearchParamsSame ? 0 : activeBatch;

      /*
       * optimization to avoid unnecessary network request when a field
       * has already been fetched
       *
       */

      let finalFieldRequest = fields;

      const newFieldsRequested = fields.filter(
        (field) => !prevRequest?.fieldRequested?.includes(field)
      );
      if (newFieldsRequested.length > 0) {
        finalFieldRequest = [...(prevRequest?.fieldRequested ?? []), ...newFieldsRequested];
      } else {
        finalFieldRequest = prevRequest?.fieldRequested ?? [];
      }

      let newPagination = {
        /*
         *
         * fetches data cumulatively for the batches upto the activeBatch
         * This is needed because, we want to get incremental data as well for the old batches
         * For example, newly requested fields
         *
         * */
        activePage: newActiveBatch,
        querySize: limit,
      };

      if (newFieldsRequested.length > 0) {
        newPagination = {
          activePage: 0,
          querySize: (newActiveBatch + 1) * limit,
        };
      }

      const currentRequest = {
        defaultIndex: indexNames,
        factoryQueryType: TimelineEventsQueries.all,
        fieldRequested: finalFieldRequest,
        fields: finalFieldRequest,
        filterQuery: createFilter(filterQuery),
        pagination: newPagination,
        language,
        runtimeMappings,
        sort,
        ...timerange,
        ...(eqlOptions ? eqlOptions : {}),
      } as const;

      if (activeBatch !== newActiveBatch) {
        setActiveBatch(newActiveBatch);
        if (id === TimelineId.active) {
          activeTimeline.setActivePage(newActiveBatch);
        }
      }
      if (!deepEqual(prevRequest, currentRequest)) {
        return currentRequest;
      }
      return prevRequest;
    });
  }, [
    dispatch,
    indexNames,
    activeBatch,
    endDate,
    eqlOptions,
    filterQuery,
    id,
    language,
    limit,
    startDate,
    sort,
    fields,
    runtimeMappings,
  ]);

  /*
    cleanup timeline events response when the filters were removed completely
    to avoid displaying previous query results
  */
  useEffect(() => {
    if (isEmpty(filterQuery)) {
      setTimelineResponse({
        id,
        inspect: {
          dsl: [],
          response: [],
        },
        refetch: () => {},
        totalCount: -1,
        pageInfo: {
          activePage: 0,
          querySize: 0,
        },
        events: [],
        loadNextBatch,
        refreshedAt: 0,
      });
    }
  }, [filterQuery, id, loadNextBatch]);

  const timelineSearchHandler = useCallback(
    async (onNextHandler?: OnNextResponseHandler) => {
      if (
        id !== TimelineId.active ||
        timerangeKind === 'absolute' ||
        !deepEqual(prevTimelineRequest.current, timelineRequest)
      ) {
        await timelineSearch(timelineRequest, onNextHandler);
      }
    },
    [id, timelineRequest, timelineSearch, timerangeKind]
  );

  const finalTimelineLineResponse = useMemo(() => {
    return {
      ...timelineResponse,
      loadNextBatch,
      refetch: refetchGrid,
    };
  }, [timelineResponse, loadNextBatch, refetchGrid]);

  return [loading, finalTimelineLineResponse, timelineSearchHandler];
};

export const useTimelineEvents = ({
  dataViewId,
  endDate,
  eqlOptions = undefined,
  id = ID,
  indexNames,
  fields,
  filterQuery,
  runtimeMappings,
  startDate,
  language = 'kuery',
  limit,
  sort = initSortDefault,
  skip = false,
  timerangeKind,
}: UseTimelineEventsProps): [DataLoadingState, TimelineArgs] => {
  const [eventsPerPage, setEventsPerPage] = useState<TimelineItem[][]>([[]]);
  const [dataLoadingState, timelineResponse, timelineSearchHandler] = useTimelineEventsHandler({
    dataViewId,
    endDate,
    eqlOptions,
    id,
    indexNames,
    fields,
    filterQuery,
    runtimeMappings,
    startDate,
    language,
    limit,
    sort,
    skip,
    timerangeKind,
  });

  useEffect(() => {
    /*
     * `timelineSearchHandler` only returns the events for the current page.
     * This effect is responsible for storing the events for each page so that
     * the combined list of events can be supplied to DataGrid.
     *
     * */

    if (dataLoadingState !== DataLoadingState.loaded) return;

    const { activePage, querySize } = timelineResponse.pageInfo;

    setEventsPerPage((prev) => {
      let result = [...prev];
      if (querySize === limit && activePage > 0) {
        result[activePage] = timelineResponse.events;
      } else {
        result = [timelineResponse.events];
      }
      return result;
    });
  }, [timelineResponse.events, timelineResponse.pageInfo, dataLoadingState, limit]);

  useEffect(() => {
    if (!timelineSearchHandler) return;
    timelineSearchHandler();
  }, [timelineSearchHandler]);

  const combinedEvents = useMemo(
    // exclude undefined values / empty slots
    () => eventsPerPage.filter(Boolean).flat(),
    [eventsPerPage]
  );

  const combinedResponse = useMemo(
    () => ({
      ...timelineResponse,
      events: combinedEvents,
    }),
    [timelineResponse, combinedEvents]
  );

  return [dataLoadingState, combinedResponse];
};
