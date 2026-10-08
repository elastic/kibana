/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import type {
  CheckGeoType,
  DateRangeType,
  InlineScriptString,
  LocationType,
  NameSpaceString,
  StatesIndexStatusType,
  SummaryType,
} from './schemas/common';

export type NameSpaceStringC = typeof NameSpaceString;
export type InlineScriptStringC = typeof InlineScriptString;
export type Summary = SchemaOutput<typeof SummaryType>;
export type Location = SchemaOutput<typeof LocationType>;
export type GeoPoint = SchemaOutput<typeof CheckGeoType>;
export type StatesIndexStatus = SchemaOutput<typeof StatesIndexStatusType>;
export type DateRange = SchemaOutput<typeof DateRangeType>;
