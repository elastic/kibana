/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';
import { isCancelledError } from '@kbn/react-query';
import { parseEsqlQuery, injectMetadataId } from '@kbn/securitysolution-utils';
import type { FormData, ValidationError, ValidationFunc } from '../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import { fetchEsqlQueryColumns } from '../../../logic/esql_query_columns';
import { ESQL_ERROR_CODES } from './error_codes';
import * as i18n from './translations';

interface AbortControllerRef {
  current: AbortController | null;
}

interface EsqlQueryValidatorFactoryParams {
  queryClient: QueryClient;
  abortControllerRef?: AbortControllerRef;
  isUnmountedRef?: { current: boolean };
}

export function esqlQueryValidatorFactory({
  queryClient,
  abortControllerRef,
  isUnmountedRef,
}: EsqlQueryValidatorFactoryParams): ValidationFunc<FormData, string, FieldValueQueryBar> {
  return async (...args) => {
    const [{ value }] = args;
    const esqlQuery = value.query.query as string;

    if (esqlQuery.trim() === '') {
      return;
    }

    try {
      const { errors, isEsqlQueryAggregating } = parseEsqlQuery(esqlQuery);

      if (errors.length) {
        return constructSyntaxError(new Error(errors[0].message));
      }

      if (isEsqlQueryAggregating) {
        return;
      }

      if (isUnmountedRef?.current) return;

      abortControllerRef?.current?.abort();
      const abortController = new AbortController();
      if (abortControllerRef) {
        abortControllerRef.current = abortController;
      }

      let queryToValidate = esqlQuery;
      try {
        queryToValidate = injectMetadataId(esqlQuery);
      } catch {
        // injection failed — validate with original query
      }

      const columns = await fetchEsqlQueryColumns({
        esqlQuery: queryToValidate,
        queryClient,
        signal: abortController.signal,
      });

      const hasIdColumn = columns.some((col) => col.id === '_id');
      if (!hasIdColumn) {
        return constructMissingIdFieldWarning();
      }
    } catch (error) {
      // Ignore errors caused by request cancellation (navigating away or a newer
      // validation superseding this one). These are not user-facing problems.
      if (isCancelledError(error) || error?.name === 'AbortError') {
        return;
      }
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
