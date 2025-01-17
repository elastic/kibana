/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  RuleTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';

export const conditions = {
  isFullyTranslated(): QueryDslQueryContainer {
    return { term: { translation_result: RuleTranslationResult.FULL } };
  },
  isNotFullyTranslated(): QueryDslQueryContainer {
    return { bool: { must_not: this.isFullyTranslated() } };
  },
  isPartiallyTranslated(): QueryDslQueryContainer {
    return { term: { translation_result: RuleTranslationResult.PARTIAL } };
  },
  isNotPartiallyTranslated(): QueryDslQueryContainer {
    return { bool: { must_not: this.isPartiallyTranslated() } };
  },
  isUntranslatable(): QueryDslQueryContainer {
    return { term: { translation_result: RuleTranslationResult.UNTRANSLATABLE } };
  },
  isNotUntranslatable(): QueryDslQueryContainer {
    return { bool: { must_not: this.isUntranslatable() } };
  },
  isInstalled(): QueryDslQueryContainer {
    return { exists: { field: 'elastic_rule.id' } };
  },
  isNotInstalled(): QueryDslQueryContainer {
    return { bool: { must_not: this.isInstalled() } };
  },
  isPrebuilt(): QueryDslQueryContainer {
    return { exists: { field: 'elastic_rule.prebuilt_rule_id' } };
  },
  isCustom(): QueryDslQueryContainer {
    return { bool: { must_not: this.isPrebuilt() } };
  },
  matchTitle(title: string): QueryDslQueryContainer {
    return { match: { 'elastic_rule.title': title } };
  },
  isInstallable(): QueryDslQueryContainer[] {
    return [this.isFullyTranslated(), this.isNotInstalled()];
  },
  isNotInstallable(): QueryDslQueryContainer[] {
    return [this.isNotFullyTranslated(), this.isInstalled()];
  },
  isFailed(): QueryDslQueryContainer {
    return { term: { status: SiemMigrationStatus.FAILED } };
  },
  isNotFailed(): QueryDslQueryContainer {
    return { bool: { must_not: conditions.isFailed() } };
  },
};
