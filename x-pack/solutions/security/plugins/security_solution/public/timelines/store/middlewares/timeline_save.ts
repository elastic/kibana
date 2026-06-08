/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has, isObject, omit, toString as fpToString } from 'lodash/fp';
import { set } from '@kbn/safer-lodash-set/fp';
import type { Action, Middleware } from 'redux';
import type { CoreStart } from '@kbn/core/public';
import type { Filter, MatchAllFilter } from '@kbn/es-query';
import {
  isExistsFilter,
  isMatchAllFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isQueryStringFilter,
  isRangeFilter,
  isScriptedRangeFilter,
} from '@kbn/es-query';

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { PageScope } from '../../../data_view_manager/constants';
import { sourcererAdapterSelector } from '../../../data_view_manager/redux/selectors';
import {
  endTimelineSaving,
  saveTimeline,
  setChanged,
  showCallOutUnauthorizedMsg,
  startTimelineSaving,
  updateTimeline,
} from '../actions';
import { copyTimeline, persistTimeline } from '../../containers/api';
import type { State } from '../../../common/store/types';
import type { inputsModel } from '../../../common/store/inputs';
import { inputsSelectors } from '../../../common/store/inputs';
import { selectTimelineById } from '../selectors';
import * as i18n from '../../pages/translations';
import type {
  PersistTimelineResponse,
  SavedTimeline,
  TimelineErrorResponse,
} from '../../../../common/api/timeline';
import { TimelineStatusEnum, TimelineTypeEnum } from '../../../../common/api/timeline';
import type { TimelineModel } from '../model';
import type { ColumnHeaderOptions } from '../../../../common/types/timeline';
import { extractTimelineIdsAndVersions, refreshTimelines } from './helpers';

function isSaveTimelineAction(action: Action): action is ReturnType<typeof saveTimeline> {
  return action.type === saveTimeline.type;
}

export const saveTimelineMiddleware: (kibana: CoreStart) => Middleware<{}, State> =
  // WARN: this is disabled because we need to support experimental data view picker here.
  // once it is stable, remove the override

  (kibana: CoreStart) => (store) => (next) => async (action: Action) => {
    if (!isSaveTimelineAction(action)) {
      return next(action);
    }

    const { id: localTimelineId } = action.payload;
    const storeState = store.getState();
    const timeline = selectTimelineById(storeState, localTimelineId);
    const { timelineId, timelineVersion, templateTimelineId, templateTimelineVersion } =
      extractTimelineIdsAndVersions(timeline);

    const timelineTimeRange = inputsSelectors.timelineTimeRangeSelector(storeState);

    const { dataViewId: reduxDataViewId } = sourcererAdapterSelector(PageScope.timeline)(
      storeState
    );

    let dataViewId: string | null = null;
    let indexNames: string[] = [];
    if (reduxDataViewId) {
      const plugins = await kibana.plugins.onStart<{ dataViews: DataViewsPublicPluginStart }>(
        'dataViews'
      );

      if (plugins.dataViews.found) {
        const dataView = await plugins.dataViews.contract.get(reduxDataViewId);

        if (dataView.isPersisted()) {
          dataViewId = reduxDataViewId;
        }

        indexNames = dataView.getIndexPattern().split(',');
      }
    }

    store.dispatch(startTimelineSaving({ id: localTimelineId }));

    try {
      const response = await (action.payload.saveAsNew && timeline.id
        ? copyTimeline({
            timelineId,
            timeline: {
              ...convertTimelineAsInput(timeline, timelineTimeRange),
              dataViewId,
              indexNames,
              templateTimelineId,
              templateTimelineVersion,
            },
            savedSearch: timeline.savedSearch,
          })
        : persistTimeline({
            timelineId,
            version: timelineVersion,
            timeline: {
              ...convertTimelineAsInput(timeline, timelineTimeRange),
              dataViewId,
              indexNames,
              templateTimelineId,
              templateTimelineVersion,
            },
            savedSearch: timeline.savedSearch,
          }));

      if (isTimelineErrorResponse(response)) {
        const error = getErrorFromResponse(response);
        switch (error?.errorCode) {
          case 403:
            store.dispatch(showCallOutUnauthorizedMsg());
            break;
          // conflict
          case 409:
            kibana.notifications.toasts.addDanger({
              title: i18n.TIMELINE_VERSION_CONFLICT_TITLE,
              text: i18n.TIMELINE_VERSION_CONFLICT_DESCRIPTION,
            });
            break;
          default:
            kibana.notifications.toasts.addDanger({
              title: i18n.UPDATE_TIMELINE_ERROR_TITLE,
              text: error?.message ?? i18n.UPDATE_TIMELINE_ERROR_TEXT,
            });
        }
        return;
      }

      if (response == null) {
        kibana.notifications.toasts.addDanger({
          title: i18n.UPDATE_TIMELINE_ERROR_TITLE,
          text: i18n.UPDATE_TIMELINE_ERROR_TEXT,
        });
        return;
      }

      refreshTimelines(store.getState());

      store.dispatch(
        updateTimeline({
          id: localTimelineId,
          timeline: {
            ...timeline,
            id: response.savedObjectId,
            updated: response.updated ?? undefined,
            savedObjectId: response.savedObjectId,
            version: response.version,
            status: response.status ?? TimelineStatusEnum.active,
            timelineType: response.timelineType ?? TimelineTypeEnum.default,
            templateTimelineId: response.templateTimelineId ?? null,
            templateTimelineVersion: response.templateTimelineVersion ?? null,
            savedSearchId: response.savedSearchId ?? null,
            isSaving: false,
          },
        })
      );
      store.dispatch(
        setChanged({
          id: action.payload.id,
          changed: false,
        })
      );
    } catch (error) {
      kibana.notifications.toasts.addDanger({
        title: i18n.UPDATE_TIMELINE_ERROR_TITLE,
        text: error?.message ?? i18n.UPDATE_TIMELINE_ERROR_TEXT,
      });
    } finally {
      store.dispatch(
        endTimelineSaving({
          id: localTimelineId,
        })
      );
    }
  };

