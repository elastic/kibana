/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export * from './index_fields';

import * as timelineSchemas from './timeline/timeline';

export * from './timeline/timeline';

export * from './model/timeline_events_queries';

export * from './model/runtime_mappings';

export const searchStrategyRequestSchema = z.discriminatedUnion('factoryQueryType', [
  timelineSchemas.timelineEventsAllSchema,
  timelineSchemas.timelineEventsDetailsSchema,
  timelineSchemas.timelineEventsLastEventTimeRequestSchema,
  timelineSchemas.timelineKpiRequestOptionsSchema,
]);
