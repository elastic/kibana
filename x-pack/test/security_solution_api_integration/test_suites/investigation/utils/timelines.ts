/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  CopyTimelineRequestBody,
  CopyTimelineResponse,
  CreateTimelinesRequestBody,
  CreateTimelinesResponse,
  DeleteTimelinesRequestBody,
  GetTimelinesResponse,
  GetTimelinesRequestQuery,
  PatchTimelineRequestBody,
  PersistFavoriteRouteRequestBody,
  PersistFavoriteRouteResponse,
  PersistPinnedEventRouteRequestBody,
  PersistPinnedEventResponse,
  ResolveTimelineResponse,
  SavedTimeline,
  TimelineTypeEnum,
} from '@kbn/security-solution-plugin/common/api/timeline';
import {
  TIMELINE_URL,
  TIMELINES_URL,
  TIMELINE_FAVORITE_URL,
  PINNED_EVENT_URL,
  TIMELINE_COPY_URL,
  TIMELINE_RESOLVE_URL,
  TIMELINE_PREPACKAGED_URL,
} from '@kbn/security-solution-plugin/common/constants';

import { type SuperTestResponse } from './types';

/**
 * Deletes the first 100 timelines.
 * This works in ess, serverless and on the MKI environments as it avoids having to look at hidden indexes.
 */
export const deleteTimelines = async (
  supertest: SuperTest.Agent
): Promise<SuperTestResponse<void>> => {
  const response = await getTimelines(supertest);
  const { timeline: timelines } = response.body;
  const deleteRequestBody: DeleteTimelinesRequestBody = {
    savedObjectIds: timelines.map((timeline) => timeline.savedObjectId),
  };

  return await supertest.delete(TIMELINE_URL).set('kbn-xsrf', 'true').send(deleteRequestBody);
};

export const deleteTimeline = async (
  supertest: SuperTest.Agent,
  savedObjectId: string
): Promise<SuperTestResponse<void>> => {
  const deleteRequestBody: DeleteTimelinesRequestBody = {
    savedObjectIds: [savedObjectId],
  };

  return await supertest.delete(TIMELINE_URL).set('kbn-xsrf', 'true').send(deleteRequestBody);
};

export const patchTimeline = (
  supertest: SuperTest.Agent,
  timelineId: string,
  version: string,
  timelineObj: SavedTimeline
) => {
  const patchRequestBody: PatchTimelineRequestBody = {
    timelineId,
    version,
    timeline: timelineObj,
  };
  return supertest.patch(TIMELINE_URL).set('kbn-xsrf', 'true').send(patchRequestBody);
};

export const createBasicTimeline = async (
  supertest: SuperTest.Agent,
  titleToSaved: string
): Promise<SuperTestResponse<CreateTimelinesResponse>> => {
  const createTimelineBody: CreateTimelinesRequestBody = {
    timelineId: null,
    version: null,
    timeline: {
      title: titleToSaved,
    },
  };
  return await supertest.post(TIMELINE_URL).set('kbn-xsrf', 'true').send(createTimelineBody);
};

export const createBasicTimelineTemplate = async (
  supertest: SuperTest.Agent,
  titleToSaved: string
): Promise<SuperTestResponse<CreateTimelinesResponse>> => {
  const createTimelineTemplateBody: CreateTimelinesRequestBody = {
    timelineId: null,
    version: null,
    timeline: {
      title: titleToSaved,
      templateTimelineId: uuidv4(),
      templateTimelineVersion: 1,
      timelineType: TimelineTypeEnum.template,
    },
  };
  return await supertest
    .post(TIMELINE_URL)
    .set('kbn-xsrf', 'true')
    .send(createTimelineTemplateBody);
};

export const getTimelines = async (
  supertest: SuperTest.Agent,
  options?: GetTimelinesRequestQuery
): Promise<SuperTestResponse<GetTimelinesResponse>> => {
  let url: string = TIMELINES_URL;

  if (options) {
    url += '?';
    for (const [key, value] of Object.entries(options)) {
      url += `${key}=${value}&`;
    }
  }

  return await supertest.get(url).set('kbn-xsrf', 'true').set('elastic-api-version', '2023-10-31');
};

export const resolveTimeline = async (
  supertest: SuperTest.Agent,
  timelineId: string
): Promise<SuperTestResponse<ResolveTimelineResponse>> =>
  await supertest
    .get(`${TIMELINE_RESOLVE_URL}?id=${timelineId}`)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31');

export const favoriteTimeline = async (
  supertest: SuperTest.Agent,
  timelineId: string
): Promise<SuperTestResponse<PersistFavoriteRouteResponse>> => {
  const favoriteTimelineRequestBody: PersistFavoriteRouteRequestBody = {
    timelineId,
    templateTimelineId: null,
    templateTimelineVersion: null,
    timelineType: null,
  };
  return await supertest
    .patch(TIMELINE_FAVORITE_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send(favoriteTimelineRequestBody);
};

export const pinEvent = async (
  supertest: SuperTest.Agent,
  timelineId: string,
  eventId: string
): Promise<SuperTestResponse<PersistPinnedEventResponse>> => {
  const pinEventRequestBody: PersistPinnedEventRouteRequestBody = {
    timelineId,
    eventId,
  };
  return await supertest
    .patch(PINNED_EVENT_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send(pinEventRequestBody);
};

export const unPinEvent = async (
  supertest: SuperTest.Agent,
  timelineId: string,
  eventId: string,
  pinnedEventId: string
): Promise<SuperTestResponse<PersistPinnedEventResponse>> => {
  const pinEventRequestBody: PersistPinnedEventRouteRequestBody = {
    timelineId,
    eventId,
    pinnedEventId,
  };
  return await supertest
    .patch(PINNED_EVENT_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send(pinEventRequestBody);
};

export const copyTimeline = async (
  supertest: SuperTest.Agent,
  timelineId: string,
  timelineObj: SavedTimeline
): Promise<SuperTestResponse<CopyTimelineResponse>> => {
  const copyTimelineRequestBody: CopyTimelineRequestBody = {
    timelineIdToCopy: timelineId,
    timeline: timelineObj,
  };
  return supertest
    .post(TIMELINE_COPY_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '1')
    .send(copyTimelineRequestBody);
};

export const installPrepackedTimelines = async (
  supertest: SuperTest.Agent
): Promise<SuperTestResponse<void>> => {
  return await supertest.post(TIMELINE_PREPACKAGED_URL).set('kbn-xsrf', 'true').send();
};
