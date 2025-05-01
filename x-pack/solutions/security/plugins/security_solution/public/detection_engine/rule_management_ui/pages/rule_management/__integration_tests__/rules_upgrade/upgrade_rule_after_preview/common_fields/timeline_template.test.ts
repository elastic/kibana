/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTimelines } from '../../test_utils/rule_upgrade_flyout';
import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';

describe('Upgrade diffable rule "timeline_template" (query rule type) after preview in flyout', () => {
  beforeAll(() => {
    mockTimelines([
      {
        id: 'resolved',
        title: 'timelineResolved',
      },
    ]);
  });

  const ruleType = 'query';
  const fieldName = 'timeline_template';
  const humanizedFieldName = 'Timeline template';
  const initial = { timeline_id: 'A', timeline_title: 'timelineA' };
  const customized = { timeline_id: 'B', timeline_title: 'timelineB' };
  const upgrade = { timeline_id: 'C', timeline_title: 'timelineC' };
  const resolvedValue = { timeline_id: 'resolved', timeline_title: 'timelineResolved' };

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
});
