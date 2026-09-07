/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';

/**
 * Gate for handlers that touch the plugin-owned threat intel indices.
 *
 * Bootstrap (index templates, mapping migrations, catalog seeding) runs
 * detached at plugin start so it cannot block Kibana startup. Routes are
 * registered during setup, so without this gate a request arriving in that
 * window can auto-create an index before its template applies, leaving it
 * permanently mis-mapped with `dynamic: strict` rejecting later writes.
 *
 * Returns a 503 response when bootstrap failed, or `undefined` when the caller
 * may proceed.
 */
export const rejectUntilBootstrapped = async (
  getBootstrapReady: () => Promise<void>,
  response: KibanaResponseFactory
): Promise<IKibanaResponse | undefined> => {
  try {
    await getBootstrapReady();
    return undefined;
  } catch (err) {
    return response.customError({
      statusCode: 503,
      body: {
        message:
          `Threat intelligence setup has not completed, so its indices may be missing or ` +
          `mis-mapped: ${(err as Error).message}`,
      },
    });
  }
};
