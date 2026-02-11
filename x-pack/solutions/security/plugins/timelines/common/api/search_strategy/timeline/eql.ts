/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { filterQuery } from '../model/filter_query';
import { runtimeMappings } from '../model/runtime_mappings';
import { sort } from '../model/sort';
import { requestPaginated } from './request_paginated';

export const timelineEqlRequestOptionsSchema = requestPaginated.extend({
  sort,
  filterQuery,
  eventCategoryField: z.string().optional(),
  tiebreakerField: z.string().optional(),
  timestampField: z.string().optional(),
  fieldRequested: z.array(z.string()),
  size: z.number().optional(),
  runTimeMappings: runtimeMappings.optional(),
  language: z.literal('eql'),
});

export type TimelineEqlRequestOptionsInput = z.input<typeof timelineEqlRequestOptionsSchema>;

export type TimelineEqlRequestOptions = z.infer<typeof timelineEqlRequestOptionsSchema>;
