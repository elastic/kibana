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
import { parse } from 'yaml';
import {
  DETECTION_WATCH_RULE_ATTACHMENT_IDS,
  isDetectionWatchRuleAttachmentId,
} from './detection_watch_rule_attachments';

type YamlNode = string | number | boolean | null | YamlNode[] | { [key: string]: YamlNode };

// Ids of the rule cards that the workflow attaches. Undefined for a card with no id.
const getRuleCardIds = (node: YamlNode): Array<YamlNode | undefined> => {
  if (node === null || typeof node !== 'object') {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(getRuleCardIds);
  }

  const ownId = node.type === 'security.rule' ? [node.id] : [];

  return [...ownId, ...Object.values(node).flatMap(getRuleCardIds)];
};

// Fails when the Rule Tuning or Rule Coverage workflow attaches a rule card under an id that is
// not in the list. Such a card would show its save buttons again.
// And we don't want to show save buttons on rule cards in investigation conversations.
describe('DETECTION_WATCH_RULE_ATTACHMENT_IDS', () => {
  it.each([
    [ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID, 'tuned-rule'],
    [ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID, 'coverage-rule'],
  ])('every rule card that workflow %s attaches has the id "%s"', (workflowId, attachmentId) => {
    const workflow: YamlNode = parse(getManagedWorkflowDefinition(workflowId)?.yaml ?? '');
    const uniqueRuleCardIds = [...new Set(getRuleCardIds(workflow))];

    expect(DETECTION_WATCH_RULE_ATTACHMENT_IDS).toContain(attachmentId);
    expect(uniqueRuleCardIds).toStrictEqual([attachmentId]);
  });

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
