/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CLAUSE_LIMIT_REASON = 'too many nested clauses';

/** Thrown when Elasticsearch rejects a query that has exceptions at the end for too many clauses, so that the message says that the exceptions share the limit with the rule query. */
export class ExceptionsClauseLimitError extends Error {
  constructor(elasticsearchReason: string) {
    super(
      `The rule did not run because Elasticsearch rejected the query for having too many clauses (${elasticsearchReason}). The WHERE expressions of the rule query and the exceptions on columns that rename or copy a source field are counted together. Remove comparisons from the rule query, or remove values or items from those exceptions.`
    );
    this.name = 'ExceptionsClauseLimitError';
  }
}

/** The error of a request that has exceptions at the end of its query, explained when Elasticsearch ran out of clauses. */
export const explainClauseLimit = (error: Error): Error =>
  error?.message?.includes(CLAUSE_LIMIT_REASON)
    ? new ExceptionsClauseLimitError(error.message)
    : error;
