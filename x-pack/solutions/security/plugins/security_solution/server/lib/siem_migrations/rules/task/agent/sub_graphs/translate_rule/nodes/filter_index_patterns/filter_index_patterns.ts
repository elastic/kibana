/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { RuleTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';

interface GetFilterIndexPatternsNodeParams {
  logger: Logger;
}

/**
 * When rule translation happens without any related integrations found we reuse the logs-* pattern to make validation easier.
 * However we want to replace this with a value to notify the end user that it needs to be replaced.
 */
export const getFilterIndexPatternsNode = ({
  logger,
}: GetFilterIndexPatternsNodeParams): GraphNode => {
  return async (state) => {
    const query = state.elastic_rule?.query;

    if (query && query.includes('logs-*')) {
      logger.debug('Replacing logs-* with a placeholder value');
      const newQuery = query.replace('logs-*', '[indexPattern:logs-*]');
      return {
        elastic_rule: {
          ...state.elastic_rule,
          query: newQuery,
          translation_result: RuleTranslationResult.PARTIAL,
        },
      };
    }

    return {};
  };
};
