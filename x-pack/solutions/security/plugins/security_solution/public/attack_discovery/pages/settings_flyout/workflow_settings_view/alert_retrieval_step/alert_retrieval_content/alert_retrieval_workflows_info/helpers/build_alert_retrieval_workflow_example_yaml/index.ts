/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Indentation applied to every line of the embedded ES|QL query so it sits
 * under the `query: |` literal block scalar (which is itself indented 6
 * spaces). YAML strips the common leading indentation, so prefixing every
 * line with the same base indent preserves the query's relative indentation.
 */
const QUERY_BLOCK_INDENT = '        ';

/**
 * Builds a minimal, self-contained custom alert retrieval workflow YAML that a
 * user can copy as a starting point.
 *
 * The workflow has a single `elasticsearch.esql.query` step whose `{ columns,
 * values }` output is the last step's output. Attack Discovery normalizes that
 * output into one CSV-formatted alert per row (see `normalizeLastStepOutput`),
 * so the example runs as-is when pasted and executed in the same space the
 * `esqlQuery` was generated for.
 */
export const buildAlertRetrievalWorkflowExampleYaml = ({
  esqlQuery,
}: {
  esqlQuery: string;
}): string => {
  const indentedQuery = esqlQuery
    .split('\n')
    .map((line) => `${QUERY_BLOCK_INDENT}${line}`)
    .join('\n');

  return `version: '1'
name: My alert retrieval workflow
description: Retrieves alerts for Attack Discovery using ES|QL
enabled: true
triggers:
  - type: manual
steps:
  - name: retrieve_alerts
    type: elasticsearch.esql.query
    with:
      query: |
${indentedQuery}`;
};
