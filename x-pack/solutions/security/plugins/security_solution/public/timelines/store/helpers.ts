/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, getOr, isEmpty, isEqualWith, omit, union, uniq } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import type { TimelineNonEcsData } from '../../../common/search_strategy';
import type {
  DataProvider,
  QueryMatch,
  QueryOperator,
} from '../components/timeline/data_providers/data_provider';
import { EXISTS_OPERATOR, IS_OPERATOR } from '../components/timeline/data_providers/data_provider';
import type {
  RowRendererId,
  TimelineType,
  type DataProviderType,
  DataProviderTypeEnum,
  TimelineStatusEnum,
  TimelineTypeEnum,
} from '../../../common/api/timeline';
import type {
  ColumnHeaderOptions,
  SerializedFilterQuery,
  SortColumnTimeline,
  TimelinePersistInput,
} from '../../../common/types/timeline';
import { TimelineId } from '../../../common/types/timeline';
import { normalizeTimeRange } from '../../common/utils/normalize_time_range';
import { getTimelineManageDefaults, timelineDefaults } from './defaults';
import type { KqlMode, TimelineModel } from './model';
import type { TimelineById, TimelineModelSettings } from './types';
import { DEFAULT_FROM_MOMENT, DEFAULT_TO_MOMENT } from '../../common/utils/default_date_settings';
import { activeTimeline } from '../containers/active_timeline_context';
import type { ResolveTimelineConfig } from '../components/open_timeline/types';
import { getDisplayValue } from '../components/timeline/data_providers/helpers';
import type { PrimitiveOrArrayOfPrimitives } from '../../common/lib/kuery';
import { getStoredTimelineColumnsConfig } from './middlewares/timeline_localstorage';

interface AddTimelineNoteParams {
  id: string;
  noteId: string;
  timelineById: TimelineById;
}

export const addTimelineNote = ({
  id,
  noteId,
  timelineById,
}: AddTimelineNoteParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      noteIds: [...timeline.noteIds, noteId],
    },
  };
};

interface AddTimelineNoteToEventParams {
  id: string;
  noteId: string;
  eventId: string;
  timelineById: TimelineById;
}

export const addTimelineNoteToEvent = ({
  id,
  noteId,
  eventId,
  timelineById,
}: AddTimelineNoteToEventParams): TimelineById => {
  const timeline = timelineById[id];
  const existingNoteIds = getOr([], `eventIdToNoteIds.${eventId}`, timeline);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      eventIdToNoteIds: {
        ...timeline.eventIdToNoteIds,
        ...{ [eventId]: uniq([...existingNoteIds, noteId]) },
      },
    },
  };
};

interface AddTimelineParams {
  id: string;
  resolveTimelineConfig?: ResolveTimelineConfig;
  timeline: TimelineModel;
  timelineById: TimelineById;
}

export const shouldResetActiveTimelineContext = (
  id: string,
  oldTimeline: TimelineModel,
  newTimeline: TimelineModel
) => {
  if (id === TimelineId.active && oldTimeline.savedObjectId !== newTimeline.savedObjectId) {
    return true;
  }
  return false;
};

/**
 * Merges a given timeline column config with locally stored timeline column config
 */
function mergeInLocalColumnConfig(columns: TimelineModel['columns']) {
  const storedColumnsConfig = getStoredTimelineColumnsConfig();
  if (storedColumnsConfig) {
    return columns.map((column) => ({
      ...column,
      initialWidth: storedColumnsConfig[column.id]?.initialWidth || column.initialWidth,
    }));
  }
  return columns;
}

/**
 * Add a saved object timeline to the store
 * and default the value to what need to be if values are null
 */
