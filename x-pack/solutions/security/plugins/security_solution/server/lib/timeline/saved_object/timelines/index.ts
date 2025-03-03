/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import {
  type SavedObjectsClientContract,
  type SavedObjectsFindOptions,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/server';

import { UNAUTHENTICATED_USER } from '../../../../../common/constants';
import type {
  Note,
  BareNote,
  PinnedEvent,
  GetTimelinesResponse,
  ExportTimelineNotFoundError,
  PageInfoTimeline,
  FavoriteTimelineResponse,
  SortTimeline,
  TimelineResponse,
  TimelineType,
  TimelineStatus,
  ResolvedTimeline,
  SavedTimeline,
  SavedTimelineWithSavedObjectId,
} from '../../../../../common/api/timeline';
import { TimelineStatusEnum, TimelineTypeEnum } from '../../../../../common/api/timeline';
import type { SavedObjectTimelineWithoutExternalRefs } from '../../../../../common/types/timeline/saved_object';
import type { FrameworkRequest } from '../../../framework';
import * as note from '../notes/saved_object';
import * as pinnedEvent from '../pinned_events';
import { deleteSearchByTimelineId } from '../saved_search';
import { convertSavedObjectToSavedTimeline } from './convert_saved_object_to_savedtimeline';
import { pickSavedTimeline } from './pick_saved_timeline';
import { timelineSavedObjectType } from '../../saved_object_mappings';
import { draftTimelineDefaults } from '../../utils/default_timeline';
import { timelineFieldsMigrator } from './field_migrator';

export { pickSavedTimeline } from './pick_saved_timeline';
export { convertSavedObjectToSavedTimeline } from './convert_saved_object_to_savedtimeline';

type TimelineWithoutExternalRefs = Omit<SavedTimeline, 'dataViewId' | 'savedQueryId'>;

export const getTimeline = async (
  request: FrameworkRequest,
  timelineId: string,
  timelineType: TimelineType | null = TimelineTypeEnum.default
): Promise<TimelineResponse> => {
  let timelineIdToUse = timelineId;
  try {
    if (timelineType === TimelineTypeEnum.template) {
      const options = {
        type: timelineSavedObjectType,
        perPage: 1,
        page: 1,
        filter: `siem-ui-timeline.attributes.templateTimelineId: ${timelineId}`,
      };
      const result = await getAllSavedTimeline(request, options);
      if (result.totalCount === 1) {
        timelineIdToUse = result.timeline[0].savedObjectId;
      }
    }
  } catch {
    // TO DO, we need to bring the logger here
  }
  return getSavedTimeline(request, timelineIdToUse);
};

export const getTimelineOrNull = async (
  frameworkRequest: FrameworkRequest,
  savedObjectId: string
): Promise<TimelineResponse | null> => {
  let timeline = null;
  try {
    timeline = await getTimeline(frameworkRequest, savedObjectId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return timeline;
};

export const resolveTimelineOrNull = async (
  frameworkRequest: FrameworkRequest,
  savedObjectId: string
): Promise<ResolvedTimeline | null> => {
  try {
    const resolvedTimeline = await resolveSavedTimeline(frameworkRequest, savedObjectId);
    return resolvedTimeline;
  } catch (e) {
    return null;
  }
};

export const getTimelineByTemplateTimelineId = async (
  request: FrameworkRequest,
  templateTimelineId: string
): Promise<GetTimelinesResponse> => {
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    filter: `siem-ui-timeline.attributes.templateTimelineId: "${templateTimelineId}"`,
  };

  return getAllSavedTimeline(request, options);
};

export const getTimelineTemplateOrNull = async (
  frameworkRequest: FrameworkRequest,
  templateTimelineId: string
): Promise<TimelineResponse | null> => {
  let templateTimeline = null;
  try {
    templateTimeline = await getTimelineByTemplateTimelineId(frameworkRequest, templateTimelineId);
  } catch (e) {
    return null;
  }
  return templateTimeline?.timeline[0] ?? null;
};

/** The filter here is able to handle the legacy data,
 * which has no timelineType exists in the savedObject */
const getTimelineTypeFilter = (
  timelineType: TimelineType | null,
  status: TimelineStatus | null
) => {
  const typeFilter =
    timelineType == null
      ? null
      : timelineType === TimelineTypeEnum.template
      ? `siem-ui-timeline.attributes.timelineType: ${TimelineTypeEnum.template}` /** Show only whose timelineType exists and equals to "template" */
      : /** Show me every timeline whose timelineType is not "template".
         * which includes timelineType === 'default' and
         * those timelineType doesn't exists */
        `not siem-ui-timeline.attributes.timelineType: ${TimelineTypeEnum.template}`;

  /** Show me every timeline whose status is not "draft".
   * which includes status === 'active' and
   * those status doesn't exists */
  const draftFilter =
    status === TimelineStatusEnum.draft
      ? `siem-ui-timeline.attributes.status: ${TimelineStatusEnum.draft}`
      : `not siem-ui-timeline.attributes.status: ${TimelineStatusEnum.draft}`;

  const immutableFilter =
    status == null
      ? null
      : status === TimelineStatusEnum.immutable
      ? `siem-ui-timeline.attributes.status: ${TimelineStatusEnum.immutable}`
      : `not siem-ui-timeline.attributes.status: ${TimelineStatusEnum.immutable}`;

  const filters = [typeFilter, draftFilter, immutableFilter];
  return combineFilters(filters);
};

const getTimelineFavoriteFilter = ({
  onlyUserFavorite,
  request,
}: {
  onlyUserFavorite: boolean | null;
  request: FrameworkRequest;
}) => {
  if (!onlyUserFavorite) {
    return null;
  }
  const username = request.user?.username ?? UNAUTHENTICATED_USER;
  return `siem-ui-timeline.attributes.favorite.keySearch: ${convertStringToBase64(username)}`;
};

const combineFilters = (filters: Array<string | null>) =>
  filters.filter((f) => f != null).join(' and ');

const getTimelinesCreatedAndUpdatedByCurrentUser = ({ request }: { request: FrameworkRequest }) => {
  const username = request.user?.username ?? UNAUTHENTICATED_USER;
  const updatedBy = `siem-ui-timeline.attributes.updatedBy: "${username}"`;
  const createdBy = `siem-ui-timeline.attributes.createdBy: "${username}"`;
  return combineFilters([updatedBy, createdBy]);
};

export const getExistingPrepackagedTimelines = async (
  request: FrameworkRequest,
  countsOnly?: boolean,
  pageInfo?: PageInfoTimeline
): Promise<GetTimelinesResponse> => {
  const queryPageInfo =
    countsOnly && pageInfo == null
      ? {
          perPage: 1,
          page: 1,
        }
      : { perPage: pageInfo?.pageSize, page: pageInfo?.pageIndex } ?? {};
  const elasticTemplateTimelineOptions = {
    type: timelineSavedObjectType,
    ...queryPageInfo,
    filter: getTimelineTypeFilter(TimelineTypeEnum.template, TimelineStatusEnum.immutable),
  };

  return getAllSavedTimeline(request, elasticTemplateTimelineOptions);
};

export const getAllTimeline = async (
  request: FrameworkRequest,
  onlyUserFavorite: boolean | null,
  pageInfo: PageInfoTimeline,
  search: string | null,
  sort: SortTimeline | null,
  status: TimelineStatus | null,
  timelineType: TimelineType | null
): Promise<GetTimelinesResponse> => {
  const searchTerm = search != null ? search : undefined;
  const searchFields = ['title', 'description'];
  const filter = combineFilters([
    getTimelineTypeFilter(timelineType ?? null, status ?? null),
    getTimelineFavoriteFilter({ onlyUserFavorite, request }),
  ]);
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    perPage: pageInfo.pageSize,
    page: pageInfo.pageIndex,
    filter,
    search: searchTerm,
    searchFields,
    sortField: sort != null ? sort.sortField : undefined,
    sortOrder: sort != null ? sort.sortOrder : undefined,
  };

  const timelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(TimelineTypeEnum.default, TimelineStatusEnum.active),
  };

  const templateTimelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(TimelineTypeEnum.template, null),
  };

  const customTemplateTimelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(TimelineTypeEnum.template, TimelineStatusEnum.active),
  };

  const favoriteTimelineOptions = {
    type: timelineSavedObjectType,
    search: searchTerm,
    searchFields,
    perPage: 1,
    page: 1,
    filter: combineFilters([
      getTimelineTypeFilter(timelineType ?? null, TimelineStatusEnum.active),
      getTimelineFavoriteFilter({ onlyUserFavorite: true, request }),
    ]),
  };

  const result = await Promise.all([
    getAllSavedTimeline(request, options),
    getAllSavedTimeline(request, timelineOptions),
    getAllSavedTimeline(request, templateTimelineOptions),
    getExistingPrepackagedTimelines(request, true),
    getAllSavedTimeline(request, customTemplateTimelineOptions),
    getAllSavedTimeline(request, favoriteTimelineOptions),
  ]);

  return Promise.resolve({
    ...result[0],
    defaultTimelineCount: result[1].totalCount,
    templateTimelineCount: result[2].totalCount,
    elasticTemplateTimelineCount: result[3].totalCount,
    customTemplateTimelineCount: result[4].totalCount,
    favoriteCount: result[5].totalCount,
  });
};

