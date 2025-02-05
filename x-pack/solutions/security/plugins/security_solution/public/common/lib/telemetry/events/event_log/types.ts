/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum EventLogEventTypes {
  EventLogFilterByRunType = 'Event Log Filter By Run Type',
  EventLogShowSourceEventDateRange = 'Event Log -> Show Source -> Event Date Range',
}
interface ReportEventLogFilterByRunTypeParams {
  runType: string[];
}
interface ReportEventLogShowSourceEventDateRangeParams {
  isVisible: boolean;
}

export interface EventLogTelemetryEventsMap {
  [EventLogEventTypes.EventLogFilterByRunType]: ReportEventLogFilterByRunTypeParams;
  [EventLogEventTypes.EventLogShowSourceEventDateRange]: ReportEventLogShowSourceEventDateRangeParams;
}

export interface EventLogTelemetryEvent {
  eventType: EventLogEventTypes;
  schema: RootSchema<EventLogTelemetryEventsMap[EventLogEventTypes]>;
}
