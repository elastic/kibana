/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';

/**
 * Produces a prompt that instructs the LLM to strip data-specific details
 * (index patterns, field names, literal values) and return only the
 * Elasticsearch API operation intent.  This refined term is used as the
 * `searchTerm` for the OpenAPI-spec semantic search so that the correct
 * API (e.g. `_search`) ranks higher than superficially similar CRUD APIs.
 */
export const getRefineSearchTermPrompt = ({ nlQuery }: { nlQuery: string }): BaseMessageLike[] => {
  const systemPrompt = `You are a query rewriter for an Elasticsearch API search engine.
Given a user's natural-language request, output a short phrase (≤ 12 words) that describes ONLY the Elasticsearch API operation the user needs.

Rules:
- Remove index names, field names, field values, numeric limits, and time ranges.
- Keep the API verb (search, count, get, create, delete, update, etc.) and any qualifier that distinguishes the API (e.g. "with aggregation", "field mappings", "cluster health").
- If the query involves aggregations, mention the aggregation type (terms, date_histogram, filters, avg, etc.).
- If the query involves searching or querying documents, always include the word "search".
- Output ONLY the refined phrase — no quotes, no explanation.

Examples:
User: search logs-*.otel* for the 3 most recent documents where severity_text is ERROR
Refined: search documents with query filter and sort

User: get the cluster health status
Refined: get cluster health status

User: run a terms aggregation on resource.service.name in logs-*.otel* to find top 10 services, size 0
Refined: search with terms aggregation

User: get a date histogram of document count per 5m interval for logs-*.otel*, size 0
Refined: search with date histogram aggregation

User: count how many documents exist in logs-*.otel*
Refined: count documents in index

User: get the field mappings for traces-*.otel*
Refined: get index field mappings

User: for each resource.service.name in traces-*.otel*, calculate the average span duration, size 0
Refined: search with terms and avg aggregation

User: get the field capabilities for traces-*.otel*
Refined: get field capabilities

User: search logs-*.otel* for documents containing timeout in the body field, limit 3
Refined: search documents with match query`;

  return [
    ['system', systemPrompt],
    ['user', nlQuery],
  ];
};

export const getElasticsearchPrompt = ({
  nlQuery,
  tools,
}: {
  nlQuery: string;
  tools: Array<{ name: string; description: string }>;
}): BaseMessageLike[] => {
  const systemPrompt = `You are an expert Elasticsearch tool caller. Your sole task is to analyze a user's request and call the single most appropriate tool to answer it.
You **must** call **one** of the available tools. Do not answer the user directly or ask clarifying questions.

## Rules
- When a tool has a \`body\` parameter, put query structure, filters, sorting, pagination, and aggregations inside \`body\`. Only use top-level query-string parameters for options that are NOT available in \`body\` (e.g. \`format\`, \`preference\`, \`routing\`).

## Available Tools

${tools.map((tool) => `### ${tool.name} (${tool.description})`).join('\n')}

`;

  const userPrompt = `Execute the following user query: "${nlQuery}"`;

  return [
    ['system', systemPrompt],
    ['user', userPrompt],
  ];
};
