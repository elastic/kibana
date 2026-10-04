/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

/** Field name to the mapping types it has in the source indices, as reported by `_field_caps`. */
export type SourceFieldTypes = ReadonlyMap<string, readonly string[]>;

/** Column name to its ES|QL type, for the output of the rule query. */
export type OutputColumns = ReadonlyMap<string, string>;

export interface EndStageItem {
  item: ExceptionListItemSchema;
  /** Expression of the `WHERE` stage that keeps the rows the item does not exclude. */
  clause: string;
  /** The clause uses a full-text function, which ES|QL accepts only at some positions of a query. */
  fullText?: boolean;
}

export interface SkippedItem {
  item: ExceptionListItemSchema;
  /** `debug` for the expected case of a shared list, `warn` when a user could expect the item to apply. */
  level: 'debug' | 'warn';
  reason: string;
}

export interface SplitExceptionItemsResult {
  /** Items that stay in the DSL filter of the `_query` request. */
  dslItems: ExceptionListItemSchema[];
  /** Items that are inlined at the end of the ES|QL query. */
  endStageItems: EndStageItem[];
  /** Items that are applied nowhere. */
  skippedItems: SkippedItem[];
}
