/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, uniq } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { ModelProvider } from '@kbn/onechat-server';

export const SELECT_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE = `You are a helpful assistant for Elastic Observability. 
Your task is to determine which fields are relevant to the conversation by selecting only the field IDs from the provided list. 
The list in the user message consists of JSON objects that map a human-readable field "name" to its unique "id". 
You must not output any field names — only the corresponding "id" values. Ensure that your output follows the exact JSON format specified.`;

class ShortIdTable {
  private readonly nameToId = new Map<string, string>();
  private readonly idToName = new Map<string, string>();
  private counter = 0;

  take(name: string): string {
    const existing = this.nameToId.get(name);
    if (existing) return existing;
    const id = `f${++this.counter}`;
    this.nameToId.set(name, id);
    this.idToName.set(id, name);
    return id;
  }

  lookup(id: string): string | undefined {
    return this.idToName.get(id);
  }
}

export async function selectRelevantAlertFields({
  modelProvider,
  candidateFieldNames,
  logger,
  query,
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

    const selectedAcrossChunks: string[] = [];

    for (const fieldsChunk of chunksArr) {
      const list = fieldsChunk
        .map((fieldName) => JSON.stringify({ name: fieldName, id: shortIdTable.take(fieldName) }))
        .join('\n');

      const input = `User request: ${query}\n\nBelow is a list of fields. Each entry is a JSON object that contains a \"name\" and an \"id\". Return ONLY the JSON object with selected fieldIds.\n${list}`;

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

      const fieldIds = Array.isArray((response as any).output?.fieldIds)
        ? ((response as any).output.fieldIds as unknown[]).filter(
            (v): v is string => typeof v === 'string'
          )
        : [];

      const pickedNames = fieldIds
        .map((id) => shortIdTable.lookup(id))
        .filter((name): name is string => typeof name === 'string')
        .filter((name) => fieldsChunk.includes(name));
      selectedAcrossChunks.push(...pickedNames);

      if (selectedAcrossChunks.length >= MAX_SELECTED) {
        break;
      }
    }

    return uniq(selectedAcrossChunks).slice(0, MAX_SELECTED);
  } catch (error) {
    logger.debug(`Failed to select relevant alert fields: ${error.message}`);
    logger.debug(error);
    return [];
  }
}
