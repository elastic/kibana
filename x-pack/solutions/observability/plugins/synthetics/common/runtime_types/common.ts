/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import {
  CheckGeoType,
  DateRangeType,
  getNonEmptyStringCodec,
  InlineScriptString,
  LocationType,
  NameSpaceString,
  StatesIndexStatusType,
  SummaryType,
  TimeoutString,
} from './zod/common';

export {
  CheckGeoType,
  DateRangeType,
  getNonEmptyStringCodec,
  InlineScriptString,
  LocationType,
  NameSpaceString,
  StatesIndexStatusType,
  SummaryType,
  TimeoutString,
};

export type NameSpaceStringC = typeof NameSpaceString;
export type InlineScriptStringC = typeof InlineScriptString;
export type Summary = SchemaOutput<typeof SummaryType>;
export type Location = SchemaOutput<typeof LocationType>;
export type GeoPoint = SchemaOutput<typeof CheckGeoType>;
export type StatesIndexStatus = SchemaOutput<typeof StatesIndexStatusType>;
export type DateRange = SchemaOutput<typeof DateRangeType>;
