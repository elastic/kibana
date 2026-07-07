/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import type { Action, Middleware } from 'redux';
import type { CoreStart } from '@kbn/core/public';

import type { State } from '../../../common/store/types';
import { selectTimelineById } from '../selectors';
import * as i18n from '../../pages/translations';
import {
  pinEvent,
  endTimelineSaving,
  unPinEvent,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
} from '../actions';
import { persistPinnedEvent } from '../../containers/pinned_event/api';
import { ensureTimelineIsSaved, isHttpFetchError, refreshTimelines } from './helpers';

type PinnedEventAction = ReturnType<typeof pinEvent | typeof unPinEvent>;

const timelinePinnedEventActionsType = new Set([pinEvent.type, unPinEvent.type]);

function isPinnedEventAction(action: Action): action is PinnedEventAction {
  return timelinePinnedEventActionsType.has(action.type);
}

export const addPinnedEventToTimelineMiddleware: (kibana: CoreStart) => Middleware<{}, State> =
  (kibana: CoreStart) => (store) => (next) => async (action: Action) => {
    // perform the action
    const ret = next(action);

    if (isPinnedEventAction(action)) {
      const { id: localTimelineId, eventId } = action.payload;

      store.dispatch(startTimelineSaving({ id: localTimelineId }));

      try {
        // In case an event is pinned on an unsaved timeline, we need to make sure
        // the timeline has been saved or is in draft state. Otherwise, `timelineId` will be `null`
        // and we're creating orphaned pinned events.
        const timeline = await ensureTimelineIsSaved({
          localTimelineId,
          timeline: selectTimelineById(store.getState(), localTimelineId),
          store,
        });

        if (!timeline.savedObjectId) {
          throw new Error('Cannot create a pinned event without a timelineId');
        }

        const response = await persistPinnedEvent({
          pinnedEventId:
            timeline.pinnedEventsSaveObject[eventId] != null
              ? timeline.pinnedEventsSaveObject[eventId].pinnedEventId
              : null,
          eventId,
          timelineId: timeline.savedObjectId,
        });

        refreshTimelines(store.getState());

        const currentTimeline = selectTimelineById(store.getState(), action.payload.id);
        if ('unpinned' in response) {
          return store.dispatch(
            updateTimeline({
              id: action.payload.id,
              timeline: {
                ...currentTimeline,
                pinnedEventIds: omit(eventId, currentTimeline.pinnedEventIds),
                pinnedEventsSaveObject: omit(eventId, currentTimeline.pinnedEventsSaveObject),
              },
            })
          );
        } else {
          const updatedTimeline = {
            ...currentTimeline,
            pinnedEventIds: {
              ...currentTimeline.pinnedEventIds,
              [eventId]: true,
            },
            pinnedEventsSaveObject: {
              ...currentTimeline.pinnedEventsSaveObject,
              [eventId]: response,
            },
          };

          await store.dispatch(
            updateTimeline({
              id: action.payload.id,
              timeline: updatedTimeline,
            })
          );
        }
      } catch (error) {
        if (isHttpFetchError(error) && error.body?.status_code === 403) {
          store.dispatch(showCallOutUnauthorizedMsg());
        } else {
          kibana.notifications.toasts.addDanger({
            title: i18n.UPDATE_TIMELINE_ERROR_TITLE,
            text: error?.message ?? i18n.UPDATE_TIMELINE_ERROR_TEXT,
          });
        }
      } finally {
        store.dispatch(
          endTimelineSaving({
            id: localTimelineId,
          })
        );
      }
    }

    return ret;
  };