export const getDraftTimeline = async (
  request: FrameworkRequest,
  timelineType: TimelineType | null
): Promise<GetTimelinesResponse> => {
  const filter = combineFilters([
    getTimelineTypeFilter(timelineType ?? null, TimelineStatusEnum.draft),
    getTimelinesCreatedAndUpdatedByCurrentUser({ request }),
  ]);
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    filter,
    sortField: 'created',
    sortOrder: 'desc',
  };
  return getAllSavedTimeline(request, options);
};

interface InternalPersistFavoriteResponse {
  code: number;
  message: string;
  favoriteTimeline: FavoriteTimelineResponse;
}

export const persistFavorite = async (
  request: FrameworkRequest,
  timelineId: string | null,
  templateTimelineId: string | null,
  templateTimelineVersion: number | null,
  timelineType: TimelineType
): Promise<InternalPersistFavoriteResponse> => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;
  const fullName = request.user?.full_name ?? '';
  let timeline: SavedTimeline = {};
  if (timelineId != null) {
    const {
      eventIdToNoteIds,
      notes,
      noteIds,
      pinnedEventIds,
      pinnedEventsSaveObject,
      savedObjectId,
      version,
      ...savedTimeline
    } = await getBasicSavedTimeline(request, timelineId);
    timelineId = savedObjectId; // eslint-disable-line no-param-reassign
    timeline = savedTimeline;
  }

  const userFavoriteTimeline = {
    keySearch: userName != null ? convertStringToBase64(userName) : null,
    favoriteDate: new Date().valueOf(),
    fullName,
    userName,
  };
  if (timeline.favorite != null) {
    const alreadyExistsTimelineFavoriteByUser = timeline.favorite.findIndex(
      (user) => user.userName === userName
    );

    timeline.favorite =
      alreadyExistsTimelineFavoriteByUser > -1
        ? [
            ...timeline.favorite.slice(0, alreadyExistsTimelineFavoriteByUser),
            ...timeline.favorite.slice(alreadyExistsTimelineFavoriteByUser + 1),
          ]
        : [...timeline.favorite, userFavoriteTimeline];
  } else if (timeline.favorite == null) {
    timeline.favorite = [userFavoriteTimeline];
  }

  const persistResponse = await persistTimeline(request, timelineId, null, {
    ...timeline,
    templateTimelineId,
    templateTimelineVersion,
    timelineType,
  });
  return {
    favoriteTimeline: {
      savedObjectId: persistResponse.timeline.savedObjectId,
      version: persistResponse.timeline.version,
      favorite:
        persistResponse.timeline.favorite != null
          ? persistResponse.timeline.favorite.filter((fav) => fav.userName === userName)
          : [],
      templateTimelineId,
      templateTimelineVersion,
      timelineType,
    },
    code: persistResponse.code,
    message: persistResponse.message,
  };
};

