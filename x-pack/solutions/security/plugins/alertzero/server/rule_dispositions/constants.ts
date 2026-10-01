/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Context Engine AI index for what AlertZero knows about a detection rule's alerts. */
export const RULE_DISPOSITIONS_AI_INDEX_ID = 'security-rule-dispositions';

/** Backing index for {@link RULE_DISPOSITIONS_AI_INDEX_ID}. Must use the `ai-index-idx-` prefix. */
export const RULE_DISPOSITIONS_AI_INDEX_DEST = 'ai-index-idx-security-rule-dispositions';

/** KI type naming the Investigation whose false positive closure proposal is open for a rule. */
export const FP_OPEN_POINTER_KI_TYPE = 'security.alert_triage_fp_open';

export const RULE_DISPOSITIONS_TAG = 'alertzero';

/** One pointer per rule and space, so every Alert Triage batch of a rule reads the same one. */
export const fpOpenPointerId = (spaceId: string, ruleId: string): string =>
  `${spaceId}:alert-triage-fp-open:${ruleId}`;
