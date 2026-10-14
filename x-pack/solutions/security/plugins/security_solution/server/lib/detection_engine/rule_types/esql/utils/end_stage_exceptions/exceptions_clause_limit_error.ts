/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CLAUSE_LIMIT_REASON = 'too many nested clauses';

/**
 * Thrown when Elasticsearch rejects a query that has exceptions at the end because it has too many clauses.
 * Elasticsearch counts the conditions of the rule query together with the comparisons of the exceptions on columns that
 * rename or copy a source field, so the user needs to know that the exceptions are part of the reason.
 */
export class ExceptionsClauseLimitError extends Error {
  constructor(elasticsearchReason: string) {
    super(
      `The rule did not run because Elasticsearch rejected the query for having too many clauses (${elasticsearchReason}). The conditions of the rule query and the exceptions on columns that rename or copy a source field are counted together. Remove conditions from the rule query, or remove values or items from those exceptions.`
    );
    this.name = 'ExceptionsClauseLimitError';
  }
}

/** The error of a request that has exceptions at the end of its query, explained when Elasticsearch ran out of clauses. */
export const explainClauseLimit = (error: Error): Error =>
  error?.message?.includes(CLAUSE_LIMIT_REASON)
    ? new ExceptionsClauseLimitError(error.message)
    : error;
