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
  /**
   * Additional translation context, such as source index mappings/sample values,
   * integration documentation, lookup resource metadata, or other migration context.
   */
  knowledgeBase?: string;
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

    /**
     *
     * When an index is not found and `logs-*` is passed then we will have no knowledge base.
     * Bsecause of this instructions sent to LLM will be different.
     *
     */
    const hasIndexContext = input.indexPattern !== 'logs-*';

    const prompt = await ESQL_SYNTAX_TRANSLATION_PROMPT.format({
      splunk_query: JSON.stringify(splunkQuery, null, 2),
      index_pattern: input.indexPattern,
      task_description: input.taskDescription,
      translation_context: input.knowledgeBase ?? '',
      field_mapping_instructions: hasIndexContext
        ? `You MUST map SPL field names to the correct Elasticsearch field names using the provided index mapping and sample values.
Carefully analyze the sample values to understand the semantic meaning of each field and match SPL fields to the most appropriate Elasticsearch fields.
For example, if the SPL query uses a field "app" and the index has a field "okta.actor.display_name" with sample values showing application names, use "okta.actor.display_name" instead of "app".
If translation context contains lookup resource metadata, use it only for LOOKUP JOIN index names, lookup-side field names, and lookup-side field types. Do not treat lookup fields as source index fields.`
        : `No source index mapping or sample values are available for this query. You should still attempt to map SPL field names to their most likely Elastic Common Schema (ECS) equivalents based on your knowledge of ECS field naming conventions.
If translation context contains lookup resource metadata, use it only for LOOKUP JOIN index names, lookup-side field names, and lookup-side field types. Do not treat lookup fields as source index fields.
This is a best-effort mapping that may be corrected in a later step.`,
      field_mapping_steps: hasIndexContext
        ? `- Carefully study the index mapping and sample values to understand what data each field contains.
           - Map each SPL field to the correct Elasticsearch field by matching the semantic meaning, NOT just the field name.
           - Only use fields that exist in the source index mapping for source-side field references. Do NOT invent source field names.
           - Use lookup resource metadata only to choose LOOKUP JOIN index names and lookup-side fields.`
        : `- Go through each part of the SPL query and determine the steps required to produce the same end results using ES|QL.
           - Attempt to map SPL field names to their ECS equivalents based on the field's semantic meaning (e.g., "src_ip" -> "source.ip", "dest_port" -> "destination.port", "user" -> "user.name").
- Use your knowledge of ECS field conventions to make the best source-field mapping possible. This may be refined later.
- Use lookup resource metadata only to choose LOOKUP JOIN index names and lookup-side fields.`,
      field_mapping_guidelines: hasIndexContext
        ? `- You MUST map SPL field names to actual Elasticsearch field names from the index mapping. Do NOT keep the original SPL field names.
- Study the sample values carefully to determine the correct semantic mapping between SPL and Elasticsearch fields.
- If index mapping is provided with sample values, use the values to verify your source-field mapping is correct.
- If lookup resource metadata is provided, use it only for lookup-side fields in LOOKUP JOIN clauses.`
        : `- Attempt to map SPL field names to ECS equivalents using your knowledge of Elastic Common Schema conventions.
- If you are unsure about a mapping, use the most common ECS field that matches the semantic meaning of the SPL field.
- These source-field mappings are best-effort and may be corrected in a subsequent step.
- If lookup resource metadata is provided, use it only for lookup-side fields in LOOKUP JOIN clauses.`,
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
