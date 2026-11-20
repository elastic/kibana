/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KnowledgeIndicatorFeature,
  QueryKnowledgeIndicator,
} from '@kbn/significant-events-plugin/server';
import type { DetectionSignalReading } from '../types';

/** The feature significant_events keeps for all the services of a source; it names no service. */
const AGGREGATE_SERVICES_ID_PREFIX = 'services:';

/**
 * What a Known failures signal is about. A knowledge indicator linked to exactly one service
 * feature is about that service; anything else is about its source. The context engine will
 * resolve this per knowledge indicator later.
 */
export function resolveEntity({
  knowledgeIndicator,
  features,
}: {
  knowledgeIndicator: Pick<QueryKnowledgeIndicator, 'source_id' | 'feature_ids'>;
  /** The entity features of the knowledge indicator's source. */
  features: KnowledgeIndicatorFeature[];
}): DetectionSignalReading['entity'] {
  const linked = new Set(knowledgeIndicator.feature_ids);
  const services = features.filter(
    ({ id, type, subtype }) =>
      linked.has(id) &&
      type === 'entity' &&
      subtype === 'service' &&
      !id.startsWith(AGGREGATE_SERVICES_ID_PREFIX)
  );

  if (services.length !== 1) {
    return { type: 'source', name: knowledgeIndicator.source_id };
  }

  const [service] = services;
  const name = service.properties.name;
  return {
    type: 'service',
    name: typeof name === 'string' && name ? name : service.title ?? service.id,
  };
}
