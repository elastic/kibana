/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateAssistantComment } from '../../../../../../../common/task/util/comments';
import { getValidateEsql } from '../../../../../../../common/task/agent/helpers/validate_esql/validation';
import type {
  GraphNode,
  TranslatePanelGraphParams,
  TranslateDashboardPanelState,
} from '../../types';

export const getValidationNode = (params: TranslatePanelGraphParams): GraphNode => {
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

    const { error: syntaxError } = await validateEsql({ query: state.esql_query });

    if (state.esql_query.match(/\[(macro|lookup):.*?\]/)) {
      return {
        validation_errors: {
          esql_errors: syntaxError,
          retries_left: 0,
        },
        comments: [
          generateAssistantComment(
            '## ESQL Validation Summary\n\nFound missing macro or lookup placeholders in query, can not generate a valid query unless they are provided.\nSkipping syntax and execution checks'
          ),
        ],
      };
    }

    if (syntaxError) {
      return {
        validation_errors: {
          esql_errors: syntaxError,
          retries_left: state.validation_errors.retries_left - 1,
        },
      };
    }

    const executionError = await executeEsqlQuery(state.esql_query, params);
    const combinedError = executionError || undefined;

    return {
      validation_errors: {
        esql_errors: combinedError,
        retries_left: combinedError
          ? state.validation_errors.retries_left - 1
          : state.validation_errors.retries_left,
      },
    };
  };
};

const executeEsqlQuery = async (
  query: string,
  params: TranslatePanelGraphParams
): Promise<string | undefined> => {
  try {
    await params.esScopedClient.asInternalUser.esql.query({
      query,
      format: 'json',
    });
    return undefined;
  } catch (error) {
    const reason =
      error?.meta?.body?.error?.caused_by?.reason ??
      error?.meta?.body?.error?.reason ??
      error?.message ??
      'Unknown execution error';
    params.logger.debug(`ES|QL execution error: ${reason}`);
    return `ES|QL execution error: ${reason}`;
  }
};
