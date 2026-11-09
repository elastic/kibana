/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * What an exception item applies to:
 * - `source_documents`: the documents of the source indices, before the query runs. This is how every exception
 *   works today, and an item without `applies_to` has this value.
 * - `esql_output_columns`: the rows that the query of an ES|QL rule outputs, tested on its output columns.
 */
export const EXCEPTION_APPLIES_TO = {
  SOURCE_DOCUMENTS: 'source_documents',
  ESQL_OUTPUT_COLUMNS: 'esql_output_columns',
} as const;

export type ExceptionAppliesTo = (typeof EXCEPTION_APPLIES_TO)[keyof typeof EXCEPTION_APPLIES_TO];

export const EXCEPTION_APPLIES_TO_VALUES: readonly ExceptionAppliesTo[] =
  Object.values(EXCEPTION_APPLIES_TO);

/** The value of an item that does not say what it applies to. */
export const DEFAULT_EXCEPTION_APPLIES_TO: ExceptionAppliesTo =
  EXCEPTION_APPLIES_TO.SOURCE_DOCUMENTS;

export const getExceptionAppliesTo = (item: {
  applies_to?: ExceptionAppliesTo | null;
}): ExceptionAppliesTo => item.applies_to ?? DEFAULT_EXCEPTION_APPLIES_TO;

export const isEsqlOutputColumnsItem = (item: {
  applies_to?: ExceptionAppliesTo | null;
}): boolean => getExceptionAppliesTo(item) === EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS;
