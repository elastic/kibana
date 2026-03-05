/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';
import {
  parseEsqlQuery,
  computeIsESQLQueryAggregating,
  injectMetadataId,
} from '@kbn/securitysolution-utils';
import type { FormData, ValidationError, ValidationFunc } from '../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import { fetchEsqlQueryColumns } from '../../../logic/esql_query_columns';
import { ESQL_ERROR_CODES } from './error_codes';
import * as i18n from './translations';

interface EsqlQueryValidatorFactoryParams {
  queryClient: QueryClient;
}

export function esqlQueryValidatorFactory({
  queryClient,
}: EsqlQueryValidatorFactoryParams): ValidationFunc<FormData, string, FieldValueQueryBar> {
  return async (...args) => {
    const [{ value }] = args;
    const esqlQuery = value.query.query as string;

    if (esqlQuery.trim() === '') {
      return;
    }

    try {
      const { errors } = parseEsqlQuery(esqlQuery);

      if (errors.length) {
        return constructSyntaxError(new Error(errors[0].message));
      }

      let queryToValidate = esqlQuery;
      try {
        queryToValidate = injectMetadataId(esqlQuery);
      } catch {
        // injection failed — validate with original query
      }

      const columns = await fetchEsqlQueryColumns({ esqlQuery: queryToValidate, queryClient });

      const isAggregating = computeIsESQLQueryAggregating(esqlQuery);
      if (!isAggregating) {
        const hasIdColumn = columns.some((col) => col.id === '_id');
        if (!hasIdColumn) {
          return constructMissingIdFieldWarning();
        }
      }
    } catch (error) {
      return constructValidationError(error);
    }
  };
}

function constructSyntaxError(error: Error): ValidationError {
  return {
    code: ESQL_ERROR_CODES.INVALID_SYNTAX,
    message: error?.message
      ? i18n.esqlValidationErrorMessage(error.message)
      : i18n.ESQL_VALIDATION_UNKNOWN_ERROR,
    error,
  };
}

function constructValidationError(error: Error): ValidationError {
  return {
    code: ESQL_ERROR_CODES.INVALID_ESQL,
    message: error?.message
      ? i18n.esqlValidationErrorMessage(error.message)
      : i18n.ESQL_VALIDATION_UNKNOWN_ERROR,
    error,
  };
}

function constructMissingIdFieldWarning(): ValidationError {
  return {
    code: ESQL_ERROR_CODES.MISSING_ID_FIELD,
    message: i18n.ESQL_MISSING_ID_FIELD_WARNING,
  };
}
