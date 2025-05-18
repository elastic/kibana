/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EsqlKnowledgeBase } from '../../../../../util/esql_knowledge_base';
import type { GraphNode } from '../../types';
import { RESOLVE_ESQL_ERRORS_TEMPLATE } from './prompts';

interface GetFixQueryErrorsNodeParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}

export const getFixQueryErrorsNode = ({
  esqlKnowledgeBase,
  logger,
}: GetFixQueryErrorsNodeParams): GraphNode => {
  return async (state) => {
    const rule = state.elastic_rule;
    const prompt = await RESOLVE_ESQL_ERRORS_TEMPLATE.format({
      esql_errors: state.validation_errors.esql_errors,
      esql_query: rule.query,
    });
    const response = await esqlKnowledgeBase.translate(prompt);

    const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
    rule.query = esqlQuery;
    return { elastic_rule: rule };
  };
};
