/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MiddlewareAPI, Dispatch, AnyAction } from 'redux';
import type { IHttpFetchError } from '@kbn/core/public';
import type { State } from '../../../common/store/types';
import { ALL_TIMELINE_QUERY_ID } from '../../containers/all';
import type { inputsModel } from '../../../common/store/inputs';
import { inputsSelectors } from '../../../common/store/inputs';
import type { TimelineModel } from '../model';
import { saveTimeline, updateTimeline } from '../actions';
import { TimelineStatusEnum } from '../../../../common/api/timeline';
import { selectTimelineById } from '../selectors';

/**
 * Refreshes all timelines, so changes are propagated to everywhere on the page
 */
export function refreshTimelines(state: State) {
  const allTimelineQuery = inputsSelectors.globalQueryByIdSelector()(state, ALL_TIMELINE_QUERY_ID);
  if (allTimelineQuery.refetch != null) {
    (allTimelineQuery.refetch as inputsModel.Refetch)();
  }
}

/**
 * Given a timeline model, it will return that model when the timeline has been saved before,
 * or save a draft version of that timeline.
 * This is a usefull check for when you're working with timeline-associated saved objects
 * which require the exitence of a timeline's `savedObjectId`.
 */
export async function ensureTimelineIsSaved({
  localTimelineId,
  timeline,
  store,
}: {
  localTimelineId: string;
  timeline: TimelineModel;
  store: MiddlewareAPI<Dispatch<AnyAction>, State>;
}) {
  // In case `savedObjectId` exists, the timeline has been saved before.
  if (timeline.savedObjectId) {
    return timeline;
  }

  // The timeline hasn't been saved, so let's create make it a draft.
  await store.dispatch(
    updateTimeline({
      id: localTimelineId,
      timeline: {
        ...timeline,
        status: TimelineStatusEnum.draft,
      },
    })
  );

  // The draft needs to be persisted
  await store.dispatch(saveTimeline({ id: localTimelineId, saveAsNew: false }));

  // Make sure we're returning the most updated version of the timeline
  return selectTimelineById(store.getState(), localTimelineId);
}

export function isHttpFetchError(
  error: unknown
): error is IHttpFetchError<{ status_code: number }> {
  return (
    error !== null &&
    typeof error === 'object' &&
    'body' in error &&
    error.body !== null &&
    typeof error.body === 'object' &&
    `status_code` in error.body &&
    typeof error.body.status_code === 'number'
  );
}
