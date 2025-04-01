/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

import {
  dateRangeSchema,
  groupBySchema,
  groupingsSchema,
  groupSummarySchema,
  metaSchema,
  objectiveSchema,
  sloSettingsSchema,
  statusSchema,
  summarySchema,
} from '@kbn/slo-schema';

type Objective = t.TypeOf<typeof objectiveSchema>;
type Status = t.TypeOf<typeof statusSchema>;
type DateRange = t.TypeOf<typeof dateRangeSchema>;
type Summary = t.TypeOf<typeof summarySchema>;
type Groupings = t.TypeOf<typeof groupingsSchema>;
type Meta = t.TypeOf<typeof metaSchema>;
type GroupSummary = t.TypeOf<typeof groupSummarySchema>;
type GroupBy = t.TypeOf<typeof groupBySchema>;
type StoredSLOSettings = t.OutputOf<typeof sloSettingsSchema>;
type SLOSettings = t.TypeOf<typeof sloSettingsSchema>;

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
