/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  // TODO: RuleTranslationResult -> TranslationResult
  RuleTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import { SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER } from '../constants';

export const dsl = {
  isFullyTranslated(): QueryDslQueryContainer {
    return { term: { translation_result: RuleTranslationResult.FULL } };
  },
  isNotFullyTranslated(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isFullyTranslated() } };
  },
  isPartiallyTranslated(): QueryDslQueryContainer {
    return { term: { translation_result: RuleTranslationResult.PARTIAL } };
  },
  isNotPartiallyTranslated(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isPartiallyTranslated() } };
  },
  isUntranslatable(): QueryDslQueryContainer {
    return { term: { translation_result: RuleTranslationResult.UNTRANSLATABLE } };
  },
  isNotUntranslatable(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isUntranslatable() } };
  },
  isFailed(): QueryDslQueryContainer {
    return { term: { status: SiemMigrationStatus.FAILED } };
  },
  isNotFailed(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isFailed() } };
  },
  isMissingIndex(): QueryDslQueryContainer {
    return {
      query_string: {
        query: `elastic_rule.query: "${SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER}"`,
      },
    };
  },
};