export interface InternalTimelineResponse {
  code: number;
  message: string;
  timeline: TimelineResponse;
}

export const persistTimeline = async (
  request: FrameworkRequest,
  timelineId: string | null,
  version: string | null,
  timeline: SavedTimeline,
  isImmutable?: boolean
): Promise<InternalTimelineResponse> => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const userInfo = isImmutable ? ({ username: 'Elastic' } as AuthenticatedUser) : request.user;
  try {
    if (timelineId == null) {
      return await createTimeline({ timelineId, timeline, userInfo, savedObjectsClient });
    }
    return await updateTimeline({
      request,
      timelineId,
      timeline,
      userInfo,
      savedObjectsClient,
      version,
    });
  } catch (err) {
    if (timelineId != null && SavedObjectsErrorHelpers.isConflictError(err)) {
      return {
        code: 409,
        message: err.message,
        timeline: await getSavedTimeline(request, timelineId),
      };
    } else if (getOr(null, 'output.statusCode', err) === 403) {
      const timelineToReturn: TimelineResponse = {
        ...timeline,
        savedObjectId: '',
        version: '',
      };
      return {
        code: 403,
        message: err.message,
        timeline: timelineToReturn,
      };
    }
    throw err;
  }
};

export const createTimeline = async ({
  timelineId,
  timeline,
  savedObjectsClient,
  userInfo,
}: {
  timelineId: string | null;
  timeline: SavedTimeline;
  savedObjectsClient: SavedObjectsClientContract;
  userInfo: AuthenticatedUser | null;
}): Promise<InternalTimelineResponse> => {
  const { transformedFields: migratedAttributes, references } =
    timelineFieldsMigrator.extractFieldsToReferences<TimelineWithoutExternalRefs>({
      data: pickSavedTimeline(timelineId, timeline, userInfo),
    });

  const createdTimeline = await savedObjectsClient.create<TimelineWithoutExternalRefs>(
    timelineSavedObjectType,
    migratedAttributes,
    {
      references,
    }
  );

  const repopulatedSavedObject =
    timelineFieldsMigrator.populateFieldsFromReferences(createdTimeline);

  // Create new timeline
  const newTimeline = convertSavedObjectToSavedTimeline(repopulatedSavedObject);
  return {
    code: 200,
    message: 'success',
    timeline: newTimeline,
  };
};

