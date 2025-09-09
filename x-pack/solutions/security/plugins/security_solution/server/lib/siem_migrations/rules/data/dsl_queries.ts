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
  matchTitle(title: string): QueryDslQueryContainer {
    return { match: { 'elastic_rule.title': title } };
  },
  isInstallable(): QueryDslQueryContainer[] {
    return [genericDsl.isFullyTranslated(), dsl.isNotInstalled()];
  },
  isNotInstallable(): QueryDslQueryContainer[] {
    return [genericDsl.isNotFullyTranslated(), dsl.isInstalled()];
  },
  isMissingIndex(): QueryDslQueryContainer {
    return {
      query_string: { query: `elastic_rule.query: "${MISSING_INDEX_PATTERN_PLACEHOLDER}"` },
    };
  },
};