export const addTimelineToStore = ({
  id,
  resolveTimelineConfig,
  timeline,
  timelineById,
}: AddTimelineParams): TimelineById => {
  if (shouldResetActiveTimelineContext(id, timelineById[id], timeline)) {
    activeTimeline.setActivePage(0);
  }

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns: mergeInLocalColumnConfig(timeline.columns),
      initialized: timeline.initialized ?? timelineById[id].initialized,
      resolveTimelineConfig,
      dateRange:
        timeline.status === TimelineStatusEnum.immutable &&
        timeline.timelineType === TimelineTypeEnum.template
          ? {
              start: DEFAULT_FROM_MOMENT.toISOString(),
              end: DEFAULT_TO_MOMENT.toISOString(),
            }
          : timeline.dateRange,
    },
  };
};

interface AddNewTimelineParams extends TimelinePersistInput {
  timelineById: TimelineById;
  timelineType: TimelineType;
}

/** Adds a new `Timeline` to the provided collection of `TimelineById` */
export const addNewTimeline = ({
  id,
  timelineById,
  timelineType,
  dateRange: maybeDateRange,
  ...timelineProps
}: AddNewTimelineParams): TimelineById => {
  const timeline = timelineById[id];
  const { from: startDateRange, to: endDateRange } = normalizeTimeRange({ from: '', to: '' });
  const dateRange = maybeDateRange ?? { start: startDateRange, end: endDateRange };
  const templateTimelineInfo =
    timelineType === TimelineTypeEnum.template
      ? {
          templateTimelineId: uuidv4(),
          templateTimelineVersion: 1,
        }
      : {};
  const newTimeline = {
    id,
    ...(timeline ? timeline : {}),
    ...timelineDefaults,
    ...timelineProps,
    dateRange,
    savedObjectId: null,
    version: null,
    isSaving: false,
    timelineType,
    ...templateTimelineInfo,
  };
  return {
    ...timelineById,
    [id]: {
      ...newTimeline,
      columns: mergeInLocalColumnConfig(newTimeline.columns),
    },
  };
};

interface PinTimelineEventParams {
  id: string;
  eventId: string;
  timelineById: TimelineById;
}

export const pinTimelineEvent = ({
  id,
  eventId,
  timelineById,
}: PinTimelineEventParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      pinnedEventIds: {
        ...timeline.pinnedEventIds,
        ...{ [eventId]: true },
      },
    },
  };
};

interface UpdateShowTimelineProps {
  id: string;
  show: boolean;
  timelineById: TimelineById;
}

export const updateTimelineShowTimeline = ({
  id,
  show,
  timelineById,
}: UpdateShowTimelineProps): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      show,
    },
  };
};

const queryMatchCustomizer = (dp1: QueryMatch, dp2: QueryMatch) => {
  if (dp1.field === dp2.field && dp1.value === dp2.value && dp1.operator === dp2.operator) {
    return true;
  }
  return false;
};

const addAndToProvidersInTimeline = (
  id: string,
  providers: DataProvider[],
  timeline: TimelineModel,
  timelineById: TimelineById
): TimelineById => {
  if (providers.length === 0) return timelineById;
  let localDataProviders: DataProvider[] = cloneDeep(timeline.dataProviders);

  providers.forEach((provider) => {
    const alreadyExistsProviderIndex = localDataProviders.findIndex(
      (p) => p.id === timeline.highlightedDropAndProviderId
    );
    const newProvider = localDataProviders[alreadyExistsProviderIndex];
    const alreadyExistsAndProviderIndex = newProvider.and.findIndex((p) => p.id === provider.id);
    const { and, ...andProvider } = provider;

    if (
      isEqualWith(queryMatchCustomizer, newProvider.queryMatch, andProvider.queryMatch) ||
      (alreadyExistsAndProviderIndex === -1 &&
        newProvider.and.filter((itemAndProvider) =>
          isEqualWith(queryMatchCustomizer, itemAndProvider.queryMatch, andProvider.queryMatch)
        ).length > 0)
    ) {
      return timelineById;
    }

    localDataProviders = [
      ...localDataProviders.slice(0, alreadyExistsProviderIndex),
      {
        ...localDataProviders[alreadyExistsProviderIndex],
        and:
          alreadyExistsAndProviderIndex > -1
            ? [
                ...newProvider.and.slice(0, alreadyExistsAndProviderIndex),
                andProvider,
                ...newProvider.and.slice(alreadyExistsAndProviderIndex + 1),
              ]
            : [...newProvider.and, andProvider],
      },
      ...localDataProviders.slice(alreadyExistsProviderIndex + 1),
    ];
  });
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: localDataProviders,
    },
  };
};

