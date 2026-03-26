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
  const systemPrompt = `You are an expert Elasticsearch tool caller. 
You are given a set of tools derived from Elasticsearch OpenAPI specifications.
Your sole task is to analyze the user's request and call the most appropriate tool(s) to fulfill it.
Do not answer directly or ask clarifying questions.

## Tool Selection

- **Counting documents**: Prefer \`_count\` (GET) over \`_search\` when only a count is needed — it is faster and avoids confirmation prompts.
- **Aggregations on documents**: Always use \`_search\` with an \`aggs\` body. All aggregation types (terms, date_histogram, filters, avg, etc.) are performed via \`_search\` — never use specialized API endpoints such as \`/_ml/filters/\` for document aggregations.
- **Counting across multiple index patterns**: Call \`_count\` once per pattern or use \`_msearch\` — do not use a generic search tool.
- **Field discovery**: Use \`_mapping\` or \`_field_caps\` to discover available fields — do not use \`_search\` for this purpose.
- **Cluster / node information**: Use the specialized cluster or node APIs (\`/_cluster/health\`, \`/_cluster/stats\`, \`/_nodes/stats\`) instead of generic search APIs.

## Request Construction

- **Body vs. query-string parameters**: When a tool exposes a \`body\` parameter, place all query structure, filters, sorting, pagination, and aggregations inside \`body\`. Reserve top-level query-string parameters only for options unavailable in the body (e.g. \`format\`, \`preference\`, \`routing\`).
- **Aggregation-only queries**: Set \`"size": 0\` in the body when only aggregation results are needed (no document hits).
- **Document searches**: Always set an explicit \`size\` (e.g. \`"size": 10\`) to avoid over-fetching. Use \`_source\` to limit returned fields when only specific fields are needed.
- **Index creation with settings**: Use \`PUT /{index}\` with a \`settings\` body — do not create a document to auto-create the index.
`;

  const userPrompt = `Execute the following user query: "${nlQuery}"`;

  return [
    ['system', systemPrompt],
    ['user', userPrompt],
  ];
};
