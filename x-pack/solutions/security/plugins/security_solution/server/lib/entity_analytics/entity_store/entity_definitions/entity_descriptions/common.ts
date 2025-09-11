/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BaseECSEntityField,
  EntityType,
} from '../../../../../../common/api/entity_analytics/entity_store';
import type { FieldDescription } from '../../installation/types';

import { oldestValue, newestValue } from './field_utils';

export const getCommonFieldDescriptions = (ecsField: BaseECSEntityField): FieldDescription[] => {
  return [
    oldestValue({
      source: '_index',
      destination: 'entity.source',
    }),
    newestValue({ source: 'asset.criticality' }),
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
};

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
    }),
    newestValue({
      source: `${prefix}.lifecycle.First_seen`,
      destination: 'entity.lifecycle.First_seen',
    }),
  ];
};
