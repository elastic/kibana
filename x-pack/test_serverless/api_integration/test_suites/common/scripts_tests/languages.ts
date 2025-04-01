/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION } from '@kbn/data-plugin/common/constants';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

  describe('Script Languages API', function getLanguages() {
    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
          withCustomHeaders: {
            [ELASTIC_HTTP_VERSION_HEADER]: SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION,
          },
        }
      );
    });

    it('should return 200 with an array of languages', async () => {
      const response = await supertestAdminWithCookieCredentials
        .get('/internal/scripts/languages')
        .expect(200);
      expect(response.body).to.be.an('array');
    });

    it.skip('should only return langs enabled for inline scripting', async () => {
      const response = await supertestAdminWithCookieCredentials
        .get('/internal/scripts/languages')
        .expect(200);
      expect(response.body).to.contain('expression');
      expect(response.body).to.contain('painless');
      expect(response.body).to.not.contain('groovy');
    });
  });
}
