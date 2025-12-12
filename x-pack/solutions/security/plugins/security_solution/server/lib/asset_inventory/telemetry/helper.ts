/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_INDEX = '.entities*';

export const getAggsQuery = (
  termsField: string,
  size: number = 10,
  index: string = ENTITY_INDEX
) => ({
  size: 0,
  index,
  aggs: {
    field_terms: {
      terms: {
        field: termsField,
        size,
        order: {
          last_doc_timestamp: 'desc' as const,
        },
      },
      aggs: {
        last_doc_timestamp: {
          max: {
            field: '@timestamp',
          },
        },
      },
    },
  },
});
