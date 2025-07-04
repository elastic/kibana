/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { isEmpty } from 'lodash/fp';
import type { ChatModel } from '../../../../../util/actions_client_chat';
import type { GraphNode } from '../../../../types';
import { REPLACE_QUERY_RESOURCE_PROMPT, getResourcesContext } from './prompts';
import { cleanMarkdown, generateAssistantComment } from '../../../../../util/comments';

interface GetInlineQueryNodeParams {
  model: ChatModel;
  logger: Logger;
}

export const getInlineQueryNode = ({ model, logger }: GetInlineQueryNodeParams): GraphNode => {
  return async (state) => {
    const query = state.original_rule.query;
    // Check before to avoid unnecessary LLM calls
    let unsupportedComment = getUnsupportedComment(query);
    if (unsupportedComment) {
      return {
        inline_query: undefined, // No inline query if unsupported to jump to the end of the graph
        comments: [generateAssistantComment(unsupportedComment)],
      };
    }

    if (isEmpty(state.resources)) {
      // No resources identified in the query, no need to replace
      return { inline_query: query };
    }

    const replaceQueryParser = new StringOutputParser();
    const replaceQueryResourcePrompt =
      REPLACE_QUERY_RESOURCE_PROMPT.pipe(model).pipe(replaceQueryParser);
    const resourceContext = getResourcesContext(state.resources);
    const response = await replaceQueryResourcePrompt.invoke({
      query: state.original_rule.query,
      macros: resourceContext.macros,
      lookups: resourceContext.lookups,
    });
    const inlineQuery = response.match(/```spl\n([\s\S]*?)\n```/)?.[1].trim() ?? '';
    if (!inlineQuery) {
      logger.warn('Failed to retrieve inline query');
      const summary = '## Inlining Summary\n\nFailed to retrieve inline query';
      return {
        inline_query: query,
        comments: [generateAssistantComment(summary)],
      };
    }

    // Check after replacing in case the replacements made it untranslatable
    unsupportedComment = getUnsupportedComment(inlineQuery);
    if (unsupportedComment) {
      return {
        inline_query: undefined, // No inline query if unsupported to jump to the end of the graph
        comments: [generateAssistantComment(unsupportedComment)],
      };
    }

    const inliningSummary = response.match(/## Inlining Summary[\s\S]*$/)?.[0] ?? '';
    return {
      inline_query: inlineQuery,
      comments: [generateAssistantComment(cleanMarkdown(inliningSummary))],
    };
  };
};

const getUnsupportedComment = (query: string): string | undefined => {
  const unsupportedText = '## Translation Summary\nCan not create custom translation.\n';
  if (query.includes(' inputlookup')) {
    return `${unsupportedText}Reason: \`inputlookup\` command is not supported.`;
  }
};
