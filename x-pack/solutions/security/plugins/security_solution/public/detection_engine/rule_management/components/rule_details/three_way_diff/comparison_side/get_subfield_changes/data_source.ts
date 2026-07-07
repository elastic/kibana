/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForDataSource = (
  oldFieldValue?: DiffableAllFields['data_source'],
  newFieldValue?: DiffableAllFields['data_source']
): SubfieldChange[] => {
  const changes: SubfieldChange[] = [];

  const oldType = stringifyToSortedJson(oldFieldValue?.type);
  const newType = stringifyToSortedJson(newFieldValue?.type);

  if (oldType !== newType) {
    changes.push({
      subfieldName: 'type',
      oldSubfieldValue: oldType,
      newSubfieldValue: newType,
    });
  }

  const oldIndexPatterns = stringifyToSortedJson(
    oldFieldValue?.type === 'index_patterns' ? oldFieldValue?.index_patterns : ''
  );
  const newIndexPatterns = stringifyToSortedJson(
    newFieldValue?.type === 'index_patterns' ? newFieldValue?.index_patterns : ''
  );

  if (oldIndexPatterns !== newIndexPatterns) {
    changes.push({
      subfieldName: 'index_patterns',
      oldSubfieldValue: oldIndexPatterns,
      newSubfieldValue: newIndexPatterns,
    });
  }

  const oldDataViewId = stringifyToSortedJson(
    oldFieldValue?.type === 'data_view' ? oldFieldValue?.data_view_id : ''
  );
  const newDataViewId = stringifyToSortedJson(
    newFieldValue?.type === 'data_view' ? newFieldValue?.data_view_id : ''
  );

  if (oldDataViewId !== newDataViewId) {
    changes.push({
      subfieldName: 'data_view_id',
      oldSubfieldValue: oldDataViewId,
      newSubfieldValue: newDataViewId,
    });
  }

  return changes;
};
