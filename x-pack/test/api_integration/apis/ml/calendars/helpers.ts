/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Calendar, CalendarEvent } from '../../../../../plugins/ml/server/models/calendar';

export const assertAllEventsExistInCalendar = (
  eventsToCheck: CalendarEvent[],
  calendar: Calendar
): boolean => {
  const updatedCalendarEvents = calendar.events as CalendarEvent[];
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
