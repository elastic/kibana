/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { RuleCreationAnnotation } from '../state';
import { getPrebuiltRulesAssets } from '../../utils/get_prebuilt_rules_assets';
import { getCustomRulesTags } from '../../utils/get_custom_rules_tags';
import { TAGS_SELECTION_PROMPT } from './prompts';

const AI_ASSISTED_RULE_CREATION_TAG = 'AI assisted rule creation';

interface GetTagsNodeParams {
  savedObjectsClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
  model: InferenceChatModel;
}

export const getTagsNode = ({ savedObjectsClient, model, rulesClient }: GetTagsNodeParams) => {
  const jsonParser = new JsonOutputParser<{ relevant_tags: string[] }>();

  return async (state: typeof RuleCreationAnnotation.State) => {
    try {
      const tagsSet = new Set<string>();

      const [prebuiltRulesAssetsMap, customTags] = await Promise.all([
        getPrebuiltRulesAssets({ savedObjectsClient, rulesClient }),
        getCustomRulesTags({ rulesClient }),
      ]);

      prebuiltRulesAssetsMap.forEach((ruleVersions) => {
        const targetTags = ruleVersions.target?.tags;
        if (Array.isArray(targetTags)) {
          targetTags.forEach((tag) => tagsSet.add(tag));
        }
      });

      customTags.forEach((tag) => {
        tagsSet.add(tag);
      });

      const availableTags = Array.from(tagsSet);

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

      return {
        ...state,
        rule: {
          ...state.rule,
          tags: [...suggestedTags, AI_ASSISTED_RULE_CREATION_TAG],
        },
      };
    } catch (error) {
      return {
        ...state,
        errors: [`Failed to fetch and process tags: ${error.message}`],
      };
    }
  };
};
