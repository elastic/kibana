/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Context Engine AI index that holds AlertZero decision trees. Not the forensics sweep queue. */
export const SECURITY_DECISION_TREE_AI_INDEX_ID = 'security-decision-trees';

export const SECURITY_DECISION_TREE_TYPE = 'security.decision_tree';

export const SECURITY_DECISION_TREE_TAG = 'decision-tree';

/** Forensic writes stay tentative. The proposal bridge sets established after an analyst's action succeeds. */
export const SECURITY_DECISION_TREE_STATUS_TENTATIVE = 'tentative';
