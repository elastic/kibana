/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set/fp';
import { getOr } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import deepMerge from 'deepmerge';
import { useDiscoverInTimelineContext } from '../../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import type { ColumnHeaderOptions } from '../../../../common/types/timeline';
import type {
  TimelineResponse,
  ColumnHeaderResult,
  FilterTimelineResult,
  DataProviderResult,
  PinnedEvent,
  Note,
} from '../../../../common/api/timeline';
import {
  DataProviderTypeEnum,
  RowRendererValues,
  TimelineStatusEnum,
  type TimelineType,
  TimelineTypeEnum,
} from '../../../../common/api/timeline';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { useUpdateTimeline } from './use_update_timeline';

import type { TimelineModel } from '../../store/model';
import { timelineDefaults } from '../../store/defaults';

import {
  defaultColumnHeaderType,
  defaultUdtHeaders,
} from '../timeline/body/column_headers/default_headers';

import type { OpenTimelineResult, TimelineErrorCallback } from './types';
import { IS_OPERATOR } from '../timeline/data_providers/data_provider';
import { normalizeTimeRange } from '../../../common/utils/normalize_time_range';

import {
  DEFAULT_FROM_MOMENT,
  DEFAULT_TO_MOMENT,
} from '../../../common/utils/default_date_settings';
import { resolveTimeline } from '../../containers/api';

export const OPEN_TIMELINE_CLASS_NAME = 'open-timeline';

/** Returns a count of the pinned events in a timeline */
export const getPinnedEventCount = ({ pinnedEventIds }: OpenTimelineResult): number =>
  pinnedEventIds != null ? Object.keys(pinnedEventIds).length : 0;

/** Returns the sum of all notes added to pinned events and notes applicable to the timeline */
export const getNotesCount = ({ eventIdToNoteIds, noteIds }: OpenTimelineResult): number => {
  const eventNoteCount =
    eventIdToNoteIds != null
      ? Object.keys(eventIdToNoteIds).reduce<number>(
          (count, eventId) => count + eventIdToNoteIds[eventId].length,
          0
        )
      : 0;

  const globalNoteCount = noteIds != null ? noteIds.length : 0;

  return eventNoteCount + globalNoteCount;
};

/** Returns true if the timeline is untitlied */
export const isUntitled = ({ title }: OpenTimelineResult): boolean =>
  title == null || title.trim().length === 0;

const parseString = (params: string) => {
  try {
    return JSON.parse(params);
  } catch {
    return params;
  }
};

const setTimelineColumn = (col: ColumnHeaderResult, defaultHeadersValue: ColumnHeaderOptions[]) =>
  Object.entries(col).reduce<ColumnHeaderOptions>(
    (acc, [key, value]) => {
      if (key !== 'id' && value != null) {
        return { ...acc, [key]: value };
      }
      return acc;
    },
    {
      columnHeaderType: defaultColumnHeaderType,
      id: col.id != null ? col.id : 'unknown',
      initialWidth: defaultHeadersValue.find((defaultCol) => col.id === defaultCol.id)
        ?.initialWidth,
    }
  );

const setTimelineFilters = (filter: FilterTimelineResult) => ({
  $state: {
    store: 'appState',
  },
  meta: {
    ...filter.meta,
    ...(filter.meta && filter.meta.field != null ? { params: parseString(filter.meta.field) } : {}),
    ...(filter.meta && filter.meta.params != null
      ? { params: parseString(filter.meta.params) }
      : {}),
    ...(filter.meta && filter.meta.value != null ? { value: parseString(filter.meta.value) } : {}),
  },
  ...(filter.exists != null ? { exists: parseString(filter.exists) } : {}),
  ...(filter.match_all != null ? { exists: parseString(filter.match_all) } : {}),
  ...(filter.missing != null ? { exists: parseString(filter.missing) } : {}),
  ...(filter.query != null ? { query: parseString(filter.query) } : {}),
  ...(filter.range != null ? { range: parseString(filter.range) } : {}),
  ...(filter.script != null ? { exists: parseString(filter.script) } : {}),
});

const setEventIdToNoteIds = (duplicate: boolean, eventIdToNoteIds: Note[] | null | undefined) =>
  duplicate
    ? {}
    : eventIdToNoteIds != null
    ? eventIdToNoteIds.reduce((acc, note) => {
        if (note.eventId != null) {
          const eventNotes = getOr([], note.eventId, acc);
          return { ...acc, [note.eventId]: [...eventNotes, note.noteId] };
        }
        return acc;
      }, {})
    : {};

