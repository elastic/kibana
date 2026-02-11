/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MigrationComments } from '../../../../../../../../common/siem_migrations/model/common.gen';
import { cleanMarkdown, generateAssistantComment } from '../../../util/comments';
import type { EsqlKnowledgeBase } from '../../../util/esql_knowledge_base';
import { ESQL_SYNTAX_TRANSLATION_PROMPT } from './prompts';
import type { NodeHelperCreator } from '../types';

export interface GetTranslateSplToEsqlParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}

export interface TranslateSplToEsqlInput {
  title: string;
  taskDescription: string;
  description: string;
  inlineQuery: string;
  indexPattern: string;
  indexMapping?: Record<string, object>;
}
export interface TranslateSplToEsqlOutput {
  esqlQuery?: string;
  comments: MigrationComments;
}

export const getTranslateSplToEsql: NodeHelperCreator<
  GetTranslateSplToEsqlParams,
  TranslateSplToEsqlInput,
  TranslateSplToEsqlOutput
> = ({ esqlKnowledgeBase, logger }) => {
  return async (input) => {
    const splunkQuery = {
      title: input.title,
      description: input.description,
      inline_query: input.inlineQuery,
    };

    const prompt = await ESQL_SYNTAX_TRANSLATION_PROMPT.format({
      splunk_query: JSON.stringify(splunkQuery, null, 2),
      index_pattern: input.indexPattern,
      task_description: input.taskDescription,
      index_mapping: input.indexMapping,
    });
    const response = await esqlKnowledgeBase.translate(prompt);

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
