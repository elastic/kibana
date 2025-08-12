/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';

export const getTranslationResultNode = (): GraphNode => {
  return async (state) => {
    // Set defaults
    const elasticVisualization = {
      title: state.original_panel.title,
      description: state.original_panel.description || state.original_panel.title,
      ...state.elastic_panel,
    };

    const query = elasticVisualization.query;
    let translationResult;

    if (!query) {
      translationResult = RuleTranslationResult.UNTRANSLATABLE;
    } else {
      if (query.startsWith('FROM logs-*')) {
        elasticVisualization.query = query.replace('FROM logs-*', 'FROM [indexPattern]');
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
      elastic_visualization: elasticVisualization,
      translation_result: translationResult,
    };
  };
};
