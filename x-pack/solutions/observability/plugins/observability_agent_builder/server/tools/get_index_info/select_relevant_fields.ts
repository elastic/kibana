/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import dedent from 'dedent';

const SYSTEM_PROMPT = `You are a helpful AI assistant for Elastic Observability.
Your task is to select fields that would help investigate the user's query.
Return the field names that are relevant.

Selection guidelines:
1. Select fields directly matching the query (e.g., "service.name" for service queries)
2. Select RELATED fields even if not explicitly mentioned:
   - For memory issues: include container.*, kubernetes.*, system.memory.*, process.memory.*
   - For CPU issues: include system.cpu.*, process.cpu.*, kubernetes.node.*
   - For latency issues: include transaction.duration.*, span.duration.*, @timestamp
   - For errors: include error.*, http.response.status_code, event.outcome, log.level
   - For Kubernetes issues: include kubernetes.*, container.*, host.*
3. Always include identifying fields: service.name, host.name, @timestamp, trace.id when relevant
4. Prefer keyword fields for filtering, numeric for metrics, date for time ranges
5. When in doubt, include the field - it's better to have extra context than miss important data`;

const MAX_CHUNKS = 5;
const MAX_FIELDS_PER_CHUNK = 250;
const MAX_RELEVANT_FIELDS = 100;

interface FieldWithType {
  name: string;
  type: string;
}

/** Formats fields for the LLM prompt */
function formatFieldList(fields: FieldWithType[]): string {
  return fields.map((f) => `${f.name} (${f.type})`).join('\n');
}

/** Calls LLM to select relevant fields from a chunk */
async function selectFieldsFromChunk(
  inferenceClient: BoundInferenceClient,
  userIntentDescription: string,
  fields: FieldWithType[]
): Promise<string[]> {
  const response = await inferenceClient.output({
    id: 'select_relevant_fields',
    system: SYSTEM_PROMPT,
    input: dedent(`User intent: ${userIntentDescription}
      Available fields (name and type):
      ${formatFieldList(fields)}

      Select the field names that are most relevant to this investigation.
    `),
    schema: {
      type: 'object',
      properties: {
        fieldNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of selected field names',
        },
      },
      required: ['fieldNames'],
    },
  });

  // type guard to ensure the response is an array of strings
  return Array.isArray(response.output?.fieldNames)
    ? response.output.fieldNames.filter((v): v is string => typeof v === 'string')
    : [];
}

/** Matches selected field names back to field objects */
function getFieldObjects(
  selectedNames: string[],
  availableFields: FieldWithType[]
): FieldWithType[] {
  const fieldMap = new Map(availableFields.map((f) => [f.name, f]));
  return selectedNames
    .map((name) => fieldMap.get(name))
    .filter((f): f is FieldWithType => f !== undefined);
}

/**
 * Uses an LLM to filter a large list of fields down to those relevant to the user's intent.
 */
export async function selectRelevantFields({
  intent,
  candidateFields,
  inferenceClient,
  logger,
}: {
  intent: string;
  candidateFields: FieldWithType[];
  inferenceClient: BoundInferenceClient;
  logger: Logger;
}): Promise<FieldWithType[]> {
  if (candidateFields.length === 0) {
    return [];
  }

  const chunks = chunk(candidateFields, MAX_FIELDS_PER_CHUNK).slice(0, MAX_CHUNKS);
  const relevantFields: FieldWithType[] = [];

  for (const fieldsChunk of chunks) {
    try {
      const selectedFieldNames = await selectFieldsFromChunk(inferenceClient, intent, fieldsChunk);
      const fields = getFieldObjects(selectedFieldNames, fieldsChunk);
      relevantFields.push(...fields);
    } catch (e) {
      logger.debug(`Chunk selection failed: ${e?.message}`);
      // On failure, include all fields from this chunk to avoid losing data
      relevantFields.push(...fieldsChunk);
    }
  }

  return relevantFields.slice(0, MAX_RELEVANT_FIELDS);
}
