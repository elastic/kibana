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
  'Submit the complete executive brief. Call exactly once. Every claim cites evidence ids from the provided evidence.';

const EVIDENCE_DESCRIPTION =
  'Evidence ids that back this claim: at least one F-n or L-n id from the evidence. Never invent ids.';

/**
 * Descriptions added to the JSON schema derived from `briefSchema`, keyed by property path
 * (`[]` stands for array items). They guide the model; the zod schema stays the source of truth.
 */
const FIELD_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'verdict.level':
    'urgent: unaddressed critical threat, act today; action: significant threat needs an owner this week; watch: keep an eye on it; clear: nothing notable',
  'verdict.headline':
    'One sentence, at most 140 characters: the main reason for the level. Do not write the level itself',
  'verdict.summary': 'At most 3 short sentences',
  'verdict.evidence': EVIDENCE_DESCRIPTION,
  areas: 'Exactly one "threats" area and one "response" area',
  'areas[].summary': 'One sentence',
  'areas[].evidence': EVIDENCE_DESCRIPTION,
  threats: 'At most 3 threats, most severe first. Empty when nothing warrants one',
  'threats[].title': 'Short headline (at most 10 words) saying what happened',
  'threats[].entities':
    'ENT ids, primary entity first. They must be connected by the provided links or by facts that name them together',
  'threats[].narrative': 'At most 3 sentences, in time order',
  'threats[].whyItMatters': 'Business impact: criticality, privilege, watchlists',
  'threats[].keyEvents': 'F ids of facts with a time, oldest first',
  'threats[].evidence':
    'F and L ids backing the threat, including the links and facts that connect its entities',
  'threats[].nextStep': 'The single most important next step for this threat',
  actions: 'At most 6 concrete actions, most urgent first',
  'actions[].threat': '1-based number of the threat this action addresses, if any',
  'actions[].targets': 'ENT ids the action is applied to',
  'actions[].evidence': EVIDENCE_DESCRIPTION,
};

type JsonNode = Record<string, unknown>;

const isNode = (value: unknown): value is JsonNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isToolSchema = (value: unknown): value is ToolSchema =>
  isNode(value) && value.type === 'object' && isNode(value.properties);

/** Returns a copy of the JSON schema node with descriptions added from FIELD_DESCRIPTIONS. */
const describe = (node: JsonNode, path: string): JsonNode => {
  const description = path ? FIELD_DESCRIPTIONS[path] : undefined;
  const result: JsonNode = { ...node, ...(description ? { description } : {}) };
  const { properties, items } = node;
  if (isNode(properties)) {
    result.properties = Object.fromEntries(
      Object.entries(properties).map(([key, child]) => [
        key,
        isNode(child) ? describe(child, path ? `${path}.${key}` : key) : child,
      ])
    );
  }
  if (isNode(items)) {
    result.items = describe(items, `${path}[]`);
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
  const described = describe(jsonSchema, '');
  if (!isToolSchema(described)) {
    throw new Error('briefSchema did not convert to an object JSON schema');
  }
  return described;
};

let cachedTool: Required<ToolDefinition<ToolSchema>> | undefined;

/** The forced `submit_brief` tool; its JSON schema is derived from the contract's `briefSchema`. */
export const getSubmitBriefTool = (): Required<ToolDefinition<ToolSchema>> => {
  cachedTool ??= { description: SUBMIT_BRIEF_DESCRIPTION, schema: buildSubmitBriefSchema() };
  return cachedTool;
};
