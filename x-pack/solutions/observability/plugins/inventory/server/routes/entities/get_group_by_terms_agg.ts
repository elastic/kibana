/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsCompositeAggregation } from '@elastic/elasticsearch/lib/api/types';

export const getGroupByTermsAgg = (fields: { [key: string]: string[] }, maxSize = 500) => {
  return Object.entries(fields).reduce((acc, [sourceId, identityFields]) => {
    acc[sourceId] = {
      composite: {
        size: maxSize,
        sources: identityFields.map((field) => ({
          [field]: {
            terms: {
              field,
            },
          },
        })),
      },
    };
    return acc;
  }, {} as Record<string, { composite: AggregationsCompositeAggregation }>);
};
