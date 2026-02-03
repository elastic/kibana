/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, EntityRetentionField } from './entity_schema';
import { oldestValue, newestValue } from './field_retention_operations';

// Copied from x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/common.ts

export const getCommonFieldDescriptions = (
  ecsField: Omit<EntityType, 'generic'> | 'entity'
): EntityRetentionField[] => [
  oldestValue({
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
  newestValue({
    source: `${ecsField}.risk.calculated_level`,
  }),
  newestValue({
    source: `${ecsField}.risk.calculated_score`,
    mapping: {
      type: 'float',
    },
  }),
  newestValue({
    source: `${ecsField}.risk.calculated_score_norm`,
    mapping: {
      type: 'float',
    },
  }),
];

export const getEntityFieldsDescriptions = (rootField?: EntityType) => {
  const prefix = rootField ? `${rootField}.entity` : 'entity';

  return [
    newestValue({ source: `${prefix}.name`, destination: 'entity.name' }),
    newestValue({ source: `${prefix}.source`, destination: 'entity.source' }),
    newestValue({ source: `${prefix}.type`, destination: 'entity.type' }),
    newestValue({ source: `${prefix}.sub_type`, destination: 'entity.sub_type' }),
    newestValue({ source: `${prefix}.url`, destination: 'entity.url' }),

    newestValue({
      source: `${prefix}.attributes.Privileged`,
      destination: 'entity.attributes.Privileged',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.Asset`,
      destination: 'entity.attributes.Asset',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.Managed`,
      destination: 'entity.attributes.Managed',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.Mfa_enabled`,
      destination: 'entity.attributes.Mfa_enabled',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),

    /* Lifecycle fields should not allow update via the API */
    newestValue({
      source: `${prefix}.lifecycle.First_seen`,
      destination: 'entity.lifecycle.First_seen',
      mapping: { type: 'date' },
    }),
    newestValue({
      source: `${prefix}.lifecycle.Last_activity`,
      destination: 'entity.lifecycle.Last_activity',
      mapping: { type: 'date' },
    }),

    newestValue({
      source: `${prefix}.behaviors.Brute_force_victim`,
      destination: 'entity.behaviors.Brute_force_victim',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.behaviors.New_country_login`,
      destination: 'entity.behaviors.New_country_login',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.behaviors.Used_usb_device`,
      destination: 'entity.behaviors.Used_usb_device',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),

    newestValue({
      source: `${prefix}.risk.calculated_level`,
      destination: 'entity.risk.calculated_level',
    }),
    newestValue({
      source: `${prefix}.risk.calculated_score`,
      destination: 'entity.risk.calculated_score',
      mapping: {
        type: 'float',
      },
    }),
    newestValue({
      source: `${prefix}.risk.calculated_score_norm`,
      destination: 'entity.risk.calculated_score_norm',
      mapping: {
        type: 'float',
      },
    }),
  ];
};
