/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { lastValueFrom } from 'rxjs';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { RESOLVE_ESQL_ERRORS_TEMPLATE } from '../prompts';
import type { RuleCreationState } from '../../../state';

interface FixEsqlQueryParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  createLlmInstance: () => Promise<InferenceChatModel>;
}

export const fixEsqlQueryNode = async ({
  connectorId,
  inference,
  logger,
  request,
}: FixEsqlQueryParams) => {
  return async (state: RuleCreationState) => {
    if (!state?.validationErrors?.esqlErrors) {
      logger.debug('No errors to fix in ES|QL query');
      return state;
    }

    try {
      const indexPatternsContext = Object.values(state.indices.indexPatternAnalysis).map(
        ({ indexPattern, context }) => `${indexPattern}: ${context}.\n`
      );

      const prompt = await RESOLVE_ESQL_ERRORS_TEMPLATE.format({
        esql_errors: state.validationErrors.esqlErrors,
        esql_query: state.rule.query,
        index_patterns_context: indexPatternsContext.join(' '),
      });

      const { content } = await lastValueFrom(
        naturalLanguageToEsql({
          client: inference.getClient({ request }),
          connectorId,
          logger,
          input: prompt,
        })
      );

      const match = content.match(/```esql\s*([\s\S]*?)```/);
      const esqlQuery = match ? match[1].trim() : undefined;

      return {
        ...state,
        rule: { ...state.rule, query: esqlQuery },
        queryFixRetries: (state.queryFixRetries || 0) + 1,
      };
    } catch (err) {
      logger.debug(`Error fixing ESQL query: ${err}`);
      return { ...state, errors: [...state.errors, `Failed to fix ESQL query: ${err.message}`] };
    }
  };
};
