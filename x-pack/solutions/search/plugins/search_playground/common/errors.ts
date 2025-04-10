/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) {
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
