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

type ItemEntry = ExceptionListItemSchema['entries'][number];

/** The paths of an entry to look up. `_field_caps` lists a nested path only when a field below it is requested too. */
const getEntryPaths = (entry: ItemEntry): string[] =>
  entry.type === 'nested'
    ? [
        entry.field,
        ...entry.entries.flatMap((inner) =>
          getEntryPaths({ ...inner, field: `${entry.field}.${inner.field}` })
        ),
      ]
    : [entry.field];

/** Every field of every item, plus the paths below a nested entry and the parent paths of each, so that a flattened or nested parent is listed. */
export const getFieldsToInspect = (items: readonly ExceptionListItemSchema[]): string[] => {
  const fields = new Set<string>();
  for (const item of items) {
    for (const path of item.entries.flatMap(getEntryPaths)) {
      const segments = path.split('.');
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

/** Whether the DSL can search the field: `_field_caps` lists it with a type that holds values, or it is a key of a flattened field (an `object` is listed only as a parent path). */
const isSourceField = (field: string, sourceFieldTypes: SourceFieldTypes): boolean =>
  sourceFieldTypes.get(field)?.some((type) => type !== 'object') === true ||
  isFlattenedSourceField(field, sourceFieldTypes);

/** Whether the output columns of the rule query are needed to place the items: an item has a field that is not a source field. */
export const needsOutputColumns = (
  items: readonly ExceptionListItemSchema[],
  sourceFieldTypes: SourceFieldTypes
): boolean =>
  items.some((item) =>
    getItemFields(item).some((field) => !isSourceField(field, sourceFieldTypes))
  );

/** An item that cannot be compiled counts as one with a value that cannot be written: the rule fails and names it. */
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

/** An entry with a negative operator (`is not`, `does not exist`, ...): `excluded` is the operator that the lists API stores. */
const isNegativeEntry = (entry: ExceptionListItemSchema['entries'][number]): boolean =>
  'operator' in entry && entry.operator === 'excluded';

/** The item as an end-of-query item, or the reason why it cannot be one: an entry that is not negative on a field that exists nowhere never matches, and a negative one is true for every row and is left out. */
const placeAtEndOfQuery = ({
  item,
  sourceFieldTypes,
  outputColumns,
}: {
  item: ExceptionListItemSchema;
  sourceFieldTypes: SourceFieldTypes;
  outputColumns: OutputColumns;
}): EndStageItem | SkipReason => {
  const exists = (field: string) =>
    isSourceField(field, sourceFieldTypes) || outputColumns.has(field);
  const neverMatches = [
    ...new Set(
      item.entries
        .filter((entry) => !exists(entry.field) && !isNegativeEntry(entry))
        .map(({ field }) => field)
    ),
  ];
  const dropped = getItemFields(item).filter(
    (field) => isSourceField(field, sourceFieldTypes) && !outputColumns.has(field)
  );
  if (neverMatches.length > 0 || dropped.length > 0) {
    const reasons = [
      neverMatches.length > 0
        ? `${list(neverMatches)} is not in the source indices or in the output of the query`
        : undefined,
      dropped.length > 0
        ? `${list(dropped)} is a field of the source indices that the query does not output`
        : undefined,
    ].filter(Boolean);
    return {
      code: neverMatches.length > 0 ? 'field_not_found' : 'source_field_not_output',
      reason: reasons.join('; '),
      fields: [...neverMatches, ...dropped],
    };
  }
  const entries = item.entries.filter((entry) => exists(entry.field));
  const compiled = compileSafely({ ...item, entries }, outputColumns);
  return 'reason' in compiled ? compiled : { item, clause: compiled.clause, terms: compiled.terms };
};

/** Decides where each item is applied, whole: in the DSL filter when its fields are source fields or exist nowhere, at the end of the query when it has a computed column, and nowhere when it cannot be applied (the reason is reported). */
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
    // The entries of an item are AND-ed, so the item is placed whole: all of it or nothing. A field that exists nowhere
    // (neither a source field nor a column) stays in the DSL: for a field that no document has, the DSL matches every
    // document with a negative operator and none with a positive one, and users rely on it.
    const staysInDsl = getItemFields(item).every(
      (field) => isSourceField(field, sourceFieldTypes) || !outputColumns.has(field)
    );
    if (staysInDsl) {
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
