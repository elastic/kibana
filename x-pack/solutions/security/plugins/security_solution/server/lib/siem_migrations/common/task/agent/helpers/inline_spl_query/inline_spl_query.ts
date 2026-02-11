/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { MigrateRuleGraphParams } from '../../../../../rules/task/agent/types';
import type { MigrationComments } from '../../../../../../../../common/siem_migrations/model/common.gen';
import { cleanMarkdown, generateAssistantComment } from '../../../util/comments';
import type { MigrationResources } from '../../../retrievers/resource_retriever';
import type { NodeHelperCreator } from '../types';
import { REPLACE_QUERY_RESOURCE_PROMPT, getResourcesContext } from './prompts';

export interface GetInlineSplQueryParams {
  model: MigrateRuleGraphParams['model'];
  logger: Logger;
}
export interface InlineSplQueryInput {
  query: string;
  resources: MigrationResources;
}
export interface InlineSplQueryOutput {
  inlineQuery?: string | undefined;
  isUnsupported?: boolean;
  comments: MigrationComments;
}

export const getInlineSplQuery: NodeHelperCreator<
  GetInlineSplQueryParams,
  InlineSplQueryInput,
  InlineSplQueryOutput
> = ({ model, logger }) => {
  return async ({ query, resources }) => {
    // Early check to avoid unnecessary LLM calls
    let unsupportedComment = getUnsupportedComment(query);
    if (unsupportedComment) {
      return {
        isUnsupported: true,
        comments: [generateAssistantComment(unsupportedComment)],
      };
    }

    const replaceQueryParser = new StringOutputParser();
    const replaceQueryResourcePrompt =
      REPLACE_QUERY_RESOURCE_PROMPT.pipe(model).pipe(replaceQueryParser);
    const resourceContext = getResourcesContext(resources);
    const response = await replaceQueryResourcePrompt.invoke({
      query,
      macros: resourceContext.macros,
      lookups: resourceContext.lookups,
    });

    const inlineQuery = response.match(/```spl\n([\s\S]*?)\n```/)?.[1].trim() ?? '';
    if (!inlineQuery) {
      logger.warn('Failed to retrieve inline query');
      const summary = '## Inlining Summary\n\nFailed to retrieve inline query';
      return { comments: [generateAssistantComment(summary)] };
    }

    // Check after replacing in case the inlining made it untranslatable
    unsupportedComment = getUnsupportedComment(inlineQuery);
    if (unsupportedComment) {
      return {
        isUnsupported: true,
        comments: [generateAssistantComment(unsupportedComment)],
      };
    }

    const inliningSummary = response.match(/## Inlining Summary[\s\S]*$/)?.[0] ?? '';
    return {
      inlineQuery,
      comments: [generateAssistantComment(cleanMarkdown(inliningSummary))],
    };
  };
};

const getUnsupportedComment = (query: string): string | undefined => {
  const unsupportedText = '## Translation Summary\nCan not create query translation.\n';
  if (query.includes(' inputlookup')) {
    return `${unsupportedText}Reason: \`inputlookup\` command is not supported.`;
  }
};
