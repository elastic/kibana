/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import { THREAT_QUERY_BASE } from '../../../threat_intelligence/constants/common';

/**
 * Prepare shared `query` fields used within indicator search request
 */
export const getIndicatorQueryParams = (id: string) => {
  return {
    query: buildEsQuery(
      undefined,
      [
        {
          query: THREAT_QUERY_BASE,
          language: 'kuery',
        },
      ],
      [
        {
          query: { id },
          meta: {},
        },
      ]
    ),
  };
};
