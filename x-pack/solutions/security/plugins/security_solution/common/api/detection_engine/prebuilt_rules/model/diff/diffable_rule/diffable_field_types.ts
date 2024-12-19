/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import {
  BuildingBlockType,
  DataViewId,
  EventCategoryOverride,
  IndexPatternArray,
  KqlQueryLanguage,
  RuleFilterArray,
  RuleNameOverride,
  RuleQuery,
  SavedQueryId,
  TiebreakerField,
  TimelineTemplateId,
  TimelineTemplateTitle,
  TimestampField,
  TimestampOverride,
  TimestampOverrideFallbackDisabled,
} from '../../../../model/rule_schema';
import { TimeDuration } from '../../../../model/rule_schema/time_duration';

// -------------------------------------------------------------------------------------------------
// Rule data source

export enum DataSourceType {
  'index_patterns' = 'index_patterns',
  'data_view' = 'data_view',
}

export type DataSourceIndexPatterns = z.infer<typeof DataSourceIndexPatterns>;
export const DataSourceIndexPatterns = z.object({
  type: z.literal(DataSourceType.index_patterns),
  index_patterns: IndexPatternArray,
});

export type DataSourceDataView = z.infer<typeof DataSourceDataView>;
export const DataSourceDataView = z.object({
  type: z.literal(DataSourceType.data_view),
  data_view_id: DataViewId,
});

export type RuleDataSource = z.infer<typeof RuleDataSource>;
export const RuleDataSource = z.discriminatedUnion('type', [
  DataSourceIndexPatterns,
  DataSourceDataView,
]);

// -------------------------------------------------------------------------------------------------
// Rule data query

export enum KqlQueryType {
  'inline_query' = 'inline_query',
  'saved_query' = 'saved_query',
}

export type InlineKqlQuery = z.infer<typeof InlineKqlQuery>;
export const InlineKqlQuery = z.object({
  type: z.literal(KqlQueryType.inline_query),
  query: RuleQuery,
  language: KqlQueryLanguage,
  filters: RuleFilterArray,
});

export type SavedKqlQuery = z.infer<typeof SavedKqlQuery>;
export const SavedKqlQuery = z.object({
  type: z.literal(KqlQueryType.saved_query),
  saved_query_id: SavedQueryId,
});

export type RuleKqlQuery = z.infer<typeof RuleKqlQuery>;
export const RuleKqlQuery = z.discriminatedUnion('type', [InlineKqlQuery, SavedKqlQuery]);

export type RuleEqlQuery = z.infer<typeof RuleEqlQuery>;
export const RuleEqlQuery = z.object({
  query: RuleQuery,
  language: z.literal('eql'),
  filters: RuleFilterArray,
  event_category_override: EventCategoryOverride.optional(),
  timestamp_field: TimestampField.optional(),
  tiebreaker_field: TiebreakerField.optional(),
});

export type RuleEsqlQuery = z.infer<typeof RuleEsqlQuery>;
export const RuleEsqlQuery = z.object({
  query: RuleQuery,
  language: z.literal('esql'),
});

// -------------------------------------------------------------------------------------------------
// Rule schedule

export type RuleSchedule = z.infer<typeof RuleSchedule>;
export const RuleSchedule = z.object({
  interval: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
  lookback: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
});

// -------------------------------------------------------------------------------------------------
// Rule name override

export type RuleNameOverrideObject = z.infer<typeof RuleNameOverrideObject>;
export const RuleNameOverrideObject = z.object({
  field_name: RuleNameOverride,
});

// -------------------------------------------------------------------------------------------------
// Timestamp override

export type TimestampOverrideObject = z.infer<typeof TimestampOverrideObject>;
export const TimestampOverrideObject = z.object({
  field_name: TimestampOverride,
  fallback_disabled: TimestampOverrideFallbackDisabled,
});

// -------------------------------------------------------------------------------------------------
// Reference to a timeline template

export type TimelineTemplateReference = z.infer<typeof TimelineTemplateReference>;
export const TimelineTemplateReference = z.object({
  timeline_id: TimelineTemplateId,
  timeline_title: TimelineTemplateTitle,
});

// -------------------------------------------------------------------------------------------------
// Building block

export type BuildingBlockObject = z.infer<typeof BuildingBlockObject>;
export const BuildingBlockObject = z.object({
  type: BuildingBlockType,
});
