/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { FormData, ValidationError, ValidationFunc } from '../../../../shared_imports';
import { KibanaServices } from '../../../../common/lib/kibana';
import type { FieldValueQueryBar } from '../../../rule_creation_ui/components/query_bar_field';
import type { EqlOptions } from '../../../../../common/search_strategy';
import type { EqlResponseError } from '../../../../common/hooks/eql/api';
import { EQL_ERROR_CODES, validateEql } from '../../../../common/hooks/eql/api';
import { EQL_VALIDATION_REQUEST_ERROR } from './translations';

type EqlQueryValidatorFactoryParams =
  | {
      indexPatterns: string[];
      dataViewId?: never;
      eqlOptions: EqlOptions;
    }
  | {
      indexPatterns?: never;
      dataViewId: string;
      eqlOptions: EqlOptions;
    };

export function eqlQueryValidatorFactory({
  indexPatterns,
  dataViewId,
  eqlOptions,
}: EqlQueryValidatorFactoryParams): ValidationFunc<FormData, string, FieldValueQueryBar> {
  return async (...args) => {
    const [{ value }] = args;

    if (isEmpty(value.query.query)) {
      return;
    }

    try {
      const { data } = KibanaServices.get();
      const dataView = isDataViewIdValid(dataViewId)
        ? await data.dataViews.get(dataViewId)
        : undefined;

      const dataViewTitle = dataView?.getIndexPattern() ?? indexPatterns?.join(',') ?? '';
      const runtimeMappings = dataView?.getRuntimeMappings() ?? {};

      const response = await validateEql({
        data,
        query: value.query.query as string,
        dataViewTitle,
        runtimeMappings,
        eqlOptions,
      });

      if (response?.valid === false && response.error) {
        return transformEqlResponseErrorToValidationError(response.error);
      }
    } catch (error) {
      return {
        code: EQL_ERROR_CODES.FAILED_REQUEST,
        message: EQL_VALIDATION_REQUEST_ERROR,
        error,
      };
    }
  };
}

function transformEqlResponseErrorToValidationError(
  responseError: EqlResponseError
): ValidationError<EQL_ERROR_CODES> {
  if (responseError.error) {
    return {
      code: EQL_ERROR_CODES.FAILED_REQUEST,
      message: EQL_VALIDATION_REQUEST_ERROR,
      error: responseError.error,
    };
  }

  return {
    code: responseError.code,
    message: '',
    messages: responseError.messages,
  };
}

function isDataViewIdValid(dataViewId: unknown): dataViewId is string {
  return typeof dataViewId === 'string' && dataViewId !== '';
}
