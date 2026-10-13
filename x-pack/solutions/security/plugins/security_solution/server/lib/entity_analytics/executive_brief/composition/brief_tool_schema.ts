/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ToolDefinition, ToolSchema } from '@kbn/inference-common';
import { briefSchema } from '../../../../../common/entity_analytics/executive_brief/brief';

export const SUBMIT_BRIEF_TOOL_NAME = 'submit_brief' as const;

const SUBMIT_BRIEF_DESCRIPTION =
  'Submit the complete executive brief. Call exactly once. Every claim cites the ids of the facts and links from the provided evidence that back it.';

const FACT_IDS_DESCRIPTION =
  'Ids of the facts (numbers from the "Facts" section) that back this claim. Never invent ids.';

const LINK_IDS_DESCRIPTION =
  'Ids of the links (numbers from the "Links" section) that back this claim. Never invent ids.';

/**
 * Descriptions added to the JSON schema derived from `briefSchema`, keyed by property path
 * (`[]` stands for array items). They guide the model; the zod schema stays the source of truth.
 */
const FIELD_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'verdict.level':
    'urgent: an unaddressed critical threat, act today; action: a significant threat needs an owner this week; watch: worth monitoring, no action needed; clear: nothing notable',
  'verdict.headline':
    'One sentence, at most 140 characters: the main reason for the level. Do not write the level itself',
  'verdict.summary': 'At most 3 short sentences',
  'verdict.factIds': FACT_IDS_DESCRIPTION,
  'verdict.linkIds': LINK_IDS_DESCRIPTION,
  areas: 'Exactly one "threats" area and one "response" area',
  'areas[].summary': 'One sentence, at most 180 characters',
  'areas[].factIds': FACT_IDS_DESCRIPTION,
  'areas[].linkIds': LINK_IDS_DESCRIPTION,
};

/**
 * Size limits the server enforces by trimming (see `normalizeBriefOutput`). They're left out of
 * the schema sent to the model so that an overshoot isn't rejected by the inference plugin's tool
 * validation, which would cost a retry and the call's token usage.
 */
const TRIMMED_KEYWORDS: ReadonlySet<string> = new Set(['maxLength', 'maxItems']);

/** zod's safe-integer bounds mean nothing to the model; normalisation drops non-integers. */
const isSafeIntegerBound = ([key, value]: [string, unknown]): boolean =>
  (key === 'minimum' && value === Number.MIN_SAFE_INTEGER) ||
  (key === 'maximum' && value === Number.MAX_SAFE_INTEGER);

type JsonNode = Record<string, unknown>;

const isNode = (value: unknown): value is JsonNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isToolSchema = (value: unknown): value is ToolSchema =>
  isNode(value) && value.type === 'object' && isNode(value.properties);

/** Copies a schema node, adding descriptions and removing trimmed limits and integer bounds. */
const prepare = (node: JsonNode, path: string): JsonNode => {
  const description = path ? FIELD_DESCRIPTIONS[path] : undefined;
  const result: JsonNode = Object.fromEntries(
    Object.entries(node).filter(
      (entry) => !TRIMMED_KEYWORDS.has(entry[0]) && !isSafeIntegerBound(entry)
    )
  );
  if (description) {
    result.description = description;
  }
  const { properties, items } = node;
  if (isNode(properties)) {
    result.properties = Object.fromEntries(
      Object.entries(properties).map(([key, child]) => [
        key,
        isNode(child) ? prepare(child, path ? `${path}.${key}` : key) : child,
      ])
    );
  }
  if (isNode(items)) {
    result.items = prepare(items, `${path}[]`);
  }
  return result;
};

const buildSubmitBriefSchema = (): ToolSchema => {
  // Drop the meta keys: providers only need the schema itself.
  const jsonSchema = Object.fromEntries(
    Object.entries(z.toJSONSchema(briefSchema)).filter(
      ([key]) => key !== '$schema' && key !== '~standard'
    )
  );
  const prepared = prepare(jsonSchema, '');
  if (!isToolSchema(prepared)) {
    throw new Error('briefSchema did not convert to an object JSON schema');
  }
  return prepared;
};

let cachedTool: Required<ToolDefinition<ToolSchema>> | undefined;

/** The forced `submit_brief` tool; its JSON schema is derived from the contract's `briefSchema`. */
export const getSubmitBriefTool = (): Required<ToolDefinition<ToolSchema>> => {
  cachedTool ??= { description: SUBMIT_BRIEF_DESCRIPTION, schema: buildSubmitBriefSchema() };
  return cachedTool;
};
