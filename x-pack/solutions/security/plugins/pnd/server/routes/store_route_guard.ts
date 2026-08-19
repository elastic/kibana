/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, IKibanaResponse } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

/**
 * Some mock-only worker, skill, and unconverted watch settings have no live backing. Refuse those
 * operations rather than serving or accepting data that would look durable.
 *
 * Reading a watch is deliberately not gated: `get_watch` still serves the live projection and simply
 * omits `settings`.
 */
export const storeUnavailableResponse = (response: KibanaResponseFactory): IKibanaResponse =>
  response.customError({
    statusCode: 501,
    body: {
      message: i18n.translate('xpack.pnd.watchOperationUnavailableErrorMessage', {
        defaultMessage: 'This watch does not have a durable settings extension yet.',
      }),
    },
  });
