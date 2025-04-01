/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForThreshold = (
  oldFieldValue?: DiffableAllFields['threshold'],
  newFieldValue?: DiffableAllFields['threshold']
): SubfieldChange[] => {
  const changes: SubfieldChange[] = [];

  const oldField = stringifyToSortedJson(oldFieldValue?.field);
  const newField = stringifyToSortedJson(newFieldValue?.field);

  if (oldField !== newField) {
    changes.push({
      subfieldName: 'field',
      oldSubfieldValue: oldField,
      newSubfieldValue: newField,
    });
  }

  const oldValue = stringifyToSortedJson(oldFieldValue?.value);
  const newValue = stringifyToSortedJson(newFieldValue?.value);

  if (oldValue !== newValue) {
    changes.push({
      subfieldName: 'value',
      oldSubfieldValue: oldValue,
      newSubfieldValue: newValue,
    });
  }

  const oldCardinality = stringifyToSortedJson(oldFieldValue?.cardinality);
  const newCardinality = stringifyToSortedJson(newFieldValue?.cardinality);

  if (oldCardinality !== newCardinality) {
    changes.push({
      subfieldName: 'cardinality',
      oldSubfieldValue: oldCardinality,
      newSubfieldValue: newCardinality,
    });
  }

  return changes;
};
