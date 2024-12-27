/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForEqlQuery = (
  oldFieldValue?: DiffableAllFields['eql_query'],
  newFieldValue?: DiffableAllFields['eql_query']
): SubfieldChange[] => {
  const changes: SubfieldChange[] = [];

  const subFieldNames: Array<keyof DiffableAllFields['eql_query']> = [
    'query',
    'filters',
    'event_category_override',
    'tiebreaker_field',
    'timestamp_field',
  ];

  for (const subFieldName of subFieldNames) {
    const oldValue = stringifyToSortedJson(oldFieldValue?.[subFieldName]);
    const newValue = stringifyToSortedJson(newFieldValue?.[subFieldName]);

    if (newValue !== oldValue) {
      changes.push({
        subfieldName: subFieldName,
        oldSubfieldValue: oldValue,
        newSubfieldValue: newValue,
      });
    }
  }

  return changes;
};