const setPinnedEventsSaveObject = (
  duplicate: boolean,
  pinnedEventsSaveObject: PinnedEvent[] | null | undefined
) =>
  duplicate
    ? {}
    : pinnedEventsSaveObject != null
    ? pinnedEventsSaveObject.reduce(
        (acc, pinnedEvent) => ({
          ...acc,
          ...(pinnedEvent.eventId != null ? { [pinnedEvent.eventId]: pinnedEvent } : {}),
        }),
        {}
      )
    : {};

const setPinnedEventIds = (duplicate: boolean, pinnedEventIds: string[] | null | undefined) =>
  duplicate
    ? {}
    : pinnedEventIds != null
    ? pinnedEventIds.reduce((acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }), {})
    : {};

const getTemplateTimelineId = (
  timeline: TimelineResponse,
  duplicate: boolean,
  targetTimelineType?: TimelineType
) => {
  if (
    targetTimelineType === TimelineTypeEnum.default &&
    timeline.timelineType === TimelineTypeEnum.template
  ) {
    return timeline.templateTimelineId;
  }

  return duplicate && timeline.timelineType === TimelineTypeEnum.template
    ? // TODO: MOVE TO THE BACKEND
      uuidv4()
    : timeline.templateTimelineId;
};

const convertToDefaultField = ({ and, ...dataProvider }: DataProviderResult) => {
  if (dataProvider.type === DataProviderTypeEnum.template) {
    return deepMerge(dataProvider, {
      type: DataProviderTypeEnum.default,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      enabled: dataProvider.queryMatch!.operator !== IS_OPERATOR,
      queryMatch: {
        value:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          dataProvider.queryMatch!.operator === IS_OPERATOR ? '' : dataProvider.queryMatch!.value,
      },
    });
  }

  return dataProvider;
};

const getDataProviders = (
  duplicate: boolean,
  dataProviders: TimelineResponse['dataProviders'],
  timelineType?: TimelineType
) => {
  if (duplicate && dataProviders && timelineType === TimelineTypeEnum.default) {
    return dataProviders.map((dataProvider) => ({
      ...convertToDefaultField(dataProvider),
      and: dataProvider.and?.map(convertToDefaultField) ?? [],
    }));
  }

  return dataProviders;
};

export const getTimelineTitle = (
  timeline: TimelineResponse,
  duplicate: boolean,
  timelineType?: TimelineType
) => {
  const isCreateTimelineFromAction = timelineType && timeline.timelineType !== timelineType;
  if (isCreateTimelineFromAction) return '';

  return duplicate ? `${timeline.title} - Duplicate` : timeline.title || '';
};

export const getTimelineStatus = (
  timeline: TimelineResponse,
  duplicate: boolean,
  timelineType?: TimelineType
) => {
  const isCreateTimelineFromAction = timelineType && timeline.timelineType !== timelineType;
  if (isCreateTimelineFromAction) return TimelineStatusEnum.draft;

  return duplicate ? TimelineStatusEnum.active : timeline.status;
};

export const defaultTimelineToTimelineModel = (
  timeline: TimelineResponse,
  duplicate: boolean,
  timelineType?: TimelineType
): TimelineModel => {
  const isTemplate = timeline.timelineType === TimelineTypeEnum.template;
  const defaultHeadersValue = defaultUdtHeaders;

  const timelineEntries = {
    ...timeline,
    columns:
      timeline.columns != null
        ? timeline.columns.map((col) => setTimelineColumn(col, defaultHeadersValue))
        : defaultHeadersValue,
    defaultColumns: defaultHeadersValue,
    dateRange:
      timeline.status === TimelineStatusEnum.immutable &&
      timeline.timelineType === TimelineTypeEnum.template
        ? {
            start: DEFAULT_FROM_MOMENT.toISOString(),
            end: DEFAULT_TO_MOMENT.toISOString(),
          }
        : timeline.dateRange,
    dataProviders: getDataProviders(duplicate, timeline.dataProviders, timelineType),
    excludedRowRendererIds: isTemplate ? [] : timeline.excludedRowRendererIds ?? RowRendererValues,
    eventIdToNoteIds: setEventIdToNoteIds(duplicate, timeline.eventIdToNoteIds),
    filters: timeline.filters != null ? timeline.filters.map(setTimelineFilters) : [],
    isFavorite: duplicate
      ? false
      : timeline.favorite != null
      ? timeline.favorite.length > 0
      : false,
    noteIds: duplicate ? [] : timeline.noteIds != null ? timeline.noteIds : [],
    pinnedEventIds: setPinnedEventIds(duplicate, timeline.pinnedEventIds),
    pinnedEventsSaveObject: setPinnedEventsSaveObject(duplicate, timeline.pinnedEventsSaveObject),
    id: duplicate ? '' : timeline.savedObjectId,
    status: getTimelineStatus(timeline, duplicate, timelineType),
    savedObjectId: duplicate ? null : timeline.savedObjectId,
    version: duplicate ? null : timeline.version,
    timelineType: timelineType ?? timeline.timelineType,
    title: getTimelineTitle(timeline, duplicate, timelineType),
    templateTimelineId: getTemplateTimelineId(timeline, duplicate, timelineType),
    templateTimelineVersion: duplicate && isTemplate ? 1 : timeline.templateTimelineVersion,
  };
  return Object.entries(timelineEntries).reduce(
    (acc: TimelineModel, [key, value]) => (value != null ? set(key, value, acc) : acc),
    {
      ...timelineDefaults,
      id: '',
    }
  );
};

