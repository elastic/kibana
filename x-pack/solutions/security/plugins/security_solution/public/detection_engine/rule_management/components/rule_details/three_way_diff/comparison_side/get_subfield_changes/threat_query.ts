/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForThreatQuery = (
  oldFieldValue?: DiffableAllFields['threat_query'],
  newFieldValue?: DiffableAllFields['threat_query']
): SubfieldChange[] => {
  const changes: SubfieldChange[] = [];

  const oldQuery = stringifyToSortedJson(oldFieldValue?.query);
  const newQuery = stringifyToSortedJson(newFieldValue?.query);

  if (oldQuery !== newQuery) {
    changes.push({
      subfieldName: 'query',
      oldSubfieldValue: oldQuery,
      newSubfieldValue: newQuery,
    });
  }

  const oldLanguage = stringifyToSortedJson(oldFieldValue?.language);
  const newLanguage = stringifyToSortedJson(newFieldValue?.language);

  if (oldLanguage !== newLanguage) {
    changes.push({
      subfieldName: 'language',
      oldSubfieldValue: oldLanguage,
      newSubfieldValue: newLanguage,
    });
  }

  const oldFilters = stringifyToSortedJson(oldFieldValue?.filters);
  const newFilters = stringifyToSortedJson(newFieldValue?.filters);

  if (oldFilters !== newFilters) {
    changes.push({
      subfieldName: 'filters',
      oldSubfieldValue: oldFilters,
      newSubfieldValue: newFilters,
    });
  }

  return changes;
};
