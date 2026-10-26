/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationTimelineEvent } from './types';

const isTimelineEvent = (value: unknown): value is InvestigationTimelineEvent => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const event = value as { timestamp?: unknown; host?: unknown; description?: unknown };
  return (
    typeof event.timestamp === 'string' &&
    event.timestamp !== '' &&
    typeof event.host === 'string' &&
    event.host !== '' &&
    typeof event.description === 'string' &&
    event.description !== ''
  );
};

/** Keeps only events that have a timestamp, host, and description. */
export const parseTimelineEvents = (data: unknown): InvestigationTimelineEvent[] => {
  if (typeof data !== 'object' || data === null) return [];
  const { events } = data as { events?: unknown };
  return Array.isArray(events) ? events.filter(isTimelineEvent) : [];
};
