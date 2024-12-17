/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionEditType } from '../../../../../../../common/api/detection_engine/rule_management';
import { BulkActionEditTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';

import { computeDryRunEditPayload } from './compute_dry_run_edit_payload';

describe('computeDryRunEditPayload', () => {
  test.each<[BulkActionEditType, unknown]>([
    [BulkActionEditTypeEnum.set_investigation_fields, { field_names: ['@timestamp'] }],
    [BulkActionEditTypeEnum.delete_investigation_fields, { field_names: ['@timestamp'] }],
    [BulkActionEditTypeEnum.add_investigation_fields, { field_names: ['@timestamp'] }],
    [BulkActionEditTypeEnum.set_index_patterns, []],
    [BulkActionEditTypeEnum.delete_index_patterns, []],
    [BulkActionEditTypeEnum.add_index_patterns, []],
    [BulkActionEditTypeEnum.add_tags, []],
    [BulkActionEditTypeEnum.delete_index_patterns, []],
    [BulkActionEditTypeEnum.set_tags, []],
    [BulkActionEditTypeEnum.set_timeline, { timeline_id: '', timeline_title: '' }],
  ])('should return correct payload for bulk edit action %s', (editAction, value) => {
    const payload = computeDryRunEditPayload(editAction);
    expect(payload).toHaveLength(1);
    expect(payload?.[0].type).toEqual(editAction);
    expect(payload?.[0].value).toEqual(value);
  });
});
