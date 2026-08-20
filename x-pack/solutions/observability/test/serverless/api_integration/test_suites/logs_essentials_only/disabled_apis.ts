/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('disabled APIs', function () {
    let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    it('SLO settings API is not available', async () => {
      await supertestAdminWithCookieCredentials
        .get('/internal/slo/settings')
        .set(svlCommonApi.getInternalRequestHeader())
        .expect(404);
    });

    it('Significant Events API is not available', async () => {
      await supertestAdminWithCookieCredentials
        .get(
          '/api/streams/{name}/significant_events?from=2025-06-17T00:00:00.000Z&to=2025-06-17T00:00:00.000Z&bucketSize=1m'
        )
        .set(svlCommonApi.getInternalRequestHeader())
        .expect(404);
    });
  });
}
