/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { z } from '@kbn/zod';

import type {
  dateRangeSchemaZod,
  groupBySchemaZod,
  groupingsSchemaZod,
  groupSummarySchemaZod,
  metaSchemaZod,
  objectiveSchemaZod,
  sloSettingsSchemaZod,
  statusSchemaZod,
  storedSloSettingsSchemaZod,
  summarySchemaZod,
} from '@kbn/slo-schema';

type Objective = z.output<typeof objectiveSchemaZod>;
type Status = z.output<typeof statusSchemaZod>;
type DateRange = z.output<typeof dateRangeSchemaZod>;
type Summary = z.output<typeof summarySchemaZod>;
type Groupings = z.output<typeof groupingsSchemaZod>;
type Meta = z.output<typeof metaSchemaZod>;
type GroupSummary = z.output<typeof groupSummarySchemaZod>;
type GroupBy = z.output<typeof groupBySchemaZod>;
type StoredSLOSettings = z.input<typeof storedSloSettingsSchemaZod>;
type SLOSettings = z.output<typeof sloSettingsSchemaZod>;

export type {
  Objective,
  DateRange,
  Groupings,
  Meta,
  Status,
  Summary,
  GroupBy,
  GroupSummary,
  StoredSLOSettings,
  SLOSettings,
};
