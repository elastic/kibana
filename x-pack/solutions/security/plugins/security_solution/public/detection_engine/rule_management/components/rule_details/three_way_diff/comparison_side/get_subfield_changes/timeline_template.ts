/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForTimelineTemplate = (
  oldFieldValue?: DiffableAllFields['timeline_template'],
  newFieldValue?: DiffableAllFields['timeline_template']
): SubfieldChange[] => {
  const changes: SubfieldChange[] = [];

  const oldTimelineId = stringifyToSortedJson(oldFieldValue?.timeline_id);
  const newTimelineId = stringifyToSortedJson(newFieldValue?.timeline_id);

  if (oldTimelineId !== newTimelineId) {
    changes.push({
      subfieldName: 'timeline_id',
      oldSubfieldValue: oldTimelineId,
      newSubfieldValue: newTimelineId,
    });
  }

  const oldTimelineTitle = stringifyToSortedJson(oldFieldValue?.timeline_title);
  const newTimelineTitle = stringifyToSortedJson(newFieldValue?.timeline_title);

  if (oldTimelineTitle !== newTimelineTitle) {
    changes.push({
      subfieldName: 'timeline_title',
      oldSubfieldValue: oldTimelineTitle,
      newSubfieldValue: newTimelineTitle,
    });
  }

  return changes;
};
