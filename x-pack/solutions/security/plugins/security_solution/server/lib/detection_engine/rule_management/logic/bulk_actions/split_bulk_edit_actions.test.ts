/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionEditPayload } from '../../../../../../common/api/detection_engine/rule_management';
import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';

import { splitBulkEditActions } from './split_bulk_edit_actions';

const bulkEditActions: BulkActionEditPayload[] = [
  { type: BulkActionEditTypeEnum.add_index_patterns, value: ['test'] },
  { type: BulkActionEditTypeEnum.set_index_patterns, value: ['test'] },
  { type: BulkActionEditTypeEnum.delete_index_patterns, value: ['test'] },
  { type: BulkActionEditTypeEnum.add_tags, value: ['test'] },
  { type: BulkActionEditTypeEnum.delete_tags, value: ['test'] },
  { type: BulkActionEditTypeEnum.set_tags, value: ['test'] },
  {
    type: BulkActionEditTypeEnum.set_timeline,
    value: { timeline_id: 'a-1', timeline_title: 'Test title' },
  },
];

describe('splitBulkEditActions', () => {
  test('should split actions correctly', () => {
    const { attributesActions, paramsActions } = splitBulkEditActions(bulkEditActions);

    expect(attributesActions).toEqual([
      { type: BulkActionEditTypeEnum.add_tags, value: ['test'] },
      { type: BulkActionEditTypeEnum.delete_tags, value: ['test'] },
      { type: BulkActionEditTypeEnum.set_tags, value: ['test'] },
    ]);
    expect(paramsActions).toEqual([
      { type: BulkActionEditTypeEnum.add_index_patterns, value: ['test'] },
      { type: BulkActionEditTypeEnum.set_index_patterns, value: ['test'] },
      { type: BulkActionEditTypeEnum.delete_index_patterns, value: ['test'] },
      {
        type: BulkActionEditTypeEnum.set_timeline,
        value: { timeline_id: 'a-1', timeline_title: 'Test title' },
      },
    ]);
  });

  test('should handle split correctly if actions list is empty', () => {
    const { attributesActions, paramsActions } = splitBulkEditActions([]);

    expect(attributesActions).toEqual([]);
    expect(paramsActions).toEqual([]);
  });
});
