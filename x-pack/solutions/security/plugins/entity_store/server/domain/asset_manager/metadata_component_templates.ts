/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import {
  ENTITY_BASE_PREFIX,
  ENTITY_SCHEMA_VERSION_V2,
  ENTITY_METADATA,
} from '../../../common/domain/entity_index';

export const getMetadataComponentTemplateName = (namespace: string) =>
  `${ENTITY_BASE_PREFIX}-${ENTITY_SCHEMA_VERSION_V2}-security_${ENTITY_METADATA}_${namespace}@platform`;

const getMetadataIndexMappings = (): MappingTypeMapping => ({
  dynamic_templates: [
    {
      relationship_target_keyword: {
        path_match: 'entity.relationships.*.target',
        mapping: { type: 'keyword' },
      },
    },
  ],
  properties: {
    '@timestamp': { type: 'date' },
    'event.ingested': { type: 'date' },
    'event.kind': { type: 'keyword' },
    'event.action': { type: 'keyword' },
    'entity.id': { type: 'keyword' },
    'entity.source': { type: 'keyword' },
    'entity.relationships': { type: 'object', dynamic: true },
    'related.user': { type: 'keyword' },
    'related.hosts': { type: 'keyword' },
    'Maintainer.kind': { type: 'keyword' },
    'Maintainer.scan_id': { type: 'keyword' },
    'Maintainer.lookback_window': { type: 'keyword' },
    // AI summary fields — scoped under ai_summary.* to avoid collisions with other doc types
    'entity.type': { type: 'keyword' },
    'ai_summary.generated_by': { type: 'keyword' },
    'ai_summary.generated_at': { type: 'date', format: 'epoch_millis' },
    'ai_summary.highlights': { type: 'object', dynamic: true },
    'ai_summary.recommendedActions': { type: 'keyword' },
    'ai_summary.anomaly_job_ids': { type: 'keyword' },
    'ai_summary.variant_id': { type: 'keyword' },
    'ai_summary.staleness.enabled_signals': { type: 'keyword' },
    'ai_summary.staleness.snapshot.risk_score': { type: 'float' },
  },
});

export const getMetadataComponentTemplate = (
  namespace: string
): ClusterPutComponentTemplateRequest => ({
  name: getMetadataComponentTemplateName(namespace),
  template: {
    settings: { hidden: true },
    mappings: getMetadataIndexMappings(),
  },
});
