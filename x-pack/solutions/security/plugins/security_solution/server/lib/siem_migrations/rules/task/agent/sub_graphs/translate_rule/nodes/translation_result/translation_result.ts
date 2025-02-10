/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_TRANSLATION_RISK_SCORE,
  DEFAULT_TRANSLATION_SEVERITY,
  RuleTranslationResult,
} from '../../../../../../../../../../common/siem_migrations/constants';
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
    };

    const query = elasticRule.query;
    let translationResult;

    if (!query) {
      translationResult = RuleTranslationResult.UNTRANSLATABLE;
    } else {
      if (query.startsWith('FROM logs-*')) {
        elasticRule.query = query.replace('FROM logs-*', 'FROM [indexPattern]');
        translationResult = RuleTranslationResult.PARTIAL;
      } else if (state.validation_errors?.esql_errors) {
        translationResult = RuleTranslationResult.PARTIAL;
      } else if (query.match(/\[(macro|lookup):.*?\]/)) {
        translationResult = RuleTranslationResult.PARTIAL;
      } else {
        translationResult = RuleTranslationResult.FULL;
      }
    }

    return {
      elastic_rule: elasticRule,
      translation_result: translationResult,
    };
  };
};