export const formatTimelineResponseToModel = (
  timelineToOpen: TimelineResponse,
  duplicate: boolean = false,
  timelineType?: TimelineType
): { notes: Note[] | null | undefined; timeline: TimelineModel } => {
  const { notes, ...timelineModel } = timelineToOpen;
  return {
    notes,
    timeline: defaultTimelineToTimelineModel(timelineModel, duplicate, timelineType),
  };
};

export interface QueryTimelineById {
  activeTimelineTab?: TimelineTabs;
  duplicate?: boolean;
  graphEventId?: string;
  timelineId?: string;
  timelineType?: TimelineType;
  onError?: TimelineErrorCallback;
  onOpenTimeline?: (timeline: TimelineModel) => void;
  openTimeline?: boolean;
  savedSearchId?: string;
}

export const useQueryTimelineById = () => {
  const { resetDiscoverAppState } = useDiscoverInTimelineContext();
  const updateTimeline = useUpdateTimeline();

  return ({
    activeTimelineTab = TimelineTabs.query,
    duplicate = false,
    graphEventId = '',
    timelineId,
    timelineType,
    onError,
    onOpenTimeline,
    openTimeline = true,
    savedSearchId,
  }: QueryTimelineById) => {
    if (timelineId == null) {
      updateTimeline({
        id: TimelineId.active,
        duplicate: false,
        notes: [],
        from: DEFAULT_FROM_MOMENT.toISOString(),
        to: DEFAULT_TO_MOMENT.toISOString(),
        timeline: {
          ...timelineDefaults,
          columns: defaultUdtHeaders,
          id: TimelineId.active,
          activeTab: activeTimelineTab,
          show: openTimeline,
          initialized: true,
          savedSearchId: savedSearchId ?? null,
          excludedRowRendererIds:
            timelineType !== TimelineTypeEnum.template
              ? timelineDefaults.excludedRowRendererIds
              : [],
        },
      });
      resetDiscoverAppState();
    } else {
      return Promise.resolve(resolveTimeline(timelineId))
        .then((result) => {
          if (!result) return;

          const { timeline, notes } = formatTimelineResponseToModel(
            result.timeline,
            duplicate,
            timelineType
          );

          if (onOpenTimeline != null) {
            onOpenTimeline(timeline);
          } else if (updateTimeline) {
            const { from, to } = normalizeTimeRange({
              from: getOr(null, 'dateRange.start', timeline),
              to: getOr(null, 'dateRange.end', timeline),
            });
            updateTimeline({
              duplicate,
              from,
              id: TimelineId.active,
              notes,
              resolveTimelineConfig: {
                outcome: result.outcome,
                alias_target_id: result.alias_target_id,
                alias_purpose: result.alias_purpose,
              },
              timeline: {
                ...timeline,
                activeTab: activeTimelineTab,
                graphEventId,
                show: openTimeline,
                dateRange: { start: from, end: to },
                savedSearchId: timeline.savedSearchId,
              },
              to,
              // The query has already been resolved before
              // when the response was mapped to a model.
              // No need to do that again.
              preventSettingQuery: true,
            });
            return resetDiscoverAppState(timeline.savedSearchId);
          }
        })
        .catch((error) => {
          if (onError != null) {
            onError(error, timelineId);
          }
        });
    }
  };
};
