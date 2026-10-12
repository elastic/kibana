/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';
import { stringifyRequiredFields } from '../utils';

/**
 * Returns `required_fields` changes rendered one field per line, sorted and deduplicated by name and type.
 */
export const getSubfieldChangesForRequiredFields = (
  oldFieldValue?: DiffableAllFields['required_fields'],
  newFieldValue?: DiffableAllFields['required_fields']
): SubfieldChange[] => {
  const oldRequiredFields = stringifyRequiredFields(oldFieldValue);
  const newRequiredFields = stringifyRequiredFields(newFieldValue);

  if (oldRequiredFields === newRequiredFields) {
    return [];
  }

  return [
    {
      subfieldName: 'required_fields',
      oldSubfieldValue: oldRequiredFields,
      newSubfieldValue: newRequiredFields,
    },
  ];
};
