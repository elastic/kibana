/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';

export const translationResultNode: GraphNode = async (state) => {
  const query = state.elastic_rule?.query;

  if (query) {
    /**
     * When rule translation happens without any related integrations found we reuse the logs-* pattern to make validation easier.
     * However we want to replace this with a value to notify the end user that it needs to be replaced.
     */
    if (query.includes(' logs-*')) {
      const newQuery = query.replace('logs-*', '[indexPattern]');
      return {
        elastic_rule: { ...state.elastic_rule, query: newQuery },
        translation_result: RuleTranslationResult.PARTIAL,
      };
    }
    /**
     * When rule translation misses macro or lookup a placeholder is added to the query
     * to notify the user that it needs to be provided/replaced.
     */
    if (query.match(/\[(macro|lookup):/)) {
      return { translation_result: RuleTranslationResult.PARTIAL };
    }
  }

  if (!state.translation_result) {
    return { translation_result: RuleTranslationResult.UNTRANSLATABLE };
  }

  return {};
};
