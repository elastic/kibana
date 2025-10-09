/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MigrationComments } from '../../../../../../../../common/siem_migrations/model/common.gen';
import type { EsqlKnowledgeBase } from '../../../util/esql_knowledge_base';
import { CIM_TO_ECS_MAP } from './cim_ecs_map';
import { ESQL_CONVERT_CIM_TO_ECS_PROMPT } from './prompts';
import { cleanMarkdown, generateAssistantComment } from '../../../util/comments';
import type { NodeHelperCreator } from '../types';

export interface GetConvertEsqlSchemaCisToEcsParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}
export interface ConvertEsqlSchemaCisToEcsInput {
  title: string;
  description: string;
  query: string;
  originalQuery: string;
}
export interface ConvertEsqlSchemaCisToEcsOutput {
  query: string | undefined;
  comments: MigrationComments;
}

export const getConvertEsqlSchemaCisToEcs: NodeHelperCreator<
  GetConvertEsqlSchemaCisToEcsParams,
  ConvertEsqlSchemaCisToEcsInput,
  ConvertEsqlSchemaCisToEcsOutput
> = ({ esqlKnowledgeBase, logger }) => {
  return async (input) => {
    const esqlQuery = {
      title: input.title,
      description: input.description,
      query: input.query,
    };

    const prompt = await ESQL_CONVERT_CIM_TO_ECS_PROMPT.format({
      field_mapping: CIM_TO_ECS_MAP,
      spl_query: input.originalQuery,
      esql_query: JSON.stringify(esqlQuery, null, 2),
    });

    const response = await esqlKnowledgeBase.translate(prompt);

    const updatedQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
    if (!updatedQuery) {
      logger.warn('Failed to apply ECS mapping to the query');
      const summary = '## Field Mapping Summary\n\nFailed to apply ECS mapping to the query';
      return {
        query: undefined, // No updated query if ECS mapping failed
        comments: [generateAssistantComment(summary)],
      };
    }

    const ecsSummary = response.match(/## Field Mapping Summary[\s\S]*$/)?.[0] ?? '';

    // We set success to true to indicate that the ecs mapping has been applied.
    // This is to ensure that the node only runs once
    return {
      comments: [generateAssistantComment(cleanMarkdown(ecsSummary))],
      query: updatedQuery,
    };
  };
};
