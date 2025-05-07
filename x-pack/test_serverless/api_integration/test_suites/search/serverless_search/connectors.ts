/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { SupertestWithRoleScopeType } from '../../../services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/internal/serverless_search';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

  describe('Connectors routes', function () {
    describe('GET connectors', function () {
      before(async () => {
        supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'viewer',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
      });

      it('returns list of connectors', async () => {
        const { body } = await supertestViewerWithCookieCredentials
          .get(`${API_BASE_PATH}/connectors`)
          .expect(200);

        expect(body.connectors).toBeDefined();
        expect(Array.isArray(body.connectors)).toBe(true);
      });
    });
  });
}
