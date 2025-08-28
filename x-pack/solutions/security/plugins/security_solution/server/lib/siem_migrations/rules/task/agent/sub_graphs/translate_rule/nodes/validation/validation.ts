/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getValidateEsql,
  type GetValidateEsqlParams,
} from '../../../../../../../common/task/agent/helpers/validate_esql';
import type { GraphNode } from '../../types';

/**
 * This node runs all validation steps, and will redirect to the END of the graph if no errors are found.
 * Any new validation steps should be added here.
 */
export const getValidationNode = (params: GetValidateEsqlParams): GraphNode => {
  const validateEsql = getValidateEsql(params);
  return async (state) => {
    const iterations = state.validation_errors.iterations + 1;
    if (!state.elastic_rule.query) {
      params.logger.warn('Missing query in validation node');
      return { iterations };
    }

    const { error } = await validateEsql({ query: state.elastic_rule.query });

    return { validation_errors: { iterations, esql_errors: error } };
  };
};
