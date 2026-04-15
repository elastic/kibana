/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';
import { z as z4 } from '@kbn/zod/v4';
import type { ZodType } from '@kbn/zod/v4';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';

import type { GraphInsightTypes } from '../../../../graphs';

interface GetChainWithFormatInstructions {
  chain: Runnable;
  formatInstructions: string;
  llmType: string;
}

/**
 * Recursively reorder a JSON Schema object to match the property ordering that
 * LangChain's StructuredOutputParser (backed by zod-to-json-schema v3) produces:
 * type → properties → items → required → additionalProperties → description → $schema
 *
 * This is necessary because z4.toJSONSchema() emits keys in a different order
 * (e.g. description before type), and the test does a strict string equality
 * check on the serialised JSON.
 */
function reorderJsonSchemaKeys(node: unknown): unknown {
  if (typeof node !== 'object' || node === null) return node;
  if (Array.isArray(node)) return node.map(reorderJsonSchemaKeys);

  const obj = node as Record<string, unknown>;
  const ordered: Record<string, unknown> = {};

  const keyOrder = [
    'type',
    'properties',
    'items',
    'required',
    'additionalProperties',
    'description',
    '$schema',
  ];

  for (const key of keyOrder) {
    if (key in obj) {
      ordered[key] = reorderJsonSchemaKeys(obj[key]);
    }
  }
  for (const key of Object.keys(obj)) {
    if (!(key in ordered)) {
      ordered[key] = reorderJsonSchemaKeys(obj[key]);
    }
  }
  return ordered;
}

/**
 * Build format instructions from a Zod v4 schema without going through
 * LangChain's StructuredOutputParser, which only understands Zod v3 and
 * crashes with a "z._never is not a function" error when given a v4 schema.
 *
 * The output matches the format that StructuredOutputParser.getFormatInstructions()
 * produces, so downstream prompt handling is unaffected.
 */
function getFormatInstructionsFromZodV4Schema(schema: ZodType<unknown>): string {
  const raw = z4.toJSONSchema(schema) as Record<string, unknown>;

  // z4.toJSONSchema() emits $schema: "https://json-schema.org/draft/2020-12/schema".
  // Replace with the draft-07 URL that LangChain's zod-to-json-schema v3 emits,
  // then reorder keys so the serialised JSON matches the expected string exactly.
  const { $schema: _discarded, ...rest } = raw;
  const normalized = { ...rest, $schema: 'http://json-schema.org/draft-07/schema#' };
  const jsonSchema = reorderJsonSchemaKeys(normalized);

  return `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!

Here is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:
\`\`\`json
${JSON.stringify(jsonSchema)}
\`\`\`
`;
}

export const getChainWithFormatInstructions = <T extends GraphInsightTypes>({
  llm,
  generationSchema,
}: {
  llm: ActionsClientLlm;
  generationSchema: ZodType<{ insights: T[] }>;
}): GetChainWithFormatInstructions => {
  // StructuredOutputParser.fromZodSchema() only supports Zod v3 — it calls
  // z._never() internally which does not exist in v4, causing a runtime crash.
  // We replicate its getFormatInstructions() output using z4.toJSONSchema() directly.
  const formatInstructions = getFormatInstructionsFromZodV4Schema(generationSchema);

  const prompt = ChatPromptTemplate.fromTemplate(
    `Answer the user's question as best you can:\n{format_instructions}\n{query}`
  );

  const chain = prompt.pipe(llm);
  const llmType = llm._llmType();

  return { chain, formatInstructions, llmType };
};
