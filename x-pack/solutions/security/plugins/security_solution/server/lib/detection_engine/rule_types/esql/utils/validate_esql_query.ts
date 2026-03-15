/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { IRuleExecutionLogForExecutors } from '../../../rule_monitoring';

/**
 * Validates the transformed ES|QL query using the AST-based validator.
 * This is a purely syntactic check — no network call is made.
 *
 * Returns `true` when the query has no errors, `false` otherwise.
 */
export const validateEsqlQuery = async ({
  query,
  ruleExecutionLogger,
}: {
  query: string;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
}): Promise<boolean> => {
  try {
    const { errors } = await validateQuery(query);

    if (errors.length > 0) {
      const messages = errors.map((e) => ('text' in e ? e.text : e.message)).join('; ');
      ruleExecutionLogger.warn(
        `AST validation failed for transformed ES|QL query. Errors: ${messages}`
      );
      return false;
    }

    return true;
  } catch (error) {
    ruleExecutionLogger.warn(
      `AST validation threw for transformed ES|QL query. Error: ${error?.message}`
    );
    return false;
  }
};
