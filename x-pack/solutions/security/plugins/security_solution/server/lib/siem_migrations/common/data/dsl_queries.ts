/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';

const escapeWildcard = (value: string): string => value.replace(/[\\*?]/g, '\\$&');

export const dsl = {
  /**
   * Matches a `text` field either as full text or as a sub-string.
   * The analyzed `match` keeps multi-word, any-order matching (e.g. "memory creation").
   * The `.keyword` wildcard finds part of a value: titles are analyzed with the standard
   * analyzer, which does not split on `_` or `-`, so a name like
   * `sysmon_detect_sysmon_config_changed` is a single token that a plain `match` for
   * `sysmon` can never hit.
   */
  keywordMatch(field: string, value: string): QueryDslQueryContainer {
    return {
      bool: {
        should: [
          { match: { [field]: { query: value, operator: 'and' } } },
          {
            wildcard: {
              [`${field}.keyword`]: { value: `*${escapeWildcard(value)}*`, case_insensitive: true },
            },
          },
        ],
      },
    };
  },
  isFullyTranslated(): QueryDslQueryContainer {
    return { term: { translation_result: MigrationTranslationResult.FULL } };
  },
  isNotFullyTranslated(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isFullyTranslated() } };
  },
  isPartiallyTranslated(): QueryDslQueryContainer {
    return { term: { translation_result: MigrationTranslationResult.PARTIAL } };
  },
  isNotPartiallyTranslated(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isPartiallyTranslated() } };
  },
  isFullOrPartiallyTranslated(): QueryDslQueryContainer {
    return {
      terms: {
        translation_result: [MigrationTranslationResult.FULL, MigrationTranslationResult.PARTIAL],
      },
    };
  },
  isNotFullOrPartiallyTranslated(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isFullOrPartiallyTranslated() } };
  },
  isUntranslatable(): QueryDslQueryContainer {
    return { term: { translation_result: MigrationTranslationResult.UNTRANSLATABLE } };
  },
  isEligibleForTranslation(): QueryDslQueryContainer {
    return {
      bool: {
        must_not: [
          {
            bool: {
              filter: [
                { term: { 'original_rule.vendor': 'qradar' } },
                { match_phrase: { 'original_rule.query': 'buildingBlock="true"' } },
              ],
            },
          },
        ],
      },
    };
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
};
