/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateAssistantComment } from '../../../../../../../common/task/util/comments';
import {
  getValidateEsql,
  type GetValidateEsqlParams,
} from '../../../../../../../common/task/agent/helpers/validate_esql/validation';
import type { GraphNode, TranslateDashboardPanelState } from '../../types';

/**
 * This node runs all validation steps, and will redirect to the END of the graph if no errors are found.
 * Any new validation steps should be added here.
 */
export const getValidationNode = (params: GetValidateEsqlParams): GraphNode => {
  const validateEsql = getValidateEsql(params);
  return async (state): Promise<Partial<TranslateDashboardPanelState>> => {
    if (!state.esql_query) {
      params.logger.warn('Missing query in validation node');
      return {
        validation_errors: { esql_errors: 'Missing query', retries_left: 0 },
        comments: [
          generateAssistantComment(
            '## ESQL Validation Summary\n\nMissing query from translation response. Skipping self-healing loop'
          ),
        ],
      };
    }

    const { error } = await validateEsql({ query: state.esql_query });

    if (error && state.esql_query.match(/\[(macro|lookup):.*?\]/)) {
      // The fix_query_errors tends to remove all the macro and lookup placeholder from the query to make the query valid,
      // we need to keep them so we skip validation unless the missing resources are provided
      return {
        validation_errors: { esql_errors: error, retries_left: 0 },
        comments: [
          generateAssistantComment(
            '## ESQL Validation Summary\n\nFound missing macro or lookup placeholders in query, can not generate a valid query unless they are provided.\nSkipping self-healing loop'
          ),
        ],
      };
    }

    return {
      validation_errors: {
        esql_errors: error,
        retries_left: state.validation_errors.retries_left - 1,
      },
    };
  };
};
