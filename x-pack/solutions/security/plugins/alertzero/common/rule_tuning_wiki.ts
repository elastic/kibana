/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KNOWLEDGE_INDICATOR_AI_INDEX_DEST } from './ai_indices';

/** `rule_tuning_review.yaml` names the wiki, page type and heading by these literals. */
export const ALERTZERO_WIKI_ID = 'alertzero' as const;

/**
 * The wiki steps run as the Worker's service account, and the reserved Worker roles can read and
 * write this AI index and no other one that could hold pages. A dedicated wiki index needs a grant
 * in every Worker role, in Elasticsearch and in the serverless role definitions, before this can
 * point at it.
 */
export const ALERTZERO_WIKI_INDEX = KNOWLEDGE_INDICATOR_AI_INDEX_DEST.value;

/** One page per rule, keyed on the rule's saved-object id, which survives a rename. */
export const DETECTION_RULE_PAGE_TYPE = 'detection_rule' as const;

export const DETECTION_RULE_ENTRIES_HEADING = 'Decision history';
