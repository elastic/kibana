/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { UnitedDefinitionField } from './types';

export const collectValues = ({
  field,
  mapping = { type: 'keyword' },
  sourceField,
  fieldHistoryLength,
}: {
  field: string;
  mapping?: MappingProperty;
  sourceField?: string;
  fieldHistoryLength: number;
}): UnitedDefinitionField => ({
  field,
  definition: {
    source: sourceField ?? field,
    destination: field,
    aggregation: {
      type: 'terms',
      limit: fieldHistoryLength,
    },
  },
  retention_operator: { operation: 'collect_values', field, maxLength: fieldHistoryLength },
  mapping,
});

export const collectValuesWithLength =
  (fieldHistoryLength: number) =>
  (opts: { field: string; mapping?: MappingProperty; sourceField?: string }) =>
    collectValues({ ...opts, fieldHistoryLength });

export const newestValue = ({
  field,
  mapping = { type: 'keyword' },
  sourceField,
}: {
  field: string;
  mapping?: MappingProperty;
  sourceField?: string;
}): UnitedDefinitionField => ({
  field,
  definition: {
    source: sourceField ?? field,
    destination: field,
    aggregation: {
      type: 'top_value',
      sort: {
        '@timestamp': 'desc',
      },
    },
  },
  retention_operator: { operation: 'prefer_newest_value', field },
  mapping,
});

export const oldestValue = ({
  field,
  mapping = { type: 'keyword' },
  sourceField,
}: {
  field: string;
  mapping?: MappingProperty;
  sourceField?: string;
}): UnitedDefinitionField => ({
  field,
  definition: {
    source: sourceField ?? field,
    destination: field,
    aggregation: {
      type: 'top_value',
      sort: {
        '@timestamp': 'asc',
      },
    },
  },
  retention_operator: { operation: 'prefer_oldest_value', field },
  mapping,
});
