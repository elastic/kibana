/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionEditTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import * as i18n from '../../../common/translations';
import { explainBulkEditSuccess } from './translations';
import type { BulkActionSummary } from '../../api/api';

describe('explainBulkEditSuccess', () => {
  const baseSummary: BulkActionSummary = {
    total: 10,
    succeeded: 8,
    skipped: 2,
    failed: 0,
  };

  it('includes data view skip detail when skipped count > 0 and editPayload contains add_index_patterns action', () => {
    const editPayload = [
      { type: BulkActionEditTypeEnum.add_index_patterns, value: ['add-pattern-*'] },
    ];

    const result = explainBulkEditSuccess(editPayload, baseSummary);

    expect(result).toContain(i18n.RULES_BULK_EDIT_SUCCESS_DATA_VIEW_RULES_SKIPPED_DETAIL);
    expect(result).toBe(
      `${i18n.RULES_BULK_EDIT_SUCCESS_DESCRIPTION(8, 2)} ${
        i18n.RULES_BULK_EDIT_SUCCESS_DATA_VIEW_RULES_SKIPPED_DETAIL
      }`
    );
  });

  it('includes data view skip detail when skipped count > 0 and editPayload contains set_index_patterns action', () => {
    const editPayload = [
      { type: BulkActionEditTypeEnum.set_index_patterns, value: ['set-pattern-*'] },
    ];

    const result = explainBulkEditSuccess(editPayload, baseSummary);

    expect(result).toContain(i18n.RULES_BULK_EDIT_SUCCESS_DATA_VIEW_RULES_SKIPPED_DETAIL);
  });

  it('does not include data view skip detail when skipped count is 0 even with index pattern actions', () => {
    const editPayload = [
      { type: BulkActionEditTypeEnum.add_index_patterns, value: ['add-pattern-*'] },
    ];
    const summaryNoSkipped = { ...baseSummary, skipped: 0, succeeded: 10 };

    const result = explainBulkEditSuccess(editPayload, summaryNoSkipped);

    expect(result).not.toContain(i18n.RULES_BULK_EDIT_SUCCESS_DATA_VIEW_RULES_SKIPPED_DETAIL);
    expect(result).toBe(i18n.RULES_BULK_EDIT_SUCCESS_DESCRIPTION(10, 0));
  });

  it('does not include data view skip detail when no index pattern actions are present, even with skipped rules', () => {
    const editPayload = [{ type: BulkActionEditTypeEnum.add_tags, value: ['tag1'] }];

    const result = explainBulkEditSuccess(editPayload, baseSummary);

    expect(result).not.toContain(i18n.RULES_BULK_EDIT_SUCCESS_DATA_VIEW_RULES_SKIPPED_DETAIL);
    expect(result).toBe(i18n.RULES_BULK_EDIT_SUCCESS_DESCRIPTION(8, 2));
  });

  it('handles case where all rules are skipped', () => {
    const editPayload = [
      { type: BulkActionEditTypeEnum.delete_index_patterns, value: ['delete-pattern-*'] },
    ];
    const allSkippedSummary = { total: 5, succeeded: 0, skipped: 5, failed: 0 };

    const result = explainBulkEditSuccess(editPayload, allSkippedSummary);

    expect(result).toContain(i18n.RULES_BULK_EDIT_SUCCESS_DATA_VIEW_RULES_SKIPPED_DETAIL);
    expect(result).toBe(
      `${i18n.RULES_BULK_EDIT_SUCCESS_DESCRIPTION(0, 5)} ${
        i18n.RULES_BULK_EDIT_SUCCESS_DATA_VIEW_RULES_SKIPPED_DETAIL
      }`
    );
  });
});
