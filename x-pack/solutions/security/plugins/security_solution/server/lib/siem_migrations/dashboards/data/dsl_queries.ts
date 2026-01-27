/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { dsl as genericDsl } from '../../common/data/dsl_queries';

export const dsl = {
  matchElasticTitle(title: string): QueryDslQueryContainer {
    return { match: { 'elastic_dashboard.title': title } };
  },
  matchOriginalTitle(title: string): QueryDslQueryContainer {
    return { match: { 'original_dashboard.title': title } };
  },
  matchTitle(title: string): QueryDslQueryContainer {
    return {
      bool: {
        should: [
          // Match the translated title
          dsl.matchElasticTitle(title),
          // If translation failed, match the original title
          { bool: { must: [genericDsl.isFailed(), dsl.matchOriginalTitle(title)] } },
        ],
      },
    };
  },

  isInstalled(): QueryDslQueryContainer {
    return { exists: { field: 'elastic_dashboard.id' } };
  },
  isNotInstalled(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isInstalled() } };
  },

  isInstallable(): QueryDslQueryContainer {
    return { bool: { must: [genericDsl.isFullOrPartiallyTranslated(), dsl.isNotInstalled()] } };
  },

  isNotInstallable(): QueryDslQueryContainer {
    return { bool: { should: [genericDsl.isNotFullOrPartiallyTranslated(), dsl.isInstalled()] } };
  },
};
