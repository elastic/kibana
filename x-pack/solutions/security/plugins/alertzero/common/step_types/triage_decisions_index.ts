/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';

/** AI index for alert triage decisions. It has its own index so the space filter can scope it. */
export const TRIAGE_DECISIONS_AI_INDEX_ID = 'security-triage-decisions' as const;

export const TRIAGE_DECISIONS_AI_INDEX_DEST = getAiIndexDest('index', TRIAGE_DECISIONS_AI_INDEX_ID);
