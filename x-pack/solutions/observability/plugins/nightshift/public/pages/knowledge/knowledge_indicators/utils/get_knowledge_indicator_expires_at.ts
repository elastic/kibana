/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';

export const getKnowledgeIndicatorExpiresAt = (
  knowledgeIndicator: KnowledgeIndicator
): string | undefined =>
  knowledgeIndicator.kind === 'feature'
    ? knowledgeIndicator.feature.expires_at
    : knowledgeIndicator.query.expires_at;
