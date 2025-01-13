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
    return { bool: { must_not: conditions.isFullyTranslated() } };
  },
  isNotInstalled(): QueryDslQueryContainer {
    return {
      nested: {
        path: 'elastic_rule',
        query: { bool: { must_not: { exists: { field: 'elastic_rule.id' } } } },
      },
    };
  },
  isPrebuilt(): QueryDslQueryContainer {
    return {
      nested: {
        path: 'elastic_rule',
        query: { exists: { field: 'elastic_rule.prebuilt_rule_id' } },
      },
    };
  },
  isCustom(): QueryDslQueryContainer {
    return {
      nested: {
        path: 'elastic_rule',
        query: { bool: { must_not: { exists: { field: 'elastic_rule.prebuilt_rule_id' } } } },
      },
    };
  },
  matchTitle(title: string): QueryDslQueryContainer {
    return {
      nested: {
        path: 'elastic_rule',
        query: { match: { 'elastic_rule.title': title } },
      },
    };
  },
  isInstallable(): QueryDslQueryContainer[] {
    return [this.isFullyTranslated(), this.isNotInstalled()];
  },
  isFailed(): QueryDslQueryContainer {
    return { term: { status: SiemMigrationStatus.FAILED } };
  },
};
