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

// Escapes the characters that have a special meaning in a wildcard query (`*` and `?`
// wildcard operators and `\` escape char) so the user's search text is matched literally.
const escapeWildcard = (value: string): string => value.replace(/[\\*?]/g, '\\$&');

export const dsl = {
  // Case-insensitive substring match on the `.keyword` sub-field of a `text` field.
  // Needed because titles are analyzed with the standard analyzer, which does not split on
  // characters like `_` or `-`, so a plain `match` can only find a whole-token term. A
  // wildcard over `.keyword` lets a search like `sysmon` match `sysmon_detect_sysmon_config_changed`.
  substringMatch(field: string, value: string): QueryDslQueryContainer {
    return {
      wildcard: {
        [`${field}.keyword`]: { value: `*${escapeWildcard(value)}*`, case_insensitive: true },
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
