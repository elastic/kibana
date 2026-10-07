/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

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

      return await retry.try(
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
        {
          description: `Wait for transform ${transformId} to be deleted`,
          timeout: 30000,
          retryDelay: 3000,
        }
      );
    },

    assertExist: async (transformId: string) => {
      return await retry.try(
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
        {
          description: `Wait for transform ${transformId} to exist`,
          timeout: 30000,
          retryDelay: 3000,
        }
      );
    },
  };
}
