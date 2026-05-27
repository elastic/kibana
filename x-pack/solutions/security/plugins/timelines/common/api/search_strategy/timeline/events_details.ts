/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { runtimeMappings } from '../model/runtime_mappings';
import { TimelineEventsQueries } from '../model/timeline_events_queries';
import { requestPaginated } from './request_paginated';

export const timelineEventsDetailsSchema = requestPaginated.partial().extend({
  indexName: z.string(),
  eventId: z.string(),
  authFilter: z.object({}).optional(),
  runtimeMappings,
  factoryQueryType: z.literal(TimelineEventsQueries.details),
});

export type TimelineEventsDetailsRequestOptionsInput = z.input<typeof timelineEventsDetailsSchema>;

export type TimelineEventsDetailsRequestOptions = z.infer<typeof timelineEventsDetailsSchema>;
