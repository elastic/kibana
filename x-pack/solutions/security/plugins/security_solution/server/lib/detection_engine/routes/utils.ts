/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';

import type {
  KibanaResponseFactory,
  CustomHttpResponseOptions,
  HttpResponsePayload,
  ResponseError,
} from '@kbn/core/server';

export interface OutputError {
  message: string;
  statusCode: number;
}
export interface BulkError {
  // Id can be single id or stringified ids.
  id?: string;
  // rule_id can be single rule_id or stringified rules ids.
  rule_id?: string;
  error: {
    status_code: number;
    message: string;
  };
}

export const createBulkErrorObject = ({
  ruleId,
  id,
  statusCode,
  message,
}: {
  ruleId?: string;
  id?: string;
  statusCode: number;
  message: string;
}): BulkError => {
  if (id != null && ruleId != null) {
    return {
      id,
      rule_id: ruleId,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else if (id != null) {
    return {
      id,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else if (ruleId != null) {
    return {
      rule_id: ruleId,
      error: {
        status_code: statusCode,
        message,
      },
    };
  } else {
    return {
      rule_id: '(unknown id)',
      error: {
        status_code: statusCode,
        message,
      },
    };
  }
};

export interface ImportRegular {
  rule_id: string;
  status_code: number;
  message?: string;
}

export type ImportRuleResponse = ImportRegular | BulkError;

export const isBulkError = (
  importRuleResponse: ImportRuleResponse
): importRuleResponse is BulkError => {
  return has('error', importRuleResponse);
};

export const isImportRegular = (
  importRuleResponse: ImportRuleResponse
): importRuleResponse is ImportRegular => {
  return !has('error', importRuleResponse) && has('status_code', importRuleResponse);
};

const statusToErrorMessage = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 500:
      return 'Internal Error';
    default:
      return '(unknown error)';
  }
};

export class SiemResponseFactory {
  constructor(private response: KibanaResponseFactory) {}

  error<T extends HttpResponsePayload | ResponseError>({
    statusCode,
    body,
    headers,
  }: CustomHttpResponseOptions<T>) {
    const contentType: CustomHttpResponseOptions<T>['headers'] = {
      'content-type': 'application/json',
    };
    const defaultedHeaders: CustomHttpResponseOptions<T>['headers'] = {
      ...contentType,
      ...(headers ?? {}),
    };

    return this.response.custom({
      headers: defaultedHeaders,
      statusCode,
      body: Buffer.from(
        JSON.stringify({
          message: body ?? statusToErrorMessage(statusCode),
          status_code: statusCode,
        })
      ),
    });
  }
}

export const buildSiemResponse = (response: KibanaResponseFactory) =>
  new SiemResponseFactory(response);
