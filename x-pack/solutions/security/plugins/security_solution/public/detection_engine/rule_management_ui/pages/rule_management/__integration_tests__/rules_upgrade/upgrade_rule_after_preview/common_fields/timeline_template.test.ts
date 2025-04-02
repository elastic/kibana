/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTimelines } from '../../mock/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "timeline_template" field', () => {
  beforeAll(() => {
    mockTimelines([
      {
        id: 'resolved',
        title: 'timelineResolved',
      },
    ]);
  });

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'timeline_template',
      humanizedFieldName: 'Timeline template',
      initial: { timeline_id: 'A', timeline_title: 'timelineA' },
      customized: { timeline_id: 'B', timeline_title: 'timelineB' },
      upgrade: { timeline_id: 'C', timeline_title: 'timelineC' },
      resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
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
