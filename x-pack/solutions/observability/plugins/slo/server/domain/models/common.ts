/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { z } from '@kbn/zod';

import type {
  dateRangeSchema,
  groupBySchema,
  groupingsSchema,
  groupSummarySchema,
  metaSchema,
  objectiveSchema,
  sloSettingsSchema,
  statusSchema,
  storedSloSettingsSchema,
  summarySchema,
} from '@kbn/slo-schema';

type Objective = z.output<typeof objectiveSchema>;
type Status = z.output<typeof statusSchema>;
type DateRange = z.output<typeof dateRangeSchema>;
type Summary = z.output<typeof summarySchema>;
type Groupings = z.output<typeof groupingsSchema>;
type Meta = z.output<typeof metaSchema>;
type GroupSummary = z.output<typeof groupSummarySchema>;
type GroupBy = z.output<typeof groupBySchema>;
type StoredSLOSettings = z.input<typeof storedSloSettingsSchema>;
type SLOSettings = z.output<typeof sloSettingsSchema>;

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
