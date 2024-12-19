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
    if (!isSupported(query)) {
      return {};
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
      const splQuery = response.match(/```spl\n([\s\S]*?)\n```/)?.[1] ?? '';
      if (splQuery) {
        query = splQuery;
      }

      // Check after replacing in case the replacements made it untranslatable
      if (!isSupported(query)) {
        return {};
      }
    }
    return { inline_query: query };
  };
};

const isSupported = (query: string) => {
  if (query.includes(' inputlookup ')) {
    return false;
  }
  return true;
};
