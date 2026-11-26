/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import {
  DETECTION_WATCH_RULE_ATTACHMENT_IDS,
  isDetectionWatchRuleAttachmentId,
} from './detection_watch_rule_attachments';

describe('DETECTION_WATCH_RULE_ATTACHMENT_IDS', () => {
  it.each([
    ['tuned-rule', ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID],
    ['coverage-rule', ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID],
  ])(
    'lists "%s", the id of the rule card that workflow %s attaches',
    (attachmentId, workflowId) => {
      const workflowYaml = getManagedWorkflowDefinition(workflowId)?.yaml;

      expect(DETECTION_WATCH_RULE_ATTACHMENT_IDS).toContain(attachmentId);
      expect(workflowYaml).toMatch(new RegExp(`id: "${attachmentId}"\\s+type: security\\.rule`));
    }
  );

  it('lists nothing else', () => {
    expect(DETECTION_WATCH_RULE_ATTACHMENT_IDS).toHaveLength(2);
  });
});

describe('isDetectionWatchRuleAttachmentId', () => {
  it('is true for the rule cards that the Detection Watch workers attach', () => {
    expect(isDetectionWatchRuleAttachmentId('tuned-rule')).toBe(true);
    expect(isDetectionWatchRuleAttachmentId('coverage-rule')).toBe(true);
  });

  it('is false for the rule draft of Rule Creation and for a card from a normal chat', () => {
    expect(isDetectionWatchRuleAttachmentId('rule-draft')).toBe(false);
    expect(isDetectionWatchRuleAttachmentId('air:5f0c1d2e')).toBe(false);
  });
});
