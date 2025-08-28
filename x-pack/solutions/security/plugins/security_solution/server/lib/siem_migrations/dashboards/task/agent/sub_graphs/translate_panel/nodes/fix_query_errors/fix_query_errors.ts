/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFixEsqlQueryErrors,
  type GetFixEsqlQueryErrorsParams,
} from '../../../../../../../common/task/agent/helpers/fix_esql_query_errors';
import type { GraphNode } from '../../types';

export const getFixQueryErrorsNode = (params: GetFixEsqlQueryErrorsParams): GraphNode => {
  const fixEsqlQueryErrors = getFixEsqlQueryErrors(params);
  return async (state) => {
    const { query } = await fixEsqlQueryErrors({
      invalidQuery: state.esql_query,
      validationErrors: state.validation_errors.esql_errors,
    });
    if (!query) {
      return {};
    }
    return { esql_query: query };
  };
};
