/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Calendar } from '../../../../../plugins/ml/server/models/calendar';

type ScheduledEvent = estypes.MlCalendarEvent;

export const assertAllEventsExistInCalendar = (
  eventsToCheck: ScheduledEvent[],
  calendar: Calendar
): boolean => {
  const updatedCalendarEvents = calendar.events;
  let allEventsAreUpdated = true;
  for (const eventToCheck of eventsToCheck) {
    // if at least one of the events that we need to check is not in the updated events
    // no need to continue
    if (
      updatedCalendarEvents.findIndex(
        (updatedEvent) =>
          updatedEvent.description === eventToCheck.description &&
          updatedEvent.start_time === eventToCheck.start_time &&
          updatedEvent.end_time === eventToCheck.end_time
      ) < 0
    ) {
      allEventsAreUpdated = false;
      break;
    }
  }
  return allEventsAreUpdated;
};
