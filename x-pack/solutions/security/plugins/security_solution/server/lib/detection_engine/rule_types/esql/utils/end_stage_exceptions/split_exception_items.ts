/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorEnum, ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { compileEndStageItem } from './build_end_stage_clause';
import type {
  EndStageItem,
  OutputColumns,
  SkipReason,
  SkippedItem,
  SourceFieldTypes,
  SplitExceptionItemsResult,
} from './types';
import { SkipReasonCode } from './types';

/** The distinct fields an item refers to. A nested entry contributes its parent path. */
export const getItemFields = (item: ExceptionListItemSchema): string[] => [
  ...new Set(item.entries.map(({ field }) => field)),
];

type ItemEntry = ExceptionListItemSchema['entries'][number];

/** The field path of an entry and, for a nested entry, the full path of every field of its inner entries, at any depth. */
const getEntryPaths = (entry: ItemEntry): string[] =>
  entry.type === ListOperatorTypeEnum.NESTED
    ? [
        entry.field,
        ...entry.entries.flatMap((inner) =>
          getEntryPaths({ ...inner, field: `${entry.field}.${inner.field}` })
        ),
      ]
    : [entry.field];

/** The path and each of its parent paths: `a.b.c` gives `a`, `a.b` and `a.b.c`. */
const getPathWithParents = (path: string): string[] => {
  const paths: string[] = [];
  // each parent is the start of the path, up to a dot
  for (let dot = path.indexOf('.'); dot !== -1; dot = path.indexOf('.', dot + 1)) {
    paths.push(path.slice(0, dot));
  }
  paths.push(path);
  return paths;
};

/** The paths of the entries of the items, the paths below their nested entries, and every parent path of each, without duplicates. */
export const getFieldsToInspect = (items: readonly ExceptionListItemSchema[]): string[] => {
  // Example: item 1 is `kubernetes.pod.labels.team is blue` AND a nested entry `n` with the inner entry `name is x`,
  // and item 2 is `kubernetes.pod.name is web`.

  // The entries of all the items in one list:
  //   [team entry, nested entry n, pod.name entry]
  const entries = items.flatMap((item) => item.entries);

  // The path of each entry, and the full path of each inner entry of a nested entry:
  //   ['kubernetes.pod.labels.team', 'n', 'n.name', 'kubernetes.pod.name']
  const paths = entries.flatMap(getEntryPaths);

  // Each path followed by its parent paths, in order. A parent of several paths appears several times:
  //   ['kubernetes', 'kubernetes.pod', 'kubernetes.pod.labels', 'kubernetes.pod.labels.team',
  //    'n', 'n', 'n.name',
  //    'kubernetes', 'kubernetes.pod', 'kubernetes.pod.name']
  const pathsWithParents = paths.flatMap(getPathWithParents);

  // Each path once:
  //   ['kubernetes', 'kubernetes.pod', 'kubernetes.pod.labels', 'kubernetes.pod.labels.team',
  //    'n', 'n.name', 'kubernetes.pod.name']
  return [...new Set(pathsWithParents)];
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
      skipReasons: [
        {
          code: SkipReasonCode.ValueNotSupported,
          explanation: `the item could not be compiled: ${error?.message}`,
        },
      ],
    };
  }
};

/** Writes each field name in double quotes, separated by commas: `a` and `b` give `"a", "b"`. */
const joinQuotedFields = (fields: readonly string[]): string =>
  fields.map((field) => `"${field}"`).join(', ');

/** An entry with a negative operator (`is not`, `does not exist`, ...): `excluded` is the operator that the lists API stores. */
const isNegativeEntry = (entry: ExceptionListItemSchema['entries'][number]): boolean =>
  'operator' in entry && entry.operator === ListOperatorEnum.EXCLUDED;

/**
 * Writes the item as a clause for the end of the query, or returns why it cannot be applied there. On a field that exists
 * nowhere, a negative entry is true for every row and the clause leaves it out. Any other entry never matches, which skips the item.
 */
const placeAtEndOfQuery = ({
  item,
  sourceFieldTypes,
  outputColumns,
}: {
  item: ExceptionListItemSchema;
  sourceFieldTypes: SourceFieldTypes;
  outputColumns: OutputColumns;
}): EndStageItem | { skipReasons: SkipReason[] } => {
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
  const skipReasons: SkipReason[] = [];
  if (neverMatches.length > 0) {
    skipReasons.push({
      code: SkipReasonCode.FieldNotFound,
      explanation: `${joinQuotedFields(
        neverMatches
      )} is not in the source indices or in the output of the query`,
      fields: neverMatches,
    });
  }
  if (dropped.length > 0) {
    skipReasons.push({
      code: SkipReasonCode.SourceFieldNotOutput,
      explanation: `${joinQuotedFields(
        dropped
      )} is a field of the source indices that the query does not output`,
      fields: dropped,
    });
  }
  if (skipReasons.length > 0) {
    return { skipReasons };
  }
  const entries = item.entries.filter((entry) => exists(entry.field));
  const compiled = compileSafely({ ...item, entries }, outputColumns);
  return 'skipReasons' in compiled
    ? compiled
    : { item, clause: compiled.clause, terms: compiled.terms };
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
    // document with a negative operator and none with a positive one, this is today's behavior which users might rely on.
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
      if ('skipReasons' in placed) {
        skippedItems.push(...placed.skipReasons.map((reason) => ({ item, ...reason })));
      } else {
        endStageItems.push(placed);
      }
    }
  }

  return { dslItems, endStageItems, skippedItems };
};
