/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { language } from '../model/language';
import { runtimeMappings } from '../model/runtime_mappings';
import { sortItem } from '../model/sort';
import { TimelineEventsQueries } from '../model/timeline_events_queries';
import { requestPaginated } from './request_paginated';

const extendedSortItem = sortItem.extend({
  esTypes: z.array(z.string()),
});

const sort = z.array(extendedSortItem);

export const timelineEventsAllSchema = requestPaginated.extend({
  authFilter: z.object({}).optional(),
  excludeEcsData: z.boolean().optional(),
  fieldRequested: z.array(z.string()),
  sort,
  filterQuery: z.any(),
  fields: z.array(
    z.union([
      z.string(),
      z.object({
        field: z.string(),
        include_unmapped: z.boolean(),
      }),
    ])
  ),
  runtimeMappings,
  language,
  factoryQueryType: z.literal(TimelineEventsQueries.all),
});

export type TimelineEventsAllOptionsInput = z.input<typeof timelineEventsAllSchema>;

export type TimelineEventsAllOptions = z.infer<typeof timelineEventsAllSchema>;

export type SortItem = z.infer<typeof extendedSortItem>;
