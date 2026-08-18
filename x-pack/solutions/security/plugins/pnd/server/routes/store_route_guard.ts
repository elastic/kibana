/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, IKibanaResponse } from '@kbn/core/server';

/**
 * The worker and skill catalogs, and every write, exist only in the in-memory store. There is no
 * live backing for them yet — settings will eventually be applied to the managed workflow
 * definition — so refuse the request rather than serving or accepting data that would look real.
 *
 * Reading a watch is deliberately not gated: `get_watch` still serves the live projection and simply
 * omits `settings`.
 */
export const storeUnavailableResponse = (response: KibanaResponseFactory): IKibanaResponse =>
  response.customError({
    statusCode: 501,
    body: {
      message:
        'This endpoint is backed by the in-memory watch store and requires xpack.pnd.ui.useMockData — no live backing exists yet.',
    },
  });
