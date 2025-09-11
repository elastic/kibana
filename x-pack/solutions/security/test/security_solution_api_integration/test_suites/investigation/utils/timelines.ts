/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  GetTimelinesResponse,
  SavedTimeline,
  SavedTimelineWithSavedObjectId,
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

/**
 * Deletes the first 100 timelines.
 * This works in ess, serverless and on the MKI environments as it avoids having to look at hidden indexes.
 */
export const deleteTimelines = async (supertest: SuperTest.Agent): Promise<void> => {
  const response = await getTimelines(supertest);
  const { timeline: timelines } = response.body as GetTimelinesResponse;

  await supertest
    .delete(TIMELINE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      savedObjectIds: timelines.map(
        (timeline: SavedTimelineWithSavedObjectId) => timeline.savedObjectId
      ),
    });
};

export const deleteTimeline = (supertest: SuperTest.Agent, savedObjectId: string) =>
  supertest
    .delete(TIMELINE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      savedObjectIds: [savedObjectId],
    });

export const patchTimeline = (
  supertest: SuperTest.Agent,
  timelineId: string,
  version: string,
  timelineObj: unknown
) =>
  supertest.patch(TIMELINE_URL).set('kbn-xsrf', 'true').send({
    timelineId,
    version,
    timeline: timelineObj,
  });

export const createBasicTimeline = async (supertest: SuperTest.Agent, titleToSaved: string) =>
  await supertest
    .post(TIMELINE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      timelineId: null,
      version: null,
      timeline: {
        title: titleToSaved,
      },
    });

export const createBasicTimelineTemplate = async (
  supertest: SuperTest.Agent,
  titleToSaved: string
) =>
  await supertest
    .post(TIMELINE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      timelineId: null,
      version: null,
      timeline: {
        title: titleToSaved,
        templateTimelineId: uuidv4(),
        templateTimelineVersion: 1,
        timelineType: TimelineTypeEnum.template,
      },
    });

export const getTimelines = (supertest: SuperTest.Agent) =>
  supertest.get(TIMELINES_URL).set('kbn-xsrf', 'true').set('elastic-api-version', '2023-10-31');

export const resolveTimeline = (supertest: SuperTest.Agent, timelineId: string) =>
  supertest
    .get(`${TIMELINE_RESOLVE_URL}?id=${timelineId}`)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31');

export const favoriteTimeline = (supertest: SuperTest.Agent, timelineId: string) =>
  supertest
    .patch(TIMELINE_FAVORITE_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send({
      timelineId,
      templateTimelineId: null,
      templateTimelineVersion: null,
      timelineType: null,
    });

export const pinEvent = (supertest: SuperTest.Agent, timelineId: string, eventId: string) =>
  supertest
    .patch(PINNED_EVENT_URL)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31')
    .send({
      timelineId,
      eventId,
    });

export const copyTimeline = (
  supertest: SuperTest.Agent,
  timelineId: string,
  timelineObj: SavedTimeline
) =>
  supertest.post(TIMELINE_COPY_URL).set('kbn-xsrf', 'true').set('elastic-api-version', '1').send({
    timelineIdToCopy: timelineId,
    timeline: timelineObj,
  });

export const installPrepackedTimelines = (supertest: SuperTest.Agent) =>
  supertest.post(TIMELINE_PREPACKAGED_URL).set('kbn-xsrf', 'true').send();
