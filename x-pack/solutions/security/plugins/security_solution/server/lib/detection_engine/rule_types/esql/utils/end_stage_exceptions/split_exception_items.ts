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
  SkippedItem,
  SourceFieldTypes,
  SplitExceptionItemsResult,
} from './types';

/** An ES|QL query is limited to 500 pipeline stages, and the rule query needs some of them. */
export const MAX_END_STAGE_ITEMS = 100;

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

/** Whether the output columns of the rule query are needed to place the items. */
export const needsOutputColumns = (
  items: readonly ExceptionListItemSchema[],
  sourceFieldTypes: SourceFieldTypes
): boolean =>
  items.some((item) =>
    getItemFields(item).some((field) => !isSourceField(field, sourceFieldTypes))
  );

const list = (fields: readonly string[]): string => fields.map((field) => `"${field}"`).join(', ');

/**
 * Decides where each item is applied. An item stays in the DSL filter, as it always did, unless every field
 * is a source field (it stays there on purpose) or the item can be evaluated at the end of the query.
 *
 * - every field is a source field: DSL
 * - otherwise, every field is a column of the query output and the item can be compiled: end of the query
 * - otherwise: applied nowhere, and the reason is reported
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
  const skip = (item: ExceptionListItemSchema, level: SkippedItem['level'], reason: string) => {
    skippedItems.push({ item, level, reason });
  };

  for (const item of items) {
    // The entries of an item are AND-ed, so the item is placed whole: all of it or nothing.
    const fields = getItemFields(item);
    const outsideSource = fields.filter((field) => !isSourceField(field, sourceFieldTypes));
    const absent = outsideSource.filter((field) => !outputColumns.has(field));
    const dropped = fields.filter(
      (field) => isSourceField(field, sourceFieldTypes) && !outputColumns.has(field)
    );
    if (outsideSource.length === 0) {
      dslItems.push(item);
    } else if (absent.length > 0) {
      skip(
        item,
        'debug',
        `${list(absent)} is not in the source indices or in the output of the query`
      );
    } else if (dropped.length > 0) {
      skip(
        item,
        'warn',
        `${list(
          dropped
        )} is a field of the source indices that the query does not output, so the item cannot be evaluated at the end of the query`
      );
    } else if (endStageItems.length >= MAX_END_STAGE_ITEMS) {
      skip(
        item,
        'warn',
        `no more than ${MAX_END_STAGE_ITEMS} items are applied at the end of the query`
      );
    } else {
      const compiled = compileEndStageItem(item, outputColumns);
      if ('reason' in compiled) {
        skip(item, 'warn', compiled.reason);
      } else {
        endStageItems.push({ item, clause: compiled.clause, fullText: compiled.fullText });
      }
    }
  }

  return { dslItems, endStageItems, skippedItems };
};
