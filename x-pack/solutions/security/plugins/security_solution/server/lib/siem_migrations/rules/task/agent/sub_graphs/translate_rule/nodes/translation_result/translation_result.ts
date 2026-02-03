/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import {
  DEFAULT_TRANSLATION_RISK_SCORE,
  DEFAULT_TRANSLATION_SEVERITY,
} from '../../../../../../constants';
import { MigrationTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';

export const getTranslationResultNode = (): GraphNode => {
  return async (state) => {
    // Set defaults
    const elasticRule = {
      title: state.original_rule.title,
      description: state.original_rule.description || state.original_rule.title,
      severity: DEFAULT_TRANSLATION_SEVERITY,
      risk_score: DEFAULT_TRANSLATION_RISK_SCORE,
      ...state.elastic_rule,
      threat: state.original_rule.threat,
    };

    const query = elasticRule.query;
    let translationResult;

    if (!query) {
      translationResult = MigrationTranslationResult.UNTRANSLATABLE;
    } else {
      if (query.startsWith('FROM logs-*')) {
        elasticRule.query = query.replace(
          'FROM logs-*',
          `FROM ${MISSING_INDEX_PATTERN_PLACEHOLDER}`
        );
        translationResult = MigrationTranslationResult.PARTIAL;
      } else if (state.validation_errors?.esql_errors) {
        translationResult = MigrationTranslationResult.PARTIAL;
      } else if (query.match(/\[(macro|lookup):.*?\]/)) {
        translationResult = MigrationTranslationResult.PARTIAL;
      } else {
        translationResult = MigrationTranslationResult.FULL;
      }
    }

    return {
      elastic_rule: elasticRule,
      translation_result: translationResult,
    };
  };
};
