/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EsqlKnowledgeBase } from '../../../../../util/esql_knowledge_base';
import type { GraphNode } from '../../types';
import { SIEM_RULE_MIGRATION_CIM_ECS_MAP } from './cim_ecs_map';
import { ESQL_TRANSLATE_ECS_MAPPING_PROMPT } from './prompts';
import { cleanMarkdown, generateAssistantComment } from '../../../../../util/comments';

interface GetEcsMappingNodeParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}

export const getEcsMappingNode = ({
  esqlKnowledgeBase,
  logger,
}: GetEcsMappingNodeParams): GraphNode => {
  return async (state) => {
    const elasticRule = {
      title: state.elastic_rule.title,
      description: state.elastic_rule.description,
      query: state.elastic_rule.query,
    };

    const prompt = await ESQL_TRANSLATE_ECS_MAPPING_PROMPT.format({
      field_mapping: SIEM_RULE_MIGRATION_CIM_ECS_MAP,
      splunk_query: state.inline_query,
      elastic_rule: JSON.stringify(elasticRule, null, 2),
    });

    const response = await esqlKnowledgeBase.translate(prompt);

    const updatedQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
    const ecsSummary = response.match(/## Field Mapping Summary[\s\S]*$/)?.[0] ?? '';

    // We set includes_ecs_mapping to true to indicate that the ecs mapping has been applied.
    // This is to ensure that the node only runs once
    return {
      response,
      comments: [generateAssistantComment(cleanMarkdown(ecsSummary))],
      includes_ecs_mapping: true,
      elastic_rule: {
        ...state.elastic_rule,
        query: updatedQuery,
      },
    };
  };
};
