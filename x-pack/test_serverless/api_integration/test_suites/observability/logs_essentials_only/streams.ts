/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('Streams', function () {
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

    describe('when Kibana project is created in Logs Essentials tier', function () {
      it('POST /internal/streams/{name}/processing/_suggestions is not authorized', async () => {
        await supertestAdminWithCookieCredentials
          .post('/internal/streams/{name}/processing/_suggestions')
          .set(svlCommonApi.getInternalRequestHeader())
          .send({
            field: 'field',
            connectorId: 'connectorId',
            samples: [],
          })
          .expect(403);
      });

      it('POST /internal/streams/{name}/processing/_suggestions/date is not authorized', async () => {
        await supertestAdminWithCookieCredentials
          .post('/internal/streams/{name}/processing/_suggestions/date')
          .set(svlCommonApi.getInternalRequestHeader())
          .send({
            dates: ['2025-06-17T00:00:00.000Z'],
          })
          .expect(403);
      });

      it('GET /api/streams/{name}/significant_events is not authorized', async () => {
        await supertestAdminWithCookieCredentials
          .get(
            '/api/streams/{name}/significant_events?from=2025-06-17T00:00:00.000Z&to=2025-06-17T00:00:00.000Z&bucketSize=1m'
          )
          .set(svlCommonApi.getInternalRequestHeader())
          .expect(403);
      });
    });
  });
}