const addProvidersToTimeline = (
  id: string,
  providers: DataProvider[],
  timeline: TimelineModel,
  timelineById: TimelineById
): TimelineById => {
  if (providers.length === 0) return timelineById;

  let localDataProviders: DataProvider[] = cloneDeep(timeline.dataProviders);

  providers.forEach((provider) => {
    const alreadyExistsAtIndex = localDataProviders.findIndex((p) => p.id === provider.id);

    if (alreadyExistsAtIndex > -1 && !isEmpty(localDataProviders[alreadyExistsAtIndex].and)) {
      provider.id = `${provider.id}-${
        localDataProviders.filter((p) => p.id === provider.id).length
      }`;
    }

    localDataProviders =
      alreadyExistsAtIndex > -1 && isEmpty(localDataProviders[alreadyExistsAtIndex].and)
        ? [
            ...localDataProviders.slice(0, alreadyExistsAtIndex),
            provider,
            ...localDataProviders.slice(alreadyExistsAtIndex + 1),
          ]
        : [...localDataProviders, provider];
  });

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: localDataProviders,
    },
  };
};

interface AddTimelineColumnParams {
  column: ColumnHeaderOptions;
  id: string;
  index: number;
  timelineById: TimelineById;
}

/**
 * Adds or updates a column. When updating a column, it will be moved to the
 * new index
 */
export const upsertTimelineColumn = ({
  column,
  id,
  index,
  timelineById,
}: AddTimelineColumnParams): TimelineById => {
  const timeline = timelineById[id];
  const alreadyExistsAtIndex = timeline.columns.findIndex((c) => c.id === column.id);

  if (alreadyExistsAtIndex !== -1) {
    // remove the existing entry and add the new one at the specified index
    const reordered = timeline.columns.filter((c) => c.id !== column.id);
    reordered.splice(index, 0, column); // ⚠️ mutation

    return {
      ...timelineById,
      [id]: {
        ...timeline,
        columns: mergeInLocalColumnConfig(reordered),
      },
    };
  }

  // add the new entry at the specified index
  const columns = [...timeline.columns];
  columns.splice(index, 0, column); // ⚠️ mutation

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns: mergeInLocalColumnConfig(columns),
    },
  };
};

interface RemoveTimelineColumnParams {
  id: string;
  columnId: string;
  timelineById: TimelineById;
}

export const removeTimelineColumn = ({
  id,
  columnId,
  timelineById,
}: RemoveTimelineColumnParams): TimelineById => {
  const timeline = timelineById[id];

  const columns = timeline.columns.filter((c) => c.id !== columnId);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns: mergeInLocalColumnConfig(columns),
    },
  };
};

interface AddTimelineProviderParams {
  id: string;
  providers: DataProvider[];
  timelineById: TimelineById;
}

export const addTimelineProviders = ({
  id,
  providers,
  timelineById,
}: AddTimelineProviderParams): TimelineById => {
  const timeline = timelineById[id];
  if (timeline.highlightedDropAndProviderId !== '') {
    return addAndToProvidersInTimeline(id, providers, timeline, timelineById);
  } else {
    return addProvidersToTimeline(id, providers, timeline, timelineById);
  }
};

interface ApplyKqlFilterQueryDraftParams {
  id: string;
  filterQuery: SerializedFilterQuery;
  timelineById: TimelineById;
}

export const applyKqlFilterQueryDraft = ({
  id,
  filterQuery,
  timelineById,
}: ApplyKqlFilterQueryDraftParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      kqlQuery: {
        ...timeline.kqlQuery,
        filterQuery,
      },
    },
  };
};