const timelineInput: SavedTimeline = {
  columns: null,
  dataProviders: null,
  dataViewId: null,
  description: null,
  eqlOptions: null,
  eventType: null,
  excludedRowRendererIds: null,
  filters: null,
  kqlMode: null,
  kqlQuery: null,
  indexNames: null,
  title: null,
  timelineType: TimelineTypeEnum.default,
  templateTimelineVersion: null,
  templateTimelineId: null,
  dateRange: null,
  savedQueryId: null,
  sort: null,
  status: null,
  savedSearchId: null,
};

export const convertTimelineAsInput = (
  timeline: TimelineModel,
  timelineTimeRange: inputsModel.TimeRange
): SavedTimeline =>
  Object.keys(timelineInput).reduce<SavedTimeline>((acc, key) => {
    if (has(key, timeline)) {
      if (key === 'kqlQuery') {
        return set(`${key}.filterQuery`, get(`${key}.filterQuery`, timeline), acc);
      } else if (key === 'dateRange') {
        return set(`${key}`, { start: timelineTimeRange.from, end: timelineTimeRange.to }, acc);
      } else if (key === 'columns' && get(key, timeline) != null) {
        return set(
          key,
          get(key, timeline).map((col: ColumnHeaderOptions) =>
            omit(['initialWidth', 'width', '__typename', 'esTypes'], col)
          ),
          acc
        );
      } else if (key === 'filters' && get(key, timeline) != null) {
        const filters = get(key, timeline);
        return set(
          key,
          filters != null
            ? filters.map((myFilter: Filter) => {
                const basicFilter = omit(['$state'], myFilter);
                return {
                  ...basicFilter,
                  meta: {
                    ...basicFilter.meta,
                    field:
                      (isMatchAllFilter(basicFilter) ||
                        isPhraseFilter(basicFilter) ||
                        isPhrasesFilter(basicFilter) ||
                        isRangeFilter(basicFilter)) &&
                      basicFilter.meta.field != null
                        ? convertToString(basicFilter.meta.field)
                        : null,
                    value:
                      basicFilter.meta.value != null
                        ? convertToString(basicFilter.meta.value)
                        : null,
                    params:
                      basicFilter.meta.params != null
                        ? convertToString(basicFilter.meta.params)
                        : null,
                  },
                  ...(isMatchAllFilter(basicFilter)
                    ? {
                        query: {
                          match_all: convertToString(
                            (basicFilter as MatchAllFilter).query.match_all
                          ),
                        },
                      }
                    : { match_all: null }),
                  ...(isExistsFilter(basicFilter) && basicFilter.query.exists != null
                    ? { query: { exists: convertToString(basicFilter.query.exists) } }
                    : { exists: null }),
                  ...((isQueryStringFilter(basicFilter) || get('query', basicFilter) != null) &&
                  basicFilter.query != null
                    ? { query: convertToString(basicFilter.query) }
                    : { query: null }),
                  ...(isRangeFilter(basicFilter) && basicFilter.query.range != null
                    ? { query: { range: convertToString(basicFilter.query.range) } }
                    : { range: null }),
                  ...(isScriptedRangeFilter(basicFilter) &&
                  basicFilter.query.script !=
                    null /* TODO remove it when PR50713 is merged || esFilters.isPhraseFilter(basicFilter) */
                    ? { query: { script: convertToString(basicFilter.query.script) } }
                    : { script: null }),
                };
              })
            : [],
          acc
        );
      }
      return set(key, get(key, timeline), acc);
    }
    return acc;
  }, timelineInput);

const convertToString = (obj: unknown) => {
  try {
    if (isObject(obj)) {
      return JSON.stringify(obj);
    }
    return fpToString(obj);
  } catch {
    return '';
  }
};

type PossibleResponse = PersistTimelineResponse | TimelineErrorResponse;

function isTimelineErrorResponse(response: PossibleResponse): response is TimelineErrorResponse {
  return response && ('status_code' in response || 'statusCode' in response);
}

function getErrorFromResponse(response: TimelineErrorResponse) {
  if ('status_code' in response) {
    return { errorCode: response.status_code, message: response.message };
  } else if ('statusCode' in response) {
    return { errorCode: response.statusCode, message: response.message };
  }
}