const updateTimeline = async ({
  request,
  timelineId,
  timeline,
  savedObjectsClient,
  userInfo,
  version,
}: {
  request: FrameworkRequest;
  timelineId: string;
  timeline: SavedTimeline;
  savedObjectsClient: SavedObjectsClientContract;
  userInfo: AuthenticatedUser | null;
  version: string | null;
}): Promise<InternalTimelineResponse> => {
  const rawTimelineSavedObject =
    await savedObjectsClient.get<SavedObjectTimelineWithoutExternalRefs>(
      timelineSavedObjectType,
      timelineId
    );

  const { transformedFields: migratedPatchAttributes, references } =
    timelineFieldsMigrator.extractFieldsToReferences<TimelineWithoutExternalRefs>({
      data: pickSavedTimeline(timelineId, timeline, userInfo),
      existingReferences: rawTimelineSavedObject.references,
    });

  // Update Timeline
  await savedObjectsClient.update(timelineSavedObjectType, timelineId, migratedPatchAttributes, {
    version: version || undefined,
    references,
  });

  return {
    code: 200,
    message: 'success',
    timeline: await getSavedTimeline(request, timelineId),
  };
};

export const updatePartialSavedTimeline = async (
  request: FrameworkRequest,
  timelineId: string,
  timeline: SavedTimeline
) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const currentSavedTimeline = await savedObjectsClient.get<SavedObjectTimelineWithoutExternalRefs>(
    timelineSavedObjectType,
    timelineId
  );

  const { transformedFields, references } = timelineFieldsMigrator.extractFieldsToReferences<
    Omit<SavedTimelineWithSavedObjectId, 'dataViewId' | 'savedQueryId'>
  >({
    data: timeline,
    existingReferences: currentSavedTimeline.references,
  });

  const timelineUpdateAttributes = pickSavedTimeline(
    null,
    {
      ...transformedFields,
      dateRange: currentSavedTimeline.attributes.dateRange,
    },
    request.user
  );

  const updatedTimeline = await savedObjectsClient.update<TimelineWithoutExternalRefs>(
    timelineSavedObjectType,
    timelineId,
    timelineUpdateAttributes,
    { references }
  );

  const populatedTimeline =
    timelineFieldsMigrator.populateFieldsFromReferencesForPatch<TimelineWithoutExternalRefs>({
      dataBeforeRequest: timeline,
      dataReturnedFromRequest: updatedTimeline,
    });

  return populatedTimeline;
};

