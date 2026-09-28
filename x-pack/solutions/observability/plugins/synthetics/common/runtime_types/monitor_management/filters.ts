/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SchemaOutput } from '../schema_output';

const MonitorFilterCodec = z.object({
  label: z.string(),
  count: z.number(),
});

export type MonitorFilter = SchemaOutput<typeof MonitorFilterCodec>;

export const MonitorFiltersResultCodec = z.object({
  monitorTypes: z.array(MonitorFilterCodec),
  tags: z.array(MonitorFilterCodec),
  locations: z.array(MonitorFilterCodec),
  projects: z.array(MonitorFilterCodec),
  schedules: z.array(MonitorFilterCodec),
});

export type MonitorFiltersResult = SchemaOutput<typeof MonitorFiltersResultCodec>;

// Type-ahead values for bulk edit fields that are not indexed on the monitor
// saved objects (service.name and label keys), sourced from ping documents.
export const FieldSuggestionsResultCodec = z.object({
  serviceNames: z.array(z.string()),
  labelKeys: z.array(z.string()),
});

export type FieldSuggestionsResult = SchemaOutput<typeof FieldSuggestionsResultCodec>;