interface UpdateTimelineKqlModeParams {
  id: string;
  kqlMode: KqlMode;
  timelineById: TimelineById;
}

export const updateTimelineKqlMode = ({
  id,
  kqlMode,
  timelineById,
}: UpdateTimelineKqlModeParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      kqlMode,
    },
  };
};

interface UpdateTimelineColumnsParams {
  id: string;
  columns: ColumnHeaderOptions[];
  timelineById: TimelineById;
}

export const updateTimelineColumns = ({
  id,
  columns,
  timelineById,
}: UpdateTimelineColumnsParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns: mergeInLocalColumnConfig(columns),
    },
  };
};

interface UpdateTimelineTitleAndDescriptionParams {
  description: string;
  id: string;
  title: string;
  timelineById: TimelineById;
}

export const updateTimelineTitleAndDescription = ({
  description,
  id,
  title,
  timelineById,
}: UpdateTimelineTitleAndDescriptionParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      description: description.trim(),
      title: title.trim(),
    },
  };
};

interface UpdateTimelineIsFavoriteParams {
  id: string;
  isFavorite: boolean;
  timelineById: TimelineById;
}

export const updateTimelineIsFavorite = ({
  id,
  isFavorite,
  timelineById,
}: UpdateTimelineIsFavoriteParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      isFavorite,
    },
  };
};

interface UpdateTimelineProvidersParams {
  id: string;
  providers: DataProvider[];
  timelineById: TimelineById;
}

export const updateTimelineProviders = ({
  id,
  providers,
  timelineById,
}: UpdateTimelineProvidersParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: providers,
    },
  };
};

interface UpdateTimelineRangeParams {
  id: string;
  start: string;
  end: string;
  timelineById: TimelineById;
}

export const updateTimelineRange = ({
  id,
  start,
  end,
  timelineById,
}: UpdateTimelineRangeParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dateRange: {
        start,
        end,
      },
    },
  };
};

interface UpdateTimelineSortParams {
  id: string;
  sort: SortColumnTimeline[];
  timelineById: TimelineById;
}

export const updateTimelineSort = ({
  id,
  sort,
  timelineById,
}: UpdateTimelineSortParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      sort,
    },
  };
};

const updateEnabledAndProvider = (
  andProviderId: string,
  enabled: boolean,
  providerId: string,
  timeline: TimelineModel
) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map((andProvider) =>
            andProvider.id === andProviderId ? { ...andProvider, enabled } : andProvider
          ),
        }
      : provider
  );

const updateEnabledProvider = (enabled: boolean, providerId: string, timeline: TimelineModel) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          enabled,
        }
      : provider
  );

interface UpdateTimelineProviderEnabledParams {
  id: string;
  providerId: string;
  enabled: boolean;
  timelineById: TimelineById;
  andProviderId?: string;
}

export const updateTimelineProviderEnabled = ({
  id,
  providerId,
  enabled,
  timelineById,
  andProviderId,
}: UpdateTimelineProviderEnabledParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? updateEnabledAndProvider(andProviderId, enabled, providerId, timeline)
        : updateEnabledProvider(enabled, providerId, timeline),
    },
  };
};

const updateExcludedAndProvider = (
  andProviderId: string,
  excluded: boolean,
  providerId: string,
  timeline: TimelineModel
) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map((andProvider) =>
            andProvider.id === andProviderId ? { ...andProvider, excluded } : andProvider
          ),
        }
      : provider
  );

const updateExcludedProvider = (excluded: boolean, providerId: string, timeline: TimelineModel) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          excluded,
        }
      : provider
  );

interface UpdateTimelineProviderExcludedParams {
  id: string;
  providerId: string;
  excluded: boolean;
  timelineById: TimelineById;
  andProviderId?: string;
}

