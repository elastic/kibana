/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EsqlKnowledgeBase } from '../../../../../../../common/task/util/esql_knowledge_base';
import { CORRECT_COLUMNS_FROM_MAPPING_TEMPLATE } from './prompts';
import type { GraphNode } from '../../types';

interface GetCorrectColumnsFromMappingNodeParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}

interface GetCorrectColumnsFromMappingResponse {
  corrected_query: string;
  corrections_made: string[];
}

export const getCorrectColumnsFromMappingNode = ({
  esqlKnowledgeBase,
  logger,
}: GetCorrectColumnsFromMappingNodeParams): GraphNode => {
  return async (state) => {
    const query = state.esql_query;
    const mapping = state.index_mapping;

    if (!query) {
      logger.warn('No ES|QL query available for column correction');
      return {};
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      logger.warn('No index mapping available for column correction');
      return {};
    }

    const mappingString = JSON.stringify(mapping, null, 2);

    const prompt = await CORRECT_COLUMNS_FROM_MAPPING_TEMPLATE.format({
      esql_query: query,
      index_mapping: mappingString,
    });

    const response = await esqlKnowledgeBase.translate(prompt);

    try {
      const outputJsonStr = response.match(/```json\n([\s\S]*?)\n```/)?.[1];
      if (!outputJsonStr) {
        throw new Error('No JSON found in the response');
      }
      const outputJson = JSON.parse(outputJsonStr) as GetCorrectColumnsFromMappingResponse;

      if (!outputJson.corrected_query) {
        logger.warn('No corrected query returned from column correction');
        return {};
      }

      if (outputJson.corrections_made && outputJson.corrections_made.length > 0) {
        logger.debug(`Column corrections made: ${outputJson.corrections_made.join(', ')}`);
      }

      return {
        esql_query: outputJson.corrected_query,
      };
    } catch (e) {
      const message = `Failed to parse JSON when correcting columns from mapping. Error: ${e}`;
      logger.error(message);
      return {};
    }
  };
};
