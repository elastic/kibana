/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MigrationComments } from '../../../../../../../../common/siem_migrations/model/common.gen';
import { cleanMarkdown, generateAssistantComment } from '../../../util/comments';
import type { NodeHelperCreator } from '../types';
import { NL_TO_ESQL_INDEX_PATTERN_PROMPT, NL_TO_ESQL_TRANSLATION_PROMPT } from './prompts';
import type { EsqlKnowledgeBase } from '../../../util/esql_knowledge_base';

export interface GetNLToESQLQueryParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}
export interface NLToESQLQueryInput {
  query: string;
  indexPattern?: string;
}

export interface NLToESQLQueryOutput {
  esqlQuery?: string;
  comments: MigrationComments;
}

export const getNLToESQLQuery: NodeHelperCreator<
  GetNLToESQLQueryParams,
  NLToESQLQueryInput,
  NLToESQLQueryOutput
> = ({ esqlKnowledgeBase, logger }) => {
  return async (input) => {
    const mainPrompt = await NL_TO_ESQL_TRANSLATION_PROMPT.format({
      nl_query: input.query,
    });
    const indexPatternPrompt = await NL_TO_ESQL_INDEX_PATTERN_PROMPT.format({
      index_pattern: input.indexPattern,
    });
    const response = await esqlKnowledgeBase.translate(
      input.indexPattern ? `${indexPatternPrompt}\n${mainPrompt}` : mainPrompt
    );

    const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1].trim() ?? '';
    if (!esqlQuery) {
      logger.warn('Failed to extract ESQL query from translation response');
      const comment =
        '## Translation Summary\n\nFailed to extract ESQL query from translation response';
      return {
        comments: [generateAssistantComment(comment)],
      };
    }

    const translationSummary = response.match(/## Translation Summary[\s\S]*$/)?.[0] ?? '';

    return {
      esqlQuery,
      comments: [generateAssistantComment(cleanMarkdown(translationSummary))],
    };
  };
};
