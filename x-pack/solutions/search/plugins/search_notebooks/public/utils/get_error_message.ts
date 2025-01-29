/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';

export function getErrorMessage(error: unknown, defaultMessage?: string): string {
  if (typeof error === 'string') {
    return error;
  }
  if (isKibanaServerError(error)) {
    return error.body.message;
  }

  if (typeof error === 'object' && (error as { name: string }).name) {
    return (error as { name: string }).name;
  }

  return defaultMessage ?? '';
}

export function getErrorCode(error: unknown): number | undefined {
  if (isKibanaServerError(error)) {
    return error.body.statusCode;
  }
  return undefined;
}

export function isKibanaServerError(
  input: unknown
): input is Error & { body: KibanaServerError; name: string; skipToast?: boolean } {
  if (
    typeof input === 'object' &&
    (input as { body: KibanaServerError }).body &&
    typeof (input as { body: KibanaServerError }).body.message === 'string'
  ) {
    return true;
  }
  return false;
}
