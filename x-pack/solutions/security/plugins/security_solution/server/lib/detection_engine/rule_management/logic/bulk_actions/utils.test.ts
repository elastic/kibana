/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import type { BulkActionEditPayload } from '../../../../../../common/api/detection_engine/rule_management';
import { hasAlertSuppressionBulkEditAction } from './utils';

describe('hasAlertSuppressionBulkEditAction', () => {
  it('returns true if actions include set_alert_suppression_for_threshold', () => {
    const actions: BulkActionEditPayload[] = [
      {
        type: BulkActionEditTypeEnum.set_alert_suppression_for_threshold,
        value: { duration: { unit: 'm', value: 4 } },
      },
    ];
    expect(hasAlertSuppressionBulkEditAction(actions)).toBe(true);
  });

  it('returns true if actions include delete_alert_suppression', () => {
    const actions: BulkActionEditPayload[] = [
      { type: BulkActionEditTypeEnum.delete_alert_suppression },
    ];
    expect(hasAlertSuppressionBulkEditAction(actions)).toBe(true);
  });

  it('returns true if actions include set_alert_suppression', () => {
    const actions: BulkActionEditPayload[] = [
      { type: BulkActionEditTypeEnum.set_alert_suppression, value: { group_by: ['test-'] } },
    ];
    expect(hasAlertSuppressionBulkEditAction(actions)).toBe(true);
  });

  it('returns false if actions do not include any suppression actions', () => {
    const actions: BulkActionEditPayload[] = [
      { type: BulkActionEditTypeEnum.add_tags, value: ['tag1'] },
      { type: BulkActionEditTypeEnum.set_index_patterns, value: [] },
    ];
    expect(hasAlertSuppressionBulkEditAction(actions)).toBe(false);
  });

  it('returns true if at least one action is a suppression action among others', () => {
    const actions: BulkActionEditPayload[] = [
      { type: BulkActionEditTypeEnum.add_tags, value: ['tag1'] },
      { type: BulkActionEditTypeEnum.set_alert_suppression, value: { group_by: ['test-'] } },
    ];
    expect(hasAlertSuppressionBulkEditAction(actions)).toBe(true);
  });

  it('returns false for empty actions array', () => {
    expect(hasAlertSuppressionBulkEditAction([])).toBe(false);
  });
});
