/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, uniq } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { ModelProvider } from '@kbn/onechat-server';
import { ShortIdTable } from '../../utils/short_id_table';

const SELECT_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE = `You are a helpful AI assistant for Elastic Observability. 
Your task is to determine which fields are relevant to the conversation by selecting only the field IDs from the provided list. 
The list in the user message consists of JSON objects that map a human-readable field "name" to its unique "id". 
You must not output any field names — only the corresponding "id" values. Ensure that your output follows the exact JSON format specified.`;

export async function selectRelevantAlertFields({
  query,
  candidateFieldNames,
  modelProvider,
  logger,
}: {
  modelProvider: ModelProvider;
  candidateFieldNames: string[];
  logger: Logger;
  query: string;
}): Promise<string[]> {
  try {
    if (candidateFieldNames.length === 0) {
      return [];
    }

    const { inferenceClient } = await modelProvider.getDefaultModel();

    const MAX_CHUNKS = 5;
    const FIELD_NAMES_PER_CHUNK = 250;
    const MAX_SELECTED = 50;

    const chunksArr = chunk(candidateFieldNames, FIELD_NAMES_PER_CHUNK).slice(0, MAX_CHUNKS);
    const shortIdTable = new ShortIdTable();

    const selectedFieldsAcrossChunks: string[] = [];

    for (const fieldsChunk of chunksArr) {
      try {
        const list = fieldsChunk
          .map((fieldName) => JSON.stringify({ name: fieldName, id: shortIdTable.take(fieldName) }))
          .join('\n');

        const input = `User query: ${query}\n\nBelow is a list of fields. Each entry is a JSON object that contains a \"name\" and an \"id\". Return ONLY the JSON object with selected fieldIds.\n${list}`;

        const schema = {
          type: 'object',
          properties: {
            fieldIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['fieldIds'],
        } as const;

        const response = await inferenceClient.output({
          id: 'select_relevant_alert_fields',
          system: SELECT_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE,
          input,
          schema,
        });

        const fieldIds = Array.isArray(response.output?.fieldIds)
          ? response.output.fieldIds.filter((v): v is string => typeof v === 'string')
          : [];

        const pickedFieldNames = fieldIds
          .map((fieldId) => shortIdTable.lookup(fieldId))
          .filter((name): name is string => typeof name === 'string')
          .filter((name) => fieldsChunk.includes(name));

        selectedFieldsAcrossChunks.push(...pickedFieldNames);
      } catch (e) {
        logger.debug(`Chunk selection failed: ${e?.message}`);
        logger.debug(e);
        continue;
      }

      if (selectedFieldsAcrossChunks.length >= MAX_SELECTED) {
        break;
      }
    }

    return uniq(selectedFieldsAcrossChunks).slice(0, MAX_SELECTED);
  } catch (error) {
    logger.debug(`Failed to select relevant alert fields: ${error?.message}`);
    logger.debug(error);
    return [];
  }
}
