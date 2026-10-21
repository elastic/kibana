/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

/** Field name to the mapping types it has in the source indices, as reported by `_field_caps`. */
export type SourceFieldTypes = ReadonlyMap<string, readonly string[]>;

/** The ES|QL column types on which an exception can be tested at the end of the query. */
export const END_STAGE_COLUMN_TYPES = [
  'keyword',
  'text',
  'integer',
  'long',
  'unsigned_long',
  'double',
  'boolean',
  'ip',
  'version',
  'date',
  'date_nanos',
] as const;

export type EndStageColumnType = (typeof END_STAGE_COLUMN_TYPES)[number];

export const isEndStageColumnType = (type: string): type is EndStageColumnType =>
  (END_STAGE_COLUMN_TYPES as readonly string[]).includes(type);

/** The ES|QL type of a column: one that can be tested at the end of the query, or any other (`geo_point`, `unsupported`, ...). */
export type OutputColumnType = EndStageColumnType | (string & Record<never, never>);

/** Column name to its ES|QL type, for the output of the rule query. */
export type OutputColumns = ReadonlyMap<string, OutputColumnType>;

export interface EndStageItem {
  item: ExceptionListItemSchema;
  /** Expression of the `WHERE` stage that keeps the rows the item does not exclude. */
  clause: string;
  /** The comparisons in the clause. */
  terms: number;
}

/** Stable codes for the items that are not applied, so that a UI can group and translate them. */
export enum SkipReasonCode {
  /** An item with a computed column and an entry that is not negative on a field that is in neither the source nor the output, which never matches. An item with no computed column stays in the DSL filter. */
  FieldNotFound = 'field_not_found',
  SourceFieldNotOutput = 'source_field_not_output',
  EntryTypeNotSupported = 'entry_type_not_supported',
  ColumnTypeNotSupported = 'column_type_not_supported',
  OperatorNotSupportedOnType = 'operator_not_supported_on_type',
  OsTypesNotSupported = 'os_types_not_supported',
  ValueNotSupported = 'value_not_supported',
  ListSizeNotSupported = 'list_size_not_supported',
  ItemHasNoEntries = 'item_has_no_entries',
}

export interface SkipReason {
  code: SkipReasonCode;
  /** Human readable explanation, in English. */
  explanation: string;
  /** The fields of the item that cause the skip reason, when they are known. */
  fields?: string[];
}

export interface SkippedItem extends SkipReason {
  item: ExceptionListItemSchema;
}

export interface SplitExceptionItemsResult {
  /** Items that stay in the DSL filter of the `_query` request. */
  dslItems: ExceptionListItemSchema[];
  /** Items that are inlined at the end of the ES|QL query. */
  endStageItems: EndStageItem[];
  /** Items that are applied nowhere. */
  skippedItems: SkippedItem[];
}
