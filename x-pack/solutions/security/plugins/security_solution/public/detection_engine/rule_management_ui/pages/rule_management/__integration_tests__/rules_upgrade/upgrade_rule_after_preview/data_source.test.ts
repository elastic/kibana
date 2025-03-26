/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceType } from '../../../../../../../../common/api/detection_engine';
import { mockAvailableDataViews } from '../mock/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "data_source" field', () => {
  beforeAll(() => {
    mockAvailableDataViews(
      [
        {
          id: 'resolved',
          title: 'resolved',
        },
        {
          id: 'data_view_B',
          title: 'Data View B',
        },
        {
          id: 'data_view_C',
          title: 'Data View C',
        },
      ],
      {}
    );
  });

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'data_source',
      humanizedFieldName: 'Data source',
      initial: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
      customized: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
      upgrade: { type: DataSourceType.index_patterns, index_patterns: ['indexC'] },
      resolvedValue: { type: DataSourceType.index_patterns, index_patterns: ['resolved'] },
    },
    {
      ruleType: 'query',
      fieldName: 'data_source',
      humanizedFieldName: 'Data source',
      initial: { type: DataSourceType.data_view, data_view_id: 'data_view_A' },
      customized: { type: DataSourceType.data_view, data_view_id: 'data_view_B' },
      upgrade: { type: DataSourceType.data_view, data_view_id: 'data_view_C' },
      resolvedValue: { type: DataSourceType.data_view, data_view_id: 'resolved' },
    },
  ] as const)(
    '$fieldName ($ruleType rule)',
    ({ ruleType, fieldName, humanizedFieldName, initial, customized, upgrade, resolvedValue }) => {
      assertRuleUpgradePreview({
        ruleType,
        fieldName,
        humanizedFieldName,
        fieldVersions: {
          initial,
          customized,
          upgrade,
          resolvedValue,
        },
      });

      assertRuleUpgradeAfterReview({
        ruleType,
        fieldName,
        fieldVersions: {
          initial,
          customized,
          upgrade,
          resolvedValue,
        },
      });
    }
  );
});
