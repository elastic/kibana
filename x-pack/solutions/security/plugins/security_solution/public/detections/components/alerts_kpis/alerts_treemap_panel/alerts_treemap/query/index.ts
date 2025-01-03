/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/** The maximum number of items to render */
export const DEFAULT_STACK_BY_FIELD0_SIZE = 1000;
export const DEFAULT_STACK_BY_FIELD1_SIZE = 1000;

interface OptionalSubAggregation {
  stackByField1: {
    terms: {
      field: string;
      order: {
        _count: 'desc';
      };
      size: number;
    };
  };
}

export const getOptionalSubAggregation = ({
  stackByField1,
  stackByField1Size,
}: {
  stackByField1: string | undefined;
  stackByField1Size: number;
}): OptionalSubAggregation | {} =>
  stackByField1 != null && !isEmpty(stackByField1.trim())
    ? {
        stackByField1: {
          terms: {
            field: stackByField1,
            order: {
              _count: 'desc',
            },
            size: stackByField1Size,
          },
        },
      }
    : {};

export const getAlertsRiskQuery = ({
  additionalFilters = [],
  from,
  runtimeMappings,
  stackByField0,
  stackByField0Size = DEFAULT_STACK_BY_FIELD0_SIZE,
  stackByField1,
  stackByField1Size = DEFAULT_STACK_BY_FIELD1_SIZE,
  riskSubAggregationField,
  to,
}: {
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }>;
  from: string;
  runtimeMappings?: MappingRuntimeFields;
  stackByField0: string;
  stackByField0Size?: number;
  stackByField1: string | undefined;
  stackByField1Size?: number;
  riskSubAggregationField: string;
  to: string;
}) => ({
  size: 0,
  aggs: {
    stackByField0: {
      terms: {
        field: stackByField0,
        order: {
          _count: 'desc',
        },
        size: stackByField0Size,
      },
      aggs: {
        ...getOptionalSubAggregation({
          stackByField1,
          stackByField1Size,
        }),
        maxRiskSubAggregation: {
          max: {
            field: riskSubAggregationField,
          },
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
        ...additionalFilters,
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
      ],
    },
  },
  runtime_mappings: runtimeMappings,
});
