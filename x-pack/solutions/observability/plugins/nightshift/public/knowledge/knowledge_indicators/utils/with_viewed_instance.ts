/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';

/**
 * Swaps a folded feature's top-level fields for the instance with `instanceUuid`; unknown uuids
 * and query indicators pass through.
 */
export const withViewedInstance = (
  knowledgeIndicator: KnowledgeIndicator,
  instanceUuid: string | undefined
): KnowledgeIndicator => {
  if (knowledgeIndicator.kind !== 'feature' || instanceUuid === undefined) {
    return knowledgeIndicator;
  }
  const { feature } = knowledgeIndicator;
  const instance = feature.instances.find(({ uuid }) => uuid === instanceUuid);
  if (!instance || instance.uuid === feature.uuid) {
    return knowledgeIndicator;
  }
  return {
    ...knowledgeIndicator,
    feature: { ...instance, sources: feature.sources, instances: feature.instances },
  };
};
