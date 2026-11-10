/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  ESQL_OUTPUT_COLUMN_TYPES,
  isEsqlOutputColumnType,
} from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { EsqlOutputColumnType } from '@kbn/securitysolution-exceptions-common/esql_output_columns';

/** The ES|QL column types on which an exception can be tested at the end of the query. */
export const END_STAGE_COLUMN_TYPES = ESQL_OUTPUT_COLUMN_TYPES;

export type EndStageColumnType = EsqlOutputColumnType;

export const isEndStageColumnType = (type: string): type is EndStageColumnType =>
  isEsqlOutputColumnType(type);

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
  /** The item is true for every row, because all its entries have an exclusive operator on columns that the query does not output. The rule creates no alerts. */
  excludesEveryRow?: boolean;
}

/** Stable codes for the items that are not applied, so that a UI can group and translate them. */
export enum SkipReasonCode {
  /** An item with an entry that has an inclusive operator on a column that the query does not output, which never matches. */
  ItemNeverMatches = 'item_never_matches',
  EntryTypeNotSupported = 'entry_type_not_supported',
  ColumnTypeNotSupported = 'column_type_not_supported',
  OperatorNotSupportedOnType = 'operator_not_supported_on_type',
  OsTypesNotSupported = 'os_types_not_supported',
  ValueNotSupported = 'value_not_supported',
  EntryHasNoValues = 'entry_has_no_values',
  ItemHasNoEntries = 'item_has_no_entries',
}

/** Skip reasons that mean that a stored item is not valid, which fails the rule because an item that is not applied lets alerts through. */
export const INVALID_ITEM_CODES: ReadonlySet<SkipReasonCode> = new Set([
  SkipReasonCode.ValueNotSupported,
  SkipReasonCode.ColumnTypeNotSupported,
]);

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

/** An entry whose declared column type is not the type of the column that the query outputs. */
export interface ColumnTypeMismatch {
  item: ExceptionListItemSchema;
  field: string;
  declaredType: string;
  actualType: string;
}

export interface ResolveEndStageItemsResult {
  /** Items that are applied at the end of the query. */
  endStageItems: EndStageItem[];
  /** Items that are applied nowhere. */
  skippedItems: SkippedItem[];
  /** Entries that declare another type than the column has. They fail the rule. */
  typeMismatches: ColumnTypeMismatch[];
}