export const updateTimelineProviderExcluded = ({
  id,
  providerId,
  excluded,
  timelineById,
  andProviderId,
}: UpdateTimelineProviderExcludedParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? updateExcludedAndProvider(andProviderId, excluded, providerId, timeline)
        : updateExcludedProvider(excluded, providerId, timeline),
    },
  };
};

const updateProviderProperties = ({
  excluded,
  field,
  operator,
  providerId,
  timeline,
  value,
}: {
  excluded: boolean;
  field: string;
  operator: QueryOperator;
  providerId: string;
  timeline: TimelineModel;
  value: PrimitiveOrArrayOfPrimitives;
}) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          excluded,
          queryMatch: {
            ...provider.queryMatch,
            field,
            displayField: field,
            value,
            displayValue: getDisplayValue(value),
            operator,
          },
        }
      : provider
  );

const updateAndProviderProperties = ({
  andProviderId,
  excluded,
  field,
  operator,
  providerId,
  timeline,
  value,
}: {
  andProviderId: string;
  excluded: boolean;
  field: string;
  operator: QueryOperator;
  providerId: string;
  timeline: TimelineModel;
  value: PrimitiveOrArrayOfPrimitives;
}) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map((andProvider) =>
            andProvider.id === andProviderId
              ? {
                  ...andProvider,
                  excluded,
                  queryMatch: {
                    ...andProvider.queryMatch,
                    field,
                    displayField: field,
                    value,
                    displayValue: getDisplayValue(value),
                    operator,
                  },
                }
              : andProvider
          ),
        }
      : provider
  );

interface UpdateTimelineProviderEditPropertiesParams {
  andProviderId?: string;
  excluded: boolean;
  field: string;
  id: string;
  operator: QueryOperator;
  providerId: string;
  timelineById: TimelineById;
  value: PrimitiveOrArrayOfPrimitives;
}

export const updateTimelineProviderProperties = ({
  andProviderId,
  excluded,
  field,
  id,
  operator,
  providerId,
  timelineById,
  value,
}: UpdateTimelineProviderEditPropertiesParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? updateAndProviderProperties({
            andProviderId,
            excluded,
            field,
            operator,
            providerId,
            timeline,
            value,
          })
        : updateProviderProperties({
            excluded,
            field,
            operator,
            providerId,
            timeline,
            value,
          }),
    },
  };
};

interface UpdateTimelineProviderTypeParams {
  andProviderId?: string;
  id: string;
  providerId: string;
  type: DataProviderType;
  timelineById: TimelineById;
}

const updateTypeAndProvider = (
  andProviderId: string,
  type: DataProviderType,
  providerId: string,
  timeline: TimelineModel
) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map((andProvider) =>
            andProvider.id === andProviderId
              ? {
                  ...andProvider,
                  type,
                  name:
                    type === DataProviderTypeEnum.template ? `${andProvider.queryMatch.field}` : '',
                  queryMatch: {
                    ...andProvider.queryMatch,
                    displayField: undefined,
                    displayValue: undefined,
                    value:
                      type === DataProviderTypeEnum.template
                        ? `{${andProvider.queryMatch.field}}`
                        : '',
                    operator: (type === DataProviderTypeEnum.template
                      ? IS_OPERATOR
                      : EXISTS_OPERATOR) as QueryOperator,
                  },
                }
              : andProvider
          ),
        }
      : provider
  );

const updateTypeProvider = (type: DataProviderType, providerId: string, timeline: TimelineModel) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          type,
          name: type === DataProviderTypeEnum.template ? `${provider.queryMatch.field}` : '',
          queryMatch: {
            ...provider.queryMatch,
            displayField: undefined,
            displayValue: undefined,
            value: type === DataProviderTypeEnum.template ? `{${provider.queryMatch.field}}` : '',
            operator: (type === DataProviderTypeEnum.template
              ? IS_OPERATOR
              : EXISTS_OPERATOR) as QueryOperator,
          },
        }
      : provider
  );

