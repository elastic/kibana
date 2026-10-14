/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { compileEndStageItem } from './build_end_stage_clause';
import type {
  EndStageItem,
  OutputColumns,
  SkipReason,
  SkippedItem,
  SourceFieldTypes,
  SplitExceptionItemsResult,
} from './types';

/** The distinct fields an item refers to. A nested entry contributes its parent path. */
export const getItemFields = (item: ExceptionListItemSchema): string[] => [
  ...new Set(item.entries.map(({ field }) => field)),
];

/** Every field of every item, plus the parent paths of each, so a flattened parent can be recognized. */
export const getFieldsToInspect = (items: readonly ExceptionListItemSchema[]): string[] => {
  const fields = new Set<string>();
  for (const item of items) {
    for (const field of getItemFields(item)) {
      const segments = field.split('.');
      for (let length = 1; length <= segments.length; length++) {
        fields.add(segments.slice(0, length).join('.'));
      }
    }
  }
  return [...fields];
};

/**
 * Whether the field is a key below a `flattened` field. `_field_caps` does not list those keys, but the DSL
 * matches them.
 */
export const isFlattenedSourceField = (
  field: string,
  sourceFieldTypes: SourceFieldTypes
): boolean => {
  const segments = field.split('.');
  for (let length = segments.length - 1; length > 0; length--) {
    if (sourceFieldTypes.get(segments.slice(0, length).join('.'))?.includes('flattened')) {
      return true;
    }
  }
  return false;
};

/** Whether the DSL can search the field: it is listed by `_field_caps` or it is a key of a flattened field. */
const isSourceField = (field: string, sourceFieldTypes: SourceFieldTypes): boolean =>
  sourceFieldTypes.has(field) || isFlattenedSourceField(field, sourceFieldTypes);

/** Whether the output columns of the rule query are needed to place the items: an item has a field that is not a source field. */
export const needsOutputColumns = (
  items: readonly ExceptionListItemSchema[],
  sourceFieldTypes: SourceFieldTypes
): boolean =>
  items.some((item) =>
    getItemFields(item).some((field) => !isSourceField(field, sourceFieldTypes))
  );

/** An item that cannot be compiled is not applied: a value that the compiler does not expect must not fail the rule. */
const compileSafely = (item: ExceptionListItemSchema, columns: OutputColumns) => {
  try {
    return compileEndStageItem(item, columns);
  } catch (error) {
    return {
      code: 'value_not_supported' as const,
      reason: `the item could not be compiled: ${error?.message}`,
    };
  }
};

const list = (fields: readonly string[]): string => fields.map((field) => `"${field}"`).join(', ');

/** The item as an end-of-query item, or the reason why it cannot be one. */
const placeAtEndOfQuery = ({
  item,
  sourceFieldTypes,
  outputColumns,
}: {
  item: ExceptionListItemSchema;
  sourceFieldTypes: SourceFieldTypes;
  outputColumns: OutputColumns;
}): EndStageItem | SkipReason => {
  const fields = getItemFields(item);
  const absent = fields.filter(
    (field) => !isSourceField(field, sourceFieldTypes) && !outputColumns.has(field)
  );
  const dropped = fields.filter(
    (field) => isSourceField(field, sourceFieldTypes) && !outputColumns.has(field)
  );
  if (absent.length > 0 || dropped.length > 0) {
    const reasons = [
      absent.length > 0
        ? `${list(absent)} is not in the source indices or in the output of the query`
        : undefined,
      dropped.length > 0
        ? `${list(dropped)} is a field of the source indices that the query does not output`
        : undefined,
    ].filter(Boolean);
    return {
      code: absent.length > 0 ? 'field_not_found' : 'source_field_not_output',
      reason: reasons.join('; '),
      fields: [...absent, ...dropped],
    };
  }
  const compiled = compileSafely(item, outputColumns);
  return 'reason' in compiled ? compiled : { item, clause: compiled.clause, terms: compiled.terms };
};

/**
 * Decides where each item is applied. An item is placed whole, in one place. The DSL filter is where an exception
 * has always been applied, so an item whose fields are all source fields stays there, and nothing else happens to it.
 * Any other item is applied at the end of the query when every field of it is a column of the query output and
 * the item can be compiled, and nowhere otherwise (the reason is reported). The query is not read: a source field
 * that the query redefines is still a source field.
 */
export const splitExceptionItems = ({
  items,
  sourceFieldTypes,
  outputColumns,
}: {
  items: readonly ExceptionListItemSchema[];
  sourceFieldTypes: SourceFieldTypes;
  outputColumns: OutputColumns;
}): SplitExceptionItemsResult => {
  const dslItems: ExceptionListItemSchema[] = [];
  const endStageItems: EndStageItem[] = [];
  const skippedItems: SkippedItem[] = [];

  for (const item of items) {
    // The entries of an item are AND-ed, so the item is placed whole: all of it or nothing.
    if (getItemFields(item).every((field) => isSourceField(field, sourceFieldTypes))) {
      dslItems.push(item);
    } else {
      const placed = placeAtEndOfQuery({
        item,
        sourceFieldTypes,
        outputColumns,
      });
      if ('reason' in placed) {
        skippedItems.push({ item, ...placed });
      } else {
        endStageItems.push(placed);
      }
    }
  }

  return { dslItems, endStageItems, skippedItems };
};
