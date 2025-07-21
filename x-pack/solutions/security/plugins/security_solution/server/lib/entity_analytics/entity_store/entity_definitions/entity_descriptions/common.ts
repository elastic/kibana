/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseECSEntityField } from '../../../../../../common/api/entity_analytics/entity_store';
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