export const updateTimelineProviderType = ({
  andProviderId,
  id,
  providerId,
  type,
  timelineById,
}: UpdateTimelineProviderTypeParams): TimelineById => {
  const timeline = timelineById[id];

  if (
    timeline.timelineType !== TimelineTypeEnum.template &&
    type === DataProviderTypeEnum.template
  ) {
    // Not supported, timeline template cannot have template type providers
    return timelineById;
  }

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? updateTypeAndProvider(andProviderId, type, providerId, timeline)
        : updateTypeProvider(type, providerId, timeline),
    },
  };
};

interface UpdateTimelineItemsPerPageParams {
  id: string;
  itemsPerPage: number;
  timelineById: TimelineById;
}

export const updateTimelineItemsPerPage = ({
  id,
  itemsPerPage,
  timelineById,
}: UpdateTimelineItemsPerPageParams) => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      itemsPerPage,
    },
  };
};

interface UpdateTimelinePerPageOptionsParams {
  id: string;
  itemsPerPageOptions: number[];
  timelineById: TimelineById;
}

export const updateTimelinePerPageOptions = ({
  id,
  itemsPerPageOptions,
  timelineById,
}: UpdateTimelinePerPageOptionsParams) => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      itemsPerPageOptions,
    },
  };
};

const removeAndProvider = (andProviderId: string, providerId: string, timeline: TimelineModel) => {
  const providerIndex = timeline.dataProviders.findIndex((p) => p.id === providerId);
  const providerAndIndex = timeline.dataProviders[providerIndex]?.and.findIndex(
    (p) => p.id === andProviderId
  );

  return [
    ...timeline.dataProviders.slice(0, providerIndex),
    {
      ...timeline.dataProviders[providerIndex],
      and: timeline.dataProviders[providerIndex]?.and
        ? [
            ...timeline.dataProviders[providerIndex]?.and.slice(0, providerAndIndex),
            ...timeline.dataProviders[providerIndex]?.and.slice(providerAndIndex + 1),
          ]
        : [],
    },
    ...timeline.dataProviders.slice(providerIndex + 1),
  ];
};

const removeProvider = (providerId: string, timeline: TimelineModel) => {
  const providerIndex = timeline.dataProviders.findIndex((p) => p.id === providerId);
  return [
    ...timeline.dataProviders.slice(0, providerIndex),
    ...(timeline.dataProviders[providerIndex]?.and.length
      ? [
          {
            ...timeline.dataProviders[providerIndex].and.slice(0, 1)[0],
            and: [...timeline.dataProviders[providerIndex].and.slice(1)],
          },
        ]
      : []),
    ...timeline.dataProviders.slice(providerIndex + 1),
  ];
};

interface RemoveTimelineProviderParams {
  id: string;
  providerId: string;
  timelineById: TimelineById;
  andProviderId?: string;
}

export const removeTimelineProvider = ({
  id,
  providerId,
  timelineById,
  andProviderId,
}: RemoveTimelineProviderParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? removeAndProvider(andProviderId, providerId, timeline)
        : removeProvider(providerId, timeline),
    },
  };
};

interface UnPinTimelineEventParams {
  id: string;
  eventId: string;
  timelineById: TimelineById;
}

export const unPinTimelineEvent = ({
  id,
  eventId,
  timelineById,
}: UnPinTimelineEventParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      pinnedEventIds: omit(eventId, timeline.pinnedEventIds),
      eventIdToNoteIds: omit(eventId, timeline.eventIdToNoteIds),
    },
  };
};

interface UpdateSavedQueryParams {
  id: string;
  savedQueryId: string | null;
  timelineById: TimelineById;
}

export const updateSavedQuery = ({
  id,
  savedQueryId,
  timelineById,
}: UpdateSavedQueryParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      savedQueryId,
    },
  };
};

interface UpdateFiltersParams {
  id: string;
  filters: Filter[];
  timelineById: TimelineById;
}

export const updateFilters = ({ id, filters, timelineById }: UpdateFiltersParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      filters,
    },
  };
};