export const resetTimeline = async (
  request: FrameworkRequest,
  timelineId: string,
  timelineType: TimelineType
) => {
  await Promise.all([
    note.deleteNotesByTimelineId(request, timelineId),
    pinnedEvent.deleteAllPinnedEventsOnTimeline(request, timelineId),
  ]);

  const response = await updatePartialSavedTimeline(request, timelineId, {
    ...draftTimelineDefaults,
    timelineType,
  });

  return response;
};

export const deleteTimeline = async (
  request: FrameworkRequest,
  timelineIds: string[],
  searchIds?: string[]
) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;

  await Promise.all([
    ...timelineIds.map((timelineId) =>
      Promise.all([
        savedObjectsClient.delete(timelineSavedObjectType, timelineId),
        note.deleteNotesByTimelineId(request, timelineId),
        pinnedEvent.deleteAllPinnedEventsOnTimeline(request, timelineId),
      ])
    ),
    deleteSearchByTimelineId(request, searchIds),
  ]);
};

export const copyTimeline = async (
  request: FrameworkRequest,
  timeline: SavedTimeline,
  timelineId: string
): Promise<InternalTimelineResponse> => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;

  // Fetch all objects that need to be copied
  const [notes, pinnedEvents] = await Promise.all([
    note.getNotesByTimelineId(request, timelineId),
    pinnedEvent.getAllPinnedEventsByTimelineId(request, timelineId),
  ]);

  const isImmutable = timeline.status === TimelineStatusEnum.immutable;
  const userInfo = isImmutable ? ({ username: 'Elastic' } as AuthenticatedUser) : request.user;

  const timelineResponse = await createTimeline({
    savedObjectsClient,
    timeline,
    timelineId: null,
    userInfo,
  });

  const newTimelineId = timelineResponse.timeline.savedObjectId;

  const copiedNotes = Promise.all(
    notes.map((_note) => {
      const newNote: BareNote = {
        ..._note,
        timelineId: newTimelineId,
      };
      return note.persistNote({
        request,
        noteId: null,
        note: newNote,
        overrideOwner: false,
      });
    })
  );

  const copiedPinnedEvents = pinnedEvents.map((_pinnedEvent) => {
    return pinnedEvent.persistPinnedEventOnTimeline(
      request,
      null,
      _pinnedEvent.eventId,
      newTimelineId
    );
  });

  await Promise.all([copiedNotes, copiedPinnedEvents]);

  return {
    code: 200,
    message: 'success',
    timeline: await getSavedTimeline(request, newTimelineId),
  };
};

const resolveBasicSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const { saved_object: savedObject, ...resolveAttributes } =
    await savedObjectsClient.resolve<SavedObjectTimelineWithoutExternalRefs>(
      timelineSavedObjectType,
      timelineId
    );

  const populatedTimeline = timelineFieldsMigrator.populateFieldsFromReferences(savedObject);

  return {
    resolvedTimelineSavedObject: convertSavedObjectToSavedTimeline(populatedTimeline),
    ...resolveAttributes,
  };
};

const resolveSavedTimeline = async (
  request: FrameworkRequest,
  timelineId: string
): Promise<ResolvedTimeline> => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;

  const { resolvedTimelineSavedObject, ...resolveAttributes } = await resolveBasicSavedTimeline(
    request,
    timelineId
  );

  const timelineWithNotesAndPinnedEvents = await Promise.all([
    note.getNotesByTimelineId(request, resolvedTimelineSavedObject.savedObjectId),
    pinnedEvent.getAllPinnedEventsByTimelineId(request, resolvedTimelineSavedObject.savedObjectId),
    resolvedTimelineSavedObject,
  ]);

  const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;
  return {
    timeline: timelineWithReduxProperties(notes, pinnedEvents, timeline, userName),
    ...resolveAttributes,
  };
};

const getBasicSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const savedObject = await savedObjectsClient.get<SavedObjectTimelineWithoutExternalRefs>(
    timelineSavedObjectType,
    timelineId
  );

  const populatedTimeline = timelineFieldsMigrator.populateFieldsFromReferences(savedObject);

  return convertSavedObjectToSavedTimeline(populatedTimeline);
};

const getSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;

  const timelineSaveObject = await getBasicSavedTimeline(request, timelineId);

  const timelineWithNotesAndPinnedEvents = await Promise.all([
    note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
    pinnedEvent.getAllPinnedEventsByTimelineId(request, timelineSaveObject.savedObjectId),
    Promise.resolve(timelineSaveObject),
  ]);

  const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

  return timelineWithReduxProperties(notes, pinnedEvents, timeline, userName);
};

const getAllSavedTimeline = async (request: FrameworkRequest, options: SavedObjectsFindOptions) => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;
  const savedObjectsClient = (await request.context.core).savedObjects.client;

  const savedObjects = await savedObjectsClient.find<SavedObjectTimelineWithoutExternalRefs>(
    options
  );

  const timelinesWithNotesAndPinnedEvents = await Promise.all(
    savedObjects.saved_objects.map(async (savedObject) => {
      const migratedSO = timelineFieldsMigrator.populateFieldsFromReferences(savedObject);

      const timelineSaveObject = convertSavedObjectToSavedTimeline(migratedSO);

      return Promise.all([
        note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
        pinnedEvent.getAllPinnedEventsByTimelineId(request, timelineSaveObject.savedObjectId),
        timelineSaveObject,
      ]);
    })
  );
  return {
    totalCount: savedObjects.total,
    timeline: timelinesWithNotesAndPinnedEvents.map(([notes, pinnedEvents, timeline]) =>
      timelineWithReduxProperties(notes, pinnedEvents, timeline, userName)
    ),
  };
};

export const convertStringToBase64 = (text: string): string => Buffer.from(text).toString('base64');

export const timelineWithReduxProperties = (
  notes: Note[],
  pinnedEvents: PinnedEvent[],
  timeline: TimelineResponse,
  userName: string
): TimelineResponse => ({
  ...timeline,
  favorite:
    timeline.favorite != null && userName != null
      ? timeline.favorite.filter((fav) => fav.userName === userName)
      : [],
  eventIdToNoteIds: notes.filter((n) => n.eventId != null),
  noteIds: notes.filter((n) => n.eventId == null && n.noteId != null).map((n) => n.noteId),
  notes,
  pinnedEventIds: pinnedEvents.map((e) => e.eventId),
  pinnedEventsSaveObject: pinnedEvents,
});

export const getSelectedTimelines = async (
  request: FrameworkRequest,
  timelineIds?: string[] | null
) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  let exportedIds = timelineIds;
  if (timelineIds == null || timelineIds.length === 0) {
    const { timeline: savedAllTimelines } = await getAllTimeline(
      request,
      false,
      {
        pageIndex: 1,
        pageSize: timelineIds?.length ?? 0,
      },
      null,
      null,
      TimelineStatusEnum.active,
      null
    );
    exportedIds = savedAllTimelines.map((t) => t.savedObjectId);
  }

  const savedObjects = await Promise.resolve(
    savedObjectsClient.bulkGet<SavedObjectTimelineWithoutExternalRefs>(
      (exportedIds ?? []).reduce(
        (acc, timelineId) => [...acc, { id: timelineId, type: timelineSavedObjectType }],
        [] as Array<{ id: string; type: string }>
      )
    )
  );

  const timelineObjects: {
    timelines: TimelineResponse[];
    errors: ExportTimelineNotFoundError[];
  } = savedObjects.saved_objects.reduce(
    (acc, savedObject) => {
      if (savedObject.error == null) {
        const populatedTimeline = timelineFieldsMigrator.populateFieldsFromReferences(savedObject);

        return {
          errors: acc.errors,
          timelines: [...acc.timelines, convertSavedObjectToSavedTimeline(populatedTimeline)],
        };
      }

      return { errors: [...acc.errors, savedObject.error], timelines: acc.timelines };
    },
    {
      timelines: [] as TimelineResponse[],
      errors: [] as ExportTimelineNotFoundError[],
    }
  );

  return timelineObjects;
};
