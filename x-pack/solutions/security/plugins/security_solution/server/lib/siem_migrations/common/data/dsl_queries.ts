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

export const dsl = {
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
