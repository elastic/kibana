/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestWithAdminScope: SupertestWithRoleScopeType;

  describe('GET /api/console/api_server', () => {
    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        withCustomHeaders: { 'kbn-xsrf': 'true' },
      });
    });
    after(async () => {
      await supertestWithAdminScope.destroy();
    });
    it('returns autocomplete definitions', async () => {
      const { body } = await supertestWithAdminScope.get('/api/console/api_server').expect(200);
      expect(body.es).to.be.ok();
      const {
        es: { name, globals, endpoints },
      } = body;
      expect(name).to.be.ok();
      expect(Object.keys(globals).length).to.be.above(0);
      expect(Object.keys(endpoints).length).to.be.above(0);
    });
  });
}
