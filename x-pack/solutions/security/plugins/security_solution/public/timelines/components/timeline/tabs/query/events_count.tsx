/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { EuiLoadingSpinner } from '@elastic/eui';
import { DataLoadingState } from '@kbn/unified-data-table';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { useSelectedPatterns } from '../../../../../data_view_manager/hooks/use_selected_patterns';
import { useBrowserFields } from '../../../../../data_view_manager/hooks/use_browser_fields';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useTimelineDataFilters } from '../../../../containers/use_timeline_data_filters';
import { useInvalidFilterQuery } from '../../../../../common/hooks/use_invalid_filter_query';
import { timelineActions, timelineSelectors } from '../../../../store';
import type { Direction } from '../../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../../containers';
import { useKibana } from '../../../../../common/lib/kibana';
import { combineQueries } from '../../../../../common/lib/kuery';
import type {
  KueryFilterQuery,
  KueryFilterQueryKind,
} from '../../../../../../common/types/timeline';
import type { inputsModel } from '../../../../../common/store';
import { inputsSelectors } from '../../../../../common/store';
import { timelineDefaults } from '../../../../store/defaults';
import { isActiveTimeline } from '../../../../../helpers';
import type { TimelineModel } from '../../../../store/model';
import { useTimelineColumns } from '../shared/use_timeline_columns';
import { EventsCountBadge } from '../shared/layout';
import { PageScope } from '../../../../../data_view_manager/constants';

/**
 * TODO: This component is a pared down duplicate of the logic used in timeline/tabs/query/index.tsx
 * This is only done to support the events count badge that shows in the bottom bar of the application,
 * without needing to render the entire query tab, which is expensive to render at a significant enough fields count.
 * The long term solution is a centralized query either via RTK or useQuery, that both can read from, but that is out of scope
 * at this current time.
 */