interface UpdateExcludedRowRenderersIds {
  id: string;
  excludedRowRendererIds: RowRendererId[];
  timelineById: TimelineById;
}

export const updateExcludedRowRenderersIds = ({
  id,
  excludedRowRendererIds,
  timelineById,
}: UpdateExcludedRowRenderersIds): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      excludedRowRendererIds,
    },
  };
};

interface SetLoadingTableEventsParams {
  id: string;
  eventIds: string[];
  isLoading: boolean;
  timelineById: TimelineById;
}

export const setLoadingTableEvents = ({
  id,
  eventIds,
  isLoading,
  timelineById,
}: SetLoadingTableEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const loadingEventIds = isLoading
    ? union(timeline.loadingEventIds, eventIds)
    : timeline.loadingEventIds.filter((currentEventId) => !eventIds.includes(currentEventId));

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      loadingEventIds,
    },
  };
};

interface SetSelectedTableEventsParams {
  id: string;
  eventIds: Record<string, TimelineNonEcsData[]>;
  isSelectAllChecked: boolean;
  isSelected: boolean;
  timelineById: TimelineById;
}

export const setSelectedTableEvents = ({
  id,
  eventIds,
  isSelectAllChecked = false,
  isSelected,
  timelineById,
}: SetSelectedTableEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const selectedEventIds = isSelected
    ? { ...timeline.selectedEventIds, ...eventIds }
    : omit(Object.keys(eventIds), timeline.selectedEventIds);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      selectedEventIds,
      isSelectAllChecked,
    },
  };
};

interface SetDeletedTableEventsParams {
  id: string;
  eventIds: string[];
  isDeleted: boolean;
  timelineById: TimelineById;
}

export const setDeletedTableEvents = ({
  id,
  eventIds,
  isDeleted,
  timelineById,
}: SetDeletedTableEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const deletedEventIds = isDeleted
    ? union(timeline.deletedEventIds, eventIds)
    : timeline.deletedEventIds.filter((currentEventId) => !eventIds.includes(currentEventId));

  const selectedEventIds = Object.fromEntries(
    Object.entries(timeline.selectedEventIds).filter(
      ([selectedEventId]) => !deletedEventIds.includes(selectedEventId)
    )
  );

  const isSelectAllChecked =
    Object.keys(selectedEventIds).length > 0 ? timeline.isSelectAllChecked : false;

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      deletedEventIds,
      selectedEventIds,
      isSelectAllChecked,
    },
  };
};

interface InitializeTimelineParams {
  id: string;
  timelineById: TimelineById;
  timelineSettingsProps: Partial<TimelineModelSettings>;
}

export const setInitializeTimelineSettings = ({
  id,
  timelineById,
  timelineSettingsProps,
}: InitializeTimelineParams): TimelineById => {
  const timeline = timelineById[id];

  return !timeline?.initialized
    ? {
        ...timelineById,
        [id]: {
          ...timelineDefaults,
          ...getTimelineManageDefaults(id),
          ...timeline,
          ...timelineSettingsProps,
          ...(!timeline ||
          (isEmpty(timeline.columns) && !isEmpty(timelineSettingsProps.defaultColumns))
            ? { columns: timelineSettingsProps.defaultColumns }
            : {}),
          sort: timelineSettingsProps.sort ?? timelineDefaults.sort,
          loadingEventIds: timelineDefaults.loadingEventIds,
          initialized: true,
        },
      }
    : {
        ...timelineById,
        [id]: {
          ...timeline,
          ...timelineSettingsProps,
        },
      };
};

export const updateTimelineColumnWidth = ({
  columnId,
  id,
  timelineById,
  width,
}: {
  columnId: string;
  id: string;
  timelineById: TimelineById;
  width?: number;
}): TimelineById => {
  const timeline = timelineById[id];

  const columns = timeline.columns.map((x) => ({
    ...x,
    initialWidth: x.id === columnId ? width : x.initialWidth,
  }));

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};
