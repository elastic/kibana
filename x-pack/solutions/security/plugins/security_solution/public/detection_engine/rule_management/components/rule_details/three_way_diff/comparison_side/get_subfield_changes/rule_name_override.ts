/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForRuleNameOverride = (
  oldFieldValue?: DiffableAllFields['rule_name_override'],
  newFieldValue?: DiffableAllFields['rule_name_override']
): SubfieldChange[] => {
  const oldFieldName = stringifyToSortedJson(oldFieldValue?.field_name);
  const newFieldName = stringifyToSortedJson(newFieldValue?.field_name);

  if (oldFieldName !== newFieldName) {
    return [
      {
        subfieldName: 'field_name',
        oldSubfieldValue: oldFieldName,
        newSubfieldValue: newFieldName,
      },
    ];
  }

  return [];
};
