/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { FieldDescription } from '../../installation/types';

export const collectValues = ({
  destination,
  source,
  fieldHistoryLength = 10,
  mapping = { type: 'keyword' },
}: {
  source: string;
  destination?: string;
  mapping?: MappingProperty;
  fieldHistoryLength?: number;
}): FieldDescription => ({
  destination: destination ?? source,
  source,
  retention: {
    operation: 'collect_values',
    maxLength: fieldHistoryLength,
  },
  aggregation: {
    type: 'terms',
    limit: fieldHistoryLength,
  },
  mapping,
});

export const newestValue = ({
  destination,
  mapping = { type: 'keyword' },
  source,
  sort,
}: {
  source: string;
  destination?: string;
  mapping?: MappingProperty;
  sort?: Record<string, 'asc' | 'desc'>;
}): FieldDescription => ({
  destination: destination ?? source,
  source,
  retention: { operation: 'prefer_newest_value' },
  aggregation: {
    type: 'top_value',
    sort: sort ?? {
      '@timestamp': 'desc',
    },
  },
  mapping,
});

export const oldestValue = ({
  source,
  destination,
  mapping = { type: 'keyword' },
  sort,
}: {
  source: string;
  destination?: string;
  mapping?: MappingProperty;
  sort?: Record<string, 'asc' | 'desc'>;
}): FieldDescription => ({
  destination: destination ?? source,
  source,
  retention: { operation: 'prefer_oldest_value' },
  aggregation: {
    type: 'top_value',
    sort: sort ?? {
      '@timestamp': 'asc',
    },
  },
  mapping,
});
