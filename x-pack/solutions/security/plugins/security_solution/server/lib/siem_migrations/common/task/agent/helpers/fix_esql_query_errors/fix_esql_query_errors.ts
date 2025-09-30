/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { NodeHelperCreator } from '../types';
import type { EsqlKnowledgeBase } from '../../../util/esql_knowledge_base';
import { RESOLVE_ESQL_ERRORS_TEMPLATE } from './prompts';

export interface GetFixEsqlQueryErrorsParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}
export interface FixEsqlQueryErrorsInput {
  invalidQuery?: string;
  validationErrors?: string;
}
export interface FixEsqlQueryErrorsOutput {
  query?: string;
}

export const getFixEsqlQueryErrors: NodeHelperCreator<
  GetFixEsqlQueryErrorsParams,
  FixEsqlQueryErrorsInput,
  FixEsqlQueryErrorsOutput
> = ({ esqlKnowledgeBase, logger }) => {
  return async (input) => {
    if (!input.validationErrors) {
      logger.debug('Trying to fix errors without validationErrors');
      return {};
    }
    if (!input.invalidQuery) {
      logger.debug('Trying to fix errors without invalidQuery');
      return {};
    }

    const prompt = await RESOLVE_ESQL_ERRORS_TEMPLATE.format({
      esql_errors: input.validationErrors,
      esql_query: input.invalidQuery,
    });
    const response = await esqlKnowledgeBase.translate(prompt);

    const query = response.match(/```esql\n([\s\S]*?)\n```/)?.[1];
    return { query };
  };
};
