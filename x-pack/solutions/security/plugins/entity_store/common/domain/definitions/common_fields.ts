/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, EntityField } from './entity_schema';
import { collectValues, newestValue } from './field_retention_operations';

export const ENTITY_ID_FIELD = 'entity.id';

// Copied from x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/common.ts

export const getCommonFieldDescriptions = (
  ecsField: Omit<EntityType, 'generic'> | 'entity'
): EntityField[] => [
  newestValue({
    source: '_index',
    destination: 'entity.source',
  }),
  newestValue({ source: 'asset.id' }),
  newestValue({ source: 'asset.name' }),
  newestValue({ source: 'asset.owner' }),
  newestValue({ source: 'asset.serial_number' }),
  newestValue({ source: 'asset.model' }),
  newestValue({ source: 'asset.vendor' }),
  newestValue({ source: 'asset.environment' }),
  newestValue({ source: 'asset.criticality' }),
  newestValue({ source: 'asset.business_unit' }),
];

export const getEntityFieldsDescriptions = (rootField?: EntityType) => {
  const prefix = rootField ? `${rootField}.entity` : 'entity';

  return [
    newestValue({ source: `${prefix}.source`, destination: 'entity.source' }),
    newestValue({ source: `${prefix}.type`, destination: 'entity.type' }),
    newestValue({ source: `${prefix}.sub_type`, destination: 'entity.sub_type' }),
    newestValue({ source: `${prefix}.url`, destination: 'entity.url' }),

    collectValues({
      source: `${prefix}.attributes.watchlists`,
      destination: 'entity.attributes.watchlists',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.asset`,
      destination: 'entity.attributes.asset',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.managed`,
      destination: 'entity.attributes.managed',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.mfa_enabled`,
      destination: 'entity.attributes.mfa_enabled',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.lifecycle.first_seen`,
      destination: 'entity.lifecycle.first_seen',
      mapping: { type: 'date' },
    }),
    newestValue({
      source: `${prefix}.lifecycle.last_activity`,
      destination: 'entity.lifecycle.last_activity',
      mapping: { type: 'date' },
    }),
    collectValues({
      source: `${prefix}.behaviors.rule_names`,
      destination: 'entity.behaviors.rule_names',
      mapping: { type: 'keyword' },
      fieldHistoryLength: 100,
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.behaviors.anomaly_job_ids`,
      destination: 'entity.behaviors.anomaly_job_ids',
      mapping: { type: 'keyword' },
      fieldHistoryLength: 100,
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.relationships.communicates_with`,
      destination: 'entity.relationships.communicates_with',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.relationships.depends_on`,
      destination: 'entity.relationships.depends_on',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.relationships.owns_inferred`,
      destination: 'entity.relationships.owns_inferred',
      mapping: { type: 'keyword' },
    }),
    collectValues({
      source: `${prefix}.relationships.accesses_infrequently`,
      destination: 'entity.relationships.accesses_infrequently',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.relationships.accesses_frequently`,
      destination: 'entity.relationships.accesses_frequently',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.relationships.owns`,
      destination: 'entity.relationships.owns',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.relationships.supervises`,
      destination: 'entity.relationships.supervises',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.resolved_to`,
      destination: 'entity.relationships.resolution.resolved_to',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.risk.calculated_level`,
      destination: 'entity.relationships.resolution.risk.calculated_level',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.risk.calculated_score`,
      destination: 'entity.relationships.resolution.risk.calculated_score',
      mapping: { type: 'float' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.risk.calculated_score_norm`,
      destination: 'entity.relationships.resolution.risk.calculated_score_norm',
      mapping: { type: 'float' },
      allowAPIUpdate: true,
    }),
  ];
};
