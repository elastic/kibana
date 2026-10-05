/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';

/** Id of the source a knowledge indicator belongs to. The wire field is still `stream_name`. */
export const getKnowledgeIndicatorSourceId = (knowledgeIndicator: KnowledgeIndicator): string =>
  knowledgeIndicator.kind === 'feature'
    ? knowledgeIndicator.feature.stream_name
    : knowledgeIndicator.stream_name;
