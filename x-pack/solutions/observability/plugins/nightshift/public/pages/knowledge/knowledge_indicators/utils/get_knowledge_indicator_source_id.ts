/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';

/** Id of the representative source. */
export const getKnowledgeIndicatorSourceId = (knowledgeIndicator: KnowledgeIndicator): string =>
  knowledgeIndicator.kind === 'feature'
    ? knowledgeIndicator.feature.source_id
    : knowledgeIndicator.source_id;

/** Ids of every source a knowledge indicator was found in. */
export const getKnowledgeIndicatorSourceIds = (knowledgeIndicator: KnowledgeIndicator): string[] =>
  knowledgeIndicator.kind === 'feature'
    ? knowledgeIndicator.feature.sources
    : [knowledgeIndicator.source_id];
