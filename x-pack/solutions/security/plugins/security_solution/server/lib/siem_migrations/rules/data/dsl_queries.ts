/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { dsl as genericDsl } from '../../common/data/dsl_queries';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../common/constants';

export const dsl = {
  isInstalled(): QueryDslQueryContainer {
    return { exists: { field: 'elastic_rule.id' } };
  },
  isNotInstalled(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isInstalled() } };
  },
  isPrebuilt(): QueryDslQueryContainer {
    return { exists: { field: 'elastic_rule.prebuilt_rule_id' } };
  },
  isCustom(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isPrebuilt() } };
  },
  matchElasticTitle(title: string): QueryDslQueryContainer {
    return { match: { 'elastic_rule.title': title } };
  },
  matchOriginalTitle(title: string): QueryDslQueryContainer {
    return { match: { 'original_rule.title': title } };
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
  matchTitles(titles: string[]): QueryDslQueryContainer {
    return {
      terms: {
        'original_rule.title.keyword': titles,
      },
    };
  },
  isInstallable(): QueryDslQueryContainer {
    return { bool: { must: [genericDsl.isFullyTranslated(), dsl.isNotInstalled()] } };
  },
  isNotInstallable(): QueryDslQueryContainer {
    return { bool: { should: [genericDsl.isNotFullyTranslated(), dsl.isInstalled()] } };
  },
  isMissingIndex(): QueryDslQueryContainer {
    return {
      query_string: { query: `elastic_rule.query: "${MISSING_INDEX_PATTERN_PLACEHOLDER}"` },
    };
  },
};
