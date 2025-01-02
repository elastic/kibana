/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForTimestampOverride = (
  oldFieldValue?: DiffableAllFields['timestamp_override'],
  newFieldValue?: DiffableAllFields['timestamp_override']
): SubfieldChange[] => {
  const changes: SubfieldChange[] = [];

  const oldFieldName = stringifyToSortedJson(oldFieldValue?.field_name);
  const newFieldName = stringifyToSortedJson(newFieldValue?.field_name);

  if (oldFieldName !== newFieldName) {
    changes.push({
      subfieldName: 'field_name',
      oldSubfieldValue: oldFieldName,
      newSubfieldValue: newFieldName,
    });
  }

  const oldVersionFallbackDisabled = stringifyToSortedJson(oldFieldValue?.fallback_disabled);
  const newVersionFallbackDisabled = stringifyToSortedJson(newFieldValue?.fallback_disabled);

  if (oldVersionFallbackDisabled !== newVersionFallbackDisabled) {
    changes.push({
      subfieldName: 'fallback_disabled',
      oldSubfieldValue: oldVersionFallbackDisabled,
      newSubfieldValue: newVersionFallbackDisabled,
    });
  }

  return changes;
};
