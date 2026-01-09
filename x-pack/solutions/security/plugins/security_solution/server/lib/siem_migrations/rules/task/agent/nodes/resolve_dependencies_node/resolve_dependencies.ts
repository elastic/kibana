/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanMarkdown, generateAssistantComment } from '../../../../../common/task/util/comments';
import type { GraphNode, ModelWithTools } from '../../types';
import { QRADAR_DEPENDENCIES_RESOLVE_PROMPT } from './prompts';

interface GetCreateResolveDepsNodeParams {
  model: ModelWithTools;
}

export const getResolveDepsNode = ({ model }: GetCreateResolveDepsNodeParams): GraphNode => {
  return async (state) => {
    const modelWithTools = model;
    const query = state.original_rule.query;

    const resolveMessage = await QRADAR_DEPENDENCIES_RESOLVE_PROMPT.formatMessages({
      title: state.original_rule.title,
      description: state.original_rule.description,
      query,
      resources: {
        lookups: state.resources.lookup,
      },
    });

    const response = await modelWithTools.invoke([...resolveMessage, ...(state.messages ?? [])]);

    const hasToolCall =
      'tool_calls' in response && response?.tool_calls && response?.tool_calls?.length > 0;

    if (hasToolCall) {
      // we don't generate comments for tool calls but only the final response
      return { messages: [response], comments: [] };
    }
    const comments = [generateAssistantComment(cleanMarkdown(response.text))];

    return { messages: [response], nl_query: response.text, comments };
  };
};