const emptyFieldsList: string[] = [];
export const TimelineQueryTabEventsCountComponent: React.FC<{ timelineId: string }> = ({
  timelineId,
}) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const getKqlQueryTimeline = useMemo(() => timelineSelectors.getKqlFilterKuerySelector(), []);
  const getInputsTimeline = useMemo(() => inputsSelectors.getTimelineSelector(), []);

  const timeline: TimelineModel = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );
  const input: inputsModel.InputsRange = useDeepEqualSelector((state) => getInputsTimeline(state));
  const { timerange: { to: end, from: start, kind: timerangeKind } = {} } = input;
  const {
    columns,
    dataProviders,
    filters: currentTimelineFilters,
    kqlMode,
    sort,
    timelineType,
  } = timeline;

  const kqlQueryTimeline: KueryFilterQuery | null = useDeepEqualSelector((state) =>
    getKqlQueryTimeline(state, timelineId)
  );
  const filters = useMemo(
    () => (kqlMode === 'filter' ? currentTimelineFilters || [] : []),
    [currentTimelineFilters, kqlMode]
  );

  // return events on empty search
  const kqlQueryExpression =
    isEmpty(dataProviders) &&
    isEmpty(kqlQueryTimeline?.expression ?? '') &&
    timelineType === 'template'
      ? ' '
      : kqlQueryTimeline?.expression ?? '';

  const kqlQueryLanguage =
    isEmpty(dataProviders) && timelineType === 'template'
      ? 'kuery'
      : kqlQueryTimeline?.kind ?? 'kuery';

  const dispatch = useDispatch();
  const { dataView, status } = useDataView(PageScope.timeline);
  const dataViewLoading = useMemo(() => status !== 'ready', [status]);
  const browserFields = useBrowserFields(PageScope.timeline);
  const dataViewId = dataView?.id || '';
  const selectedPatterns = useSelectedPatterns(PageScope.timeline);
  const runtimeMappings = useMemo(
    () => dataView.getRuntimeMappings() as RunTimeMappings,
    [dataView]
  );
  /*
   * `pageIndex` needs to be maintained for each table in each tab independently
   * and consequently it cannot be the part of common redux state
   * of the timeline.
   *
   */

  const { uiSettings, timelineDataService } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const kqlQuery: {
    query: string;
    language: KueryFilterQueryKind;
  } = useMemo(
    () => ({ query: kqlQueryExpression.trim(), language: kqlQueryLanguage }),
    [kqlQueryExpression, kqlQueryLanguage]
  );

  const combinedQueries = useMemo(() => {
    return combineQueries({
      config: esQueryConfig,
      dataProviders,
      dataView,
      browserFields,
      filters,
      kqlQuery,
      kqlMode,
    });
  }, [esQueryConfig, dataProviders, dataView, browserFields, filters, kqlQuery, kqlMode]);

  useInvalidFilterQuery({
    id: timelineId,
    filterQuery: combinedQueries?.filterQuery,
    kqlError: combinedQueries?.kqlError,
    query: kqlQuery,
    startDate: start,
    endDate: end,
  });

  const isBlankTimeline: boolean =
    isEmpty(dataProviders) &&
    isEmpty(filters) &&
    isEmpty(kqlQuery.query) &&
    combinedQueries?.filterQuery === undefined;

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      dataViewLoading != null &&
      !dataViewLoading &&
      !isEmpty(start) &&
      !isEmpty(end) &&
      combinedQueries?.filterQuery !== undefined,
    [combinedQueries, end, dataViewLoading, start]
  );

  const timelineQuerySortField = useMemo(() => {
    return sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
      field: columnId,
      direction: sortDirection as Direction,
      esTypes: esTypes ?? [],
      type: columnType,
    }));
  }, [sort]);

  const { defaultColumns } = useTimelineColumns(columns);

  const [dataLoadingState, { totalCount }] = useTimelineEvents({
    dataViewId,
    endDate: end,
    fields: emptyFieldsList,
    filterQuery: combinedQueries?.filterQuery,
    id: timelineId,
    indexNames: selectedPatterns,
    language: kqlQuery.language,
    limit: 0, // We only care about the totalCount here
    runtimeMappings,
    skip: !canQueryTimeline,
    sort: timelineQuerySortField,
    startDate: start,
    timerangeKind,
  });

  useEffect(() => {
    dispatch(
      timelineActions.initializeTimelineSettings({
        id: timelineId,
        defaultColumns,
      })
    );
  }, [dispatch, timelineId, defaultColumns]);

  // NOTE: The timeline is blank after browser FORWARD navigation (after using back button to navigate to
  // the previous page from the timeline), yet we still see total count. This is because the timeline
  // is not getting refreshed when using browser navigation.
  const showEventsCountBadge = !isBlankTimeline && totalCount >= 0;

  // <Synchronisation of the timeline data service>
  // Sync the timerange
  const timelineFilters = useTimelineDataFilters(isActiveTimeline(timelineId));
  useEffect(() => {
    timelineDataService.query.timefilter.timefilter.setTime({
      from: timelineFilters.from,
      to: timelineFilters.to,
    });
  }, [timelineDataService.query.timefilter.timefilter, timelineFilters.from, timelineFilters.to]);

  // Sync the base query
  useEffect(() => {
    timelineDataService.query.queryString.setQuery(
      // We're using the base query of all combined queries here, to account for all
      // of timeline's query dependencies (data providers, query etc.)
      combinedQueries?.baseKqlQuery || { language: kqlQueryLanguage, query: '' }
    );
  }, [timelineDataService, combinedQueries, kqlQueryLanguage]);
  // </Synchronisation of the timeline data service>

  if (!showEventsCountBadge) return null;

  return dataLoadingState === DataLoadingState.loading ||
    dataLoadingState === DataLoadingState.loadingMore ? (
    <EuiLoadingSpinner size="s" />
  ) : (
    <EventsCountBadge data-test-subj="query-events-count">{totalCount}</EventsCountBadge>
  );
};

const TimelineQueryTabEventsCount = React.memo(TimelineQueryTabEventsCountComponent);

// eslint-disable-next-line import/no-default-export
export { TimelineQueryTabEventsCount as default };
