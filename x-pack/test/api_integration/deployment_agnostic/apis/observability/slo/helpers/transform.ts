/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export type TransformHelper = ReturnType<typeof createTransformHelper>;

export function createTransformHelper(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');

  return {
    assertNotFound: async (transformId: string) => {
      const cookieHeader = await samlAuth.getM2MApiCookieCredentialsWithRoleScope('admin');

      return await retry.tryWithRetries(
        `Wait for transform ${transformId} to be deleted`,
        async () => {
          await supertestWithoutAuth
            .get(`/internal/transform/transforms/${transformId}`)
            .set(cookieHeader)
            .set(samlAuth.getInternalRequestHeader())
            .set('elastic-api-version', '1')
            .send()
            .timeout(10000)
            .expect(404);
        },
        { retryCount: 10, retryDelay: 3000 }
      );
    },

    assertExist: async (transformId: string) => {
      return await retry.tryWithRetries(
        `Wait for transform ${transformId} to exist`,
        async () => {
          const cookieHeader = await samlAuth.getM2MApiCookieCredentialsWithRoleScope('admin');

          const response = await supertestWithoutAuth
            .get(`/internal/transform/transforms/${transformId}`)
            .set(cookieHeader)
            .set(samlAuth.getInternalRequestHeader())
            .set('elastic-api-version', '1')
            .send()
            .timeout(10000)
            .expect(200);
          return response.body;
        },
        { retryCount: 10, retryDelay: 3000 }
      );
    },
  };
}
