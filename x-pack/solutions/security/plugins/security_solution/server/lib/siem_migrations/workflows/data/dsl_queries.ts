/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { dsl as genericDsl } from '../../common/data/dsl_queries';

export const dsl = {
  matchElasticTitle(title: string): QueryDslQueryContainer {
    return { match: { 'elastic_workflow.title': { query: title, operator: 'and' } } };
  },
  matchOriginalTitle(title: string): QueryDslQueryContainer {
    return { match: { 'original_workflow.title': { query: title, operator: 'and' } } };
  },
  matchTitle(title: string): QueryDslQueryContainer {
    return {
      bool: {
        should: [
          dsl.matchElasticTitle(title),
          { bool: { must: [genericDsl.isFailed(), dsl.matchOriginalTitle(title)] } },
        ],
      },
    };
  },
  isInstalled(): QueryDslQueryContainer {
    return { exists: { field: 'elastic_workflow.id' } };
  },
  isNotInstalled(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isInstalled() } };
  },
};
