/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

type HttpError = Error & { body?: Record<string, unknown> };
function isHttpError(error: Error | unknown): error is HttpError {
  if (error instanceof Error) {
    if ('request' in error && 'name' in error) {
      if ('body' in error && (typeof error.body !== 'object' || error.body === null)) {
        return false; // Ensure body is an object
      }
      return true;
    }
  }
  return false;
}

function HttpErrorHasBodyMessage(
  error: HttpError
): error is HttpError & { body: { message: string } } {
  if (!error.body) return false;
  if ('message' in error.body && typeof error.body.message === 'string') {
    return true;
  }
  return false;
}

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (isHttpError(e) && HttpErrorHasBodyMessage(e)) {
      return e.body.message;
    }
    if (e.cause instanceof Error) {
      return i18n.translate('xpack.searchPlayground.errorWithCauseMessage', {
        defaultMessage: '{message}. Caused by: {causeMessage}',
        values: {
          message: e.message,
          causeMessage: e.cause.message,
        },
      });
    }
    return e.message;
  } else if (typeof e === 'string') {
    return e;
  } else if (typeof e === 'object' && e !== null && 'message' in e) {
    return (e as { message: string }).message;
  } else if (typeof e === 'object' && e !== null && 'toString' in e) {
    return (e as { toString: () => string }).toString();
  } else {
    return String(e);
  }
}
