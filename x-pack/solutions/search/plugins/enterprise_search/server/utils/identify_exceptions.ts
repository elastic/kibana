/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchErrorDetails, isResponseError } from '@kbn/es-errors';
import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../common/types/error_codes';

export interface ElasticsearchResponseError {
  meta?: {
    body?: {
      error?: {
        caused_by?: {
          reason?: string;
          type?: string;
        };
        type: string;
      };
    };
    statusCode?: number;
  };
  name: 'ResponseError';
}

const MISSING_ALIAS_ERROR = new RegExp(/^alias \[.+\] missing/);

export const isIndexNotFoundException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'index_not_found_exception';

export const isResourceAlreadyExistsException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'resource_already_exists_exception';

export const isResourceNotFoundException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'resource_not_found_exception';

export const isUnauthorizedException = (error: ElasticsearchResponseError) =>
  error.meta?.statusCode === 403;

export const isPipelineIsInUseException = (error: Error) =>
  error.message === ErrorCode.PIPELINE_IS_IN_USE;

export const isNotFoundException = (error: ElasticsearchResponseError) =>
  error.meta?.statusCode === 404;

export const isIllegalArgumentException = (error: ElasticsearchResponseError) =>
  error.meta?.body?.error?.type === 'illegal_argument_exception';

export const isVersionConflictEngineException = (error: ElasticsearchResponseError) =>
  error.meta?.body?.error?.type === 'version_conflict_engine_exception';

export const isInvalidSearchApplicationNameException = (error: ElasticsearchResponseError) =>
  error.meta?.body?.error?.type === 'invalid_alias_name_exception';

export const isMissingAliasException = (error: ElasticsearchResponseError) =>
  error.meta?.statusCode === 404 &&
  typeof error.meta?.body?.error === 'string' &&
  MISSING_ALIAS_ERROR.test(error.meta?.body?.error);

export const isAccessControlDisabledException = (error: Error) => {
  return error.message === ErrorCode.ACCESS_CONTROL_DISABLED;
};

export const isExpensiveQueriesNotAllowedException = (error: ElasticsearchResponseError) => {
  return (
    error.meta?.statusCode === 400 &&
    error.meta?.body?.error?.caused_by?.reason?.includes('search.allow_expensive_queries')
  );
};

export function getErrorMessage(payload?: unknown): string {
  if (!payload) {
    throw new Error('expected error message to be provided');
  }
  if (typeof payload === 'string') return payload;
  // Elasticsearch response errors contain nested error messages
  if (isResponseError(payload)) {
    return `[${payload.message}]: ${
      (payload.meta.body as ElasticsearchErrorDetails)?.error?.reason
    }`;
  }

  if ((payload as { message: unknown }).message) {
    return getErrorMessage((payload as { message: unknown }).message);
  }
  try {
    return JSON.stringify(payload);
  } catch (error) {
    // If all else fails, we return a generic error
    return i18n.translate('xpack.enterpriseSearch.server.errorIdentifyingException', {
      defaultMessage: 'Internal server error: could not parse error message',
    });
  }
}
