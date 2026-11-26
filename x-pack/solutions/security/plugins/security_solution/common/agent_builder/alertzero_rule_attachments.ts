/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Must match the attachment ids `attach_rule` uses in rule_tuning_review.yaml and
// coverage_review.yaml.
export const ALERTZERO_RULE_ATTACHMENT_IDS: readonly string[] = ['tuned-rule', 'coverage-rule'];

/** Whether AlertZero added the rule attachment to an investigation, where a rule changes only through a proposal. */
export const isAlertZeroRuleAttachmentId = (attachmentId: string): boolean =>
  ALERTZERO_RULE_ATTACHMENT_IDS.includes(attachmentId);
