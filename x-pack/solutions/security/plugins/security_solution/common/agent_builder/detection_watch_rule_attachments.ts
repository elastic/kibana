/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The rule cards that the Detection Watch workers (Rule Tuning and Rule Coverage) attach for an
// existing rule. Must match the id of every `security.rule` attachment in tuning_review.yaml and
// coverage_review.yaml.
export const DETECTION_WATCH_RULE_ATTACHMENT_IDS: readonly string[] = [
  'tuned-rule',
  'coverage-rule',
];

/** Whether a Detection Watch worker added the rule attachment to an investigation, where a rule changes only through a proposal. */
export const isDetectionWatchRuleAttachmentId = (attachmentId: string): boolean =>
  DETECTION_WATCH_RULE_ATTACHMENT_IDS.includes(attachmentId);
