/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { RuleCreationAnnotation } from '../state';
import { getPrebuiltRulesTags } from '../../utils/get_prebuilt_rules_tags';
import { getCustomRulesTags } from '../../utils/get_custom_rules_tags';
import { TAGS_SELECTION_PROMPT } from './prompts';

const AI_RULE_CREATION_TAG = 'AI Rule Creation';

interface GetTagsNodeParams {
  savedObjectsClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
  model: InferenceChatModel;
  events?: ToolEventEmitter;
}

export const getTagsNode = ({
  savedObjectsClient,
  model,
  rulesClient,
  events,
}: GetTagsNodeParams) => {
  const jsonParser = new JsonOutputParser<{ relevant_tags: string[] }>();

  return async (state: typeof RuleCreationAnnotation.State) => {
    events?.reportProgress('Fetching available tags and selecting relevant ones...');

    try {
      const [prebuiltTags, customTags] = await Promise.all([
        getPrebuiltRulesTags({ savedObjectsClient }),
        getCustomRulesTags({ rulesClient }),
      ]);

      const tagsSet = new Set<string>([...prebuiltTags, ...customTags]);
      const availableTags = Array.from(tagsSet);

      events?.reportProgress(`Analyzing ${availableTags.length} available tags...`);

      const tagsSelectionChain = TAGS_SELECTION_PROMPT.pipe(model).pipe(jsonParser);

      const tagsSelectionResult = await tagsSelectionChain.invoke({
        user_request: state.userQuery,
        esql_query: state?.rule?.query,
        available_tags: availableTags.join(','),
      });

      const suggestedTags = Array.isArray(tagsSelectionResult.relevant_tags)
        ? tagsSelectionResult.relevant_tags.filter(
            (tag): tag is string => typeof tag === 'string' && availableTags.includes(tag)
          )
        : [];

      events?.reportProgress(`Selected ${suggestedTags.length} relevant tag(s)`);

      return {
        ...state,
        rule: {
          tags: [...suggestedTags, AI_RULE_CREATION_TAG],
        },
      };
    } catch (error) {
      events?.reportProgress(`Failed to fetch and process tags: ${error.message}`);
      return {
        ...state,
        warnings: [`Failed to fetch and process tags: ${error.message}`],
      };
    }
  };
};
