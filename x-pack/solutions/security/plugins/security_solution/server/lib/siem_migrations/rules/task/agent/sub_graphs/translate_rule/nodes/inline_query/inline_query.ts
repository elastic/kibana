/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StringOutputParser } from '@langchain/core/output_parsers';
import { isEmpty } from 'lodash/fp';
import type { RuleMigrationsRetriever } from '../../../../../retrievers';
import type { ChatModel } from '../../../../../util/actions_client_chat';
import type { GraphNode } from '../../../../types';
import { REPLACE_QUERY_RESOURCE_PROMPT, getResourcesContext } from './prompts';
import { cleanMarkdown, generateAssistantComment } from '../../../../../util/comments';

interface GetInlineQueryNodeParams {
  model: ChatModel;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

export const getInlineQueryNode = ({
  model,
  ruleMigrationsRetriever,
}: GetInlineQueryNodeParams): GraphNode => {
  return async (state) => {
    let query = state.original_rule.query;
    // Check before to avoid unnecessary LLM calls
    let unsupportedComment = getUnsupportedComment(query);
    if (unsupportedComment) {
      return { comments: [generateAssistantComment(unsupportedComment)] };
    }

    const resources = await ruleMigrationsRetriever.resources.getResources(state.original_rule);
    if (!isEmpty(resources)) {
      const replaceQueryParser = new StringOutputParser();
      const replaceQueryResourcePrompt =
        REPLACE_QUERY_RESOURCE_PROMPT.pipe(model).pipe(replaceQueryParser);
      const resourceContext = getResourcesContext(resources);
      const response = await replaceQueryResourcePrompt.invoke({
        query: state.original_rule.query,
        macros: resourceContext.macros,
        lookups: resourceContext.lookups,
      });
      const splQuery = response.match(/```spl\n([\s\S]*?)\n```/)?.[1].trim() ?? '';
      const inliningSummary = response.match(/## Inlining Summary[\s\S]*$/)?.[0] ?? '';
      if (splQuery) {
        query = splQuery;
      }

      // Check after replacing in case the replacements made it untranslatable
      unsupportedComment = getUnsupportedComment(query);
      if (unsupportedComment) {
        return { comments: [generateAssistantComment(unsupportedComment)] };
      }

      return {
        inline_query: query,
        comments: [generateAssistantComment(cleanMarkdown(inliningSummary))],
      };
    }
    return { inline_query: query };
  };
};

const getUnsupportedComment = (query: string): string | undefined => {
  const unsupportedText = '## Translation Summary\nCan not create custom translation.\n';
  if (query.includes(' inputlookup')) {
    return `${unsupportedText}Reason: \`inputlookup\` command is not supported.`;
  }
};
