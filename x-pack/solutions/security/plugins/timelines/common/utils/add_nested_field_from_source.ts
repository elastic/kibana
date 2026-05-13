/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import type { TimelineEventsDetailsItem } from '../search_strategy';

/**
 * Flattens a nested object into dotted-path keys with array values.
 * @internal Exported for testing only
 */
export const flattenNestedObject = (
  obj: Record<string, unknown>,
  prefix: string = ''
): Record<string, unknown[]> => {
  const result: Record<string, unknown[]> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenNestedObject(value as Record<string, unknown>, newKey);
      Object.assign(result, nested);
    } else {
      result[newKey] = Array.isArray(value) ? value : [value];
    }
  }

  return result;
};

export const addNestedFieldFromSource = (
  fieldsData: TimelineEventsDetailsItem[],
  source: Record<string, unknown> | undefined,
  fieldPath: string
): TimelineEventsDetailsItem[] => {
  if (!source) return fieldsData;

  const hasParentField = fieldsData.some((item) => item.field === fieldPath);
  if (hasParentField) return fieldsData;

  const nestedData = get(fieldPath, source);
  if (!nestedData) return fieldsData;

  const nestedArray = Array.isArray(nestedData) ? nestedData : [nestedData];
  const values = nestedArray.map((item) => {
    if (item !== null && typeof item === 'object') {
      const flattened = flattenNestedObject(item as Record<string, unknown>);
      return JSON.stringify(flattened);
    }
    return JSON.stringify(item);
  });

  const parentItem: TimelineEventsDetailsItem = {
    category: fieldPath.split('.')[0],
    field: fieldPath,
    values,
    originalValue: values,
    isObjectArray: true,
  };

  return [...fieldsData, parentItem];
};
