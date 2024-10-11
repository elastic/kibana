/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { RoleCredentials } from '../../../../services';

export type TransformHelper = ReturnType<typeof createTransformHelper>;

export function createTransformHelper(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  roleAuthc: RoleCredentials
) {
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');

  return {
    assertNotFound: async (transformId: string) => {
      return await retry.tryWithRetries(
        `Wait for transform ${transformId} to be deleted`,
        async () => {
          const response = await supertestWithoutAuth
            .get(`/internal/transform/transforms/${transformId}`)
            .set(roleAuthc.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .set('elastic-api-version', '1')
            .send()
            .timeout(10000)
            .expect(404);

          return response.body;
        },
        { retryCount: 5, retryDelay: 2000 }
      );
    },

    assertExist: async (transformId: string) => {
      return await retry.tryWithRetries(
        `Wait for transform ${transformId} to exist`,
        async () => {
          const response = await supertestWithoutAuth
            .get(`/internal/transform/transforms/${transformId}`)
            .set(roleAuthc.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .set('elastic-api-version', '1')
            .send()
            .timeout(10000)
            .expect(200);
          return response.body;
        },
        { retryCount: 5, retryDelay: 2000 }
      );
    },
  };
}
